/**
 * Startup Manager Module
 *
 * Scans Windows startup entries from:
 *   - HKCU\...\Run  (per-user registry)
 *   - HKLM\...\Run  (machine-wide registry)
 *   - HKLM\...\WOW6432Node\...\Run  (32-bit on 64-bit)
 *   - User + common Startup folders
 *
 * Provides enable / disable / refresh / open-file-location.
 */

'use strict';

const { ipcMain, shell } = require('electron');
const { runPSScript } = require('./utils');
const path = require('path');

let _isElevated = false;

function init({ isElevated }) {
  _isElevated = isElevated;
}

// ── Protected publisher keywords — prevent accidental toggling of critical entries
const PROTECTED_PUBLISHERS = [
  'microsoft corporation',
  'windows defender',
  'security health',
  'antimalware',
];

function _isProtected(publisher, name) {
  const pub = (publisher || '').toLowerCase();
  const nm = (name || '').toLowerCase();
  if (PROTECTED_PUBLISHERS.some(p => pub.includes(p) || nm.includes(p))) return true;
  if (nm.includes('securityhealth') || nm.includes('windowsdefender')) return true;
  return false;
}

// ── PowerShell script to scan all startup sources + running processes ────
const SCAN_SCRIPT = `
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$ErrorActionPreference = 'SilentlyContinue'

# Helper: extract file path from a command string
function Get-ExePath($cmd) {
  if (!$cmd) { return $null }
  $cmd = $cmd.Trim()
  if ($cmd.StartsWith('"')) {
    $end = $cmd.IndexOf('"', 1)
    if ($end -gt 1) { return $cmd.Substring(1, $end - 1) }
  }
  # Take first token
  $parts = $cmd -split '\\s+'
  return $parts[0].Trim('"')
}

# Helper: get publisher from file version info
function Get-Pub($p) {
  if (!$p -or !(Test-Path $p -ErrorAction SilentlyContinue)) { return '' }
  try {
    $v = (Get-Item $p -ErrorAction Stop).VersionInfo
    if ($v.CompanyName) { return $v.CompanyName }
  } catch {}
  return ''
}

# Collect running process paths for status matching
$runningPaths = @{}
Get-Process | Where-Object { $_.Path } | ForEach-Object {
  $runningPaths[$_.Path.ToLower()] = $true
}

$items = @()

# ── Registry sources ────────────────────────────────────────────────────
$regSources = @(
  @{ Path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';                       Source = 'Registry (HKCU)';     Scope = 'User' },
  @{ Path = 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';                       Source = 'Registry (HKLM)';     Scope = 'Machine' },
  @{ Path = 'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run';          Source = 'Registry (WOW64)';    Scope = 'Machine' }
)

# Disabled entries live in these mirrored keys
$disabledSources = @(
  @{ Path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'; Scope = 'User' },
  @{ Path = 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'; Scope = 'Machine' }
)

# Build a lookup of disabled entries
$disabledLookup = @{}
foreach ($ds in $disabledSources) {
  if (Test-Path $ds.Path) {
    try {
      $props = Get-ItemProperty -Path $ds.Path -ErrorAction Stop
      foreach ($p in $props.PSObject.Properties) {
        if ($p.Name -eq 'PSPath' -or $p.Name -eq 'PSParentPath' -or $p.Name -eq 'PSChildName' -or $p.Name -eq 'PSDrive' -or $p.Name -eq 'PSProvider') { continue }
        $bytes = $p.Value
        if ($bytes -is [byte[]] -and $bytes.Length -ge 4) {
          # First 4 bytes: 02 00 00 00 = enabled, 03/06/07 = disabled
          $flag = [BitConverter]::ToUInt32($bytes, 0)
          if ($flag -ne 2) {
            $disabledLookup[$ds.Scope + '|' + $p.Name] = $true
          }
        }
      }
    } catch {}
  }
}

foreach ($rs in $regSources) {
  if (!(Test-Path $rs.Path)) { continue }
  try {
    $props = Get-ItemProperty -Path $rs.Path -ErrorAction Stop
    foreach ($p in $props.PSObject.Properties) {
      if ($p.Name -eq 'PSPath' -or $p.Name -eq 'PSParentPath' -or $p.Name -eq 'PSChildName' -or $p.Name -eq 'PSDrive' -or $p.Name -eq 'PSProvider') { continue }
      $exePath = Get-ExePath $p.Value
      $pub = Get-Pub $exePath
      $isRunning = $false
      if ($exePath) { $isRunning = $runningPaths.ContainsKey($exePath.ToLower()) }
      $isDisabled = $disabledLookup.ContainsKey($rs.Scope + '|' + $p.Name)
      $items += [PSCustomObject]@{
        name      = $p.Name
        command   = $p.Value
        path      = if ($exePath) { $exePath } else { '' }
        publisher = $pub
        source    = $rs.Source
        scope     = $rs.Scope
        isRunning = $isRunning
        isEnabled = !$isDisabled
        regPath   = $rs.Path
        type      = 'registry'
      }
    }
  } catch {}
}

# ── Startup folder sources ──────────────────────────────────────────────
$folders = @(
  @{ Path = [Environment]::GetFolderPath('Startup');  Source = 'Startup Folder (User)';   Scope = 'User' },
  @{ Path = [Environment]::GetFolderPath('CommonStartup'); Source = 'Startup Folder (All Users)'; Scope = 'Machine' }
)

foreach ($f in $folders) {
  if (!(Test-Path $f.Path)) { continue }
  Get-ChildItem -Path $f.Path -File -ErrorAction SilentlyContinue | ForEach-Object {
    $fp = $_.FullName
    $target = $fp
    $name = $_.BaseName
    if ($_.Extension -eq '.lnk') {
      try {
        $sh = New-Object -ComObject WScript.Shell
        $sc = $sh.CreateShortcut($fp)
        $target = $sc.TargetPath
      } catch { $target = $fp }
    }
    $pub = Get-Pub $target
    $isRunning = $false
    if ($target) { $isRunning = $runningPaths.ContainsKey($target.ToLower()) }

    $items += [PSCustomObject]@{
      name      = $name
      command   = $fp
      path      = $target
      publisher = $pub
      source    = $f.Source
      scope     = $f.Scope
      isRunning = $isRunning
      isEnabled = $true
      regPath   = ''
      type      = 'folder'
    }
  }
}

$items | ConvertTo-Json -Depth 3 -Compress
`;

function registerIPC() {

  // ── List all startup entries ───────────────────────────────────────────
  ipcMain.handle('startup:list', async () => {
    try {
      const raw = await runPSScript(SCAN_SCRIPT, 30000);
      if (!raw || !raw.trim()) return { success: true, items: [] };
      let items = JSON.parse(raw);
      if (!Array.isArray(items)) items = [items];

      // Annotate protected status
      items = items.map(it => ({
        ...it,
        isProtected: _isProtected(it.publisher, it.name),
      }));

      return { success: true, items };
    } catch (err) {
      console.error('[Startup] list error:', err.message);
      return { success: false, error: err.message, items: [] };
    }
  });

  // ── Toggle enable / disable ───────────────────────────────────────────
  ipcMain.handle('startup:toggle', async (_event, { name, type, scope, regPath, enable }) => {
    try {
      if (type === 'registry') {
        // Use StartupApproved\Run to enable/disable without deleting the entry
        const approvedPath = scope === 'User'
          ? 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
          : 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run';

        const safeName = name.replace(/'/g, "''");
        const script = enable
          ? `
$p = '${approvedPath}'
if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
$bytes = [byte[]]@(2,0,0,0,0,0,0,0,0,0,0,0)
Set-ItemProperty -Path $p -Name '${safeName}' -Value $bytes -Type Binary -Force
Write-Output 'ok'
`
          : `
$p = '${approvedPath}'
if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
$bytes = [byte[]]@(3,0,0,0,0,0,0,0,0,0,0,0)
Set-ItemProperty -Path $p -Name '${safeName}' -Value $bytes -Type Binary -Force
Write-Output 'ok'
`;
        const result = await runPSScript(script, 10000);
        if (result && result.trim() === 'ok') {
          return { success: true };
        }
        return { success: false, error: 'Toggle command did not confirm success.' };
      }

      if (type === 'folder') {
        // For folder shortcuts: rename to .disabled / rename back
        const safePath = regPath || '';
        const safeCommand = (safePath || '').replace(/'/g, "''");
        // regPath isn't used for folder items, use the command (file path)
        const script = enable
          ? `
$disabled = '${safeCommand}.disabled'
if (Test-Path $disabled) { Rename-Item -Path $disabled -NewName (Split-Path $disabled -Leaf).Replace('.disabled','') -Force }
Write-Output 'ok'
`
          : `
$target = '${safeCommand}'
if (Test-Path $target) { Rename-Item -Path $target -NewName ((Split-Path $target -Leaf) + '.disabled') -Force }
Write-Output 'ok'
`;
        const result = await runPSScript(script, 10000);
        if (result && result.trim() === 'ok') {
          return { success: true };
        }
        return { success: false, error: 'Folder toggle did not confirm success.' };
      }

      return { success: false, error: 'Unknown startup entry type.' };
    } catch (err) {
      console.error('[Startup] toggle error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ── Open file location ────────────────────────────────────────────────
  ipcMain.handle('startup:open-location', async (_event, filePath) => {
    try {
      if (!filePath) return { success: false, error: 'No path provided.' };
      const resolved = path.resolve(filePath);
      shell.showItemInFolder(resolved);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { init, registerIPC };
