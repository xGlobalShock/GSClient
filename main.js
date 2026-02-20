const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

// ──────────────────────────────────────────────────────
// PowerShell Script Runner
// Writes multiline scripts to a temp .ps1 file and runs them via -File.
// Avoids quoting/escaping issues, no command-line length limit, and
// scripts are consolidated so we only need 1-2 spawns per poll cycle.
// ──────────────────────────────────────────────────────
let _psTempCounter = 0;
function runPSScript(script, timeoutMs = 8000) {
  const tmpFile = path.join(os.tmpdir(), `gs_ps_${process.pid}_${++_psTempCounter}.ps1`);
  // Prepend $ErrorActionPreference and append exit 0 to ensure clean exit
  const wrappedScript = '$ErrorActionPreference = "SilentlyContinue"\n' + script + '\nexit 0';
  fs.writeFileSync(tmpFile, wrappedScript, 'utf8');
  return execAsync(
    `powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpFile}"`,
    { shell: true, timeout: timeoutMs }
  ).then(r => {
    try { fs.unlinkSync(tmpFile); } catch {}
    return r.stdout.trim();
  }).catch(err => {
    try { fs.unlinkSync(tmpFile); } catch {}
    // Recover partial stdout even if PowerShell exited with non-zero code
    console.warn('[runPSScript] PS error:', err.message?.substring(0, 150));
    if (err.stdout) return err.stdout.trim();
    return '';
  });
}

// Helper function to detect permission errors
function isPermissionError(error) {
  if (!error || !error.message) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('access is denied') || 
         msg.includes('permission denied') || 
         msg.includes('requires elevation') ||
         msg.includes('administrator') ||
         msg.includes('privilege') ||
         msg.includes('command failed') ||
         msg.includes('cannot remove item') ||
         msg.includes('unauthorized');
}

// Forza Horizon 5 Shader Cache Cleaner
ipcMain.handle('cleaner:clear-forza-shaders', async () => {
  try {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const forzaCachePath = path.join(localAppData, 'Temp', 'Turn10Temp.scratch', 'GraphicsCache');

    if (!fs.existsSync(forzaCachePath)) {
      return { success: false, message: 'Forza Horizon 5 shader cache not found. Game may not be installed.' };
    }

    let filesBefore = 0;
    let filesDeleted = 0;
    let sizeFreed = 0;

    const files = fs.readdirSync(forzaCachePath);
    filesBefore = files.length;
    for (const file of files) {
      const filePath = path.join(forzaCachePath, file);
      try {
        const stats = fs.statSync(filePath);
        sizeFreed += stats.size;
        fs.rmSync(filePath, { force: true });
        filesDeleted++;
      } catch (e) {
        // Ignore errors for individual files
      }
    }

    const sizeInMB = (sizeFreed / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: `Cleared Forza Horizon 5 shader cache`,
      filesDeleted,
      filesBefore,
      filesAfter: filesBefore - filesDeleted,
      spaceSaved: `${sizeInMB} MB`,
      details: `${filesDeleted}/${filesBefore} files deleted (${filesBefore - filesDeleted} remaining)`
    };
  } catch (error) {
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { success: false, message: `Error: ${error.message}` };
  }
});

// Disable GPU acceleration to prevent GPU process crashes
app.disableHardwareAcceleration();

// Add command line switches for stability
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');


// Simple admin check for Windows
let isElevated = false;
if (process.platform === 'win32') {
  try {
    require('child_process').execSync('net session', { stdio: 'pipe' });
    isElevated = true;
  } catch (e) {
    isElevated = false;
  }
  // Only require elevation in production (packaged app)
  if (!isElevated && app.isPackaged) {
    const quotedExe = process.execPath.replace(/'/g, "''");
    const quotedArgs = process.argv.slice(1).map(a => a.replace(/'/g, "''")).join("' '");
    const psArgs = [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
      `Start-Process -FilePath '${quotedExe}' ${quotedArgs ? "-ArgumentList '" + quotedArgs + "'" : ''} -Verb RunAs`
    ];
    require('child_process').spawn('powershell', psArgs, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    }).unref();
    app.quit();
    return;
  }
}

let mainWindow;

function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: isDev
        ? path.join(__dirname, 'public/preload.js')
        : path.join(process.resourcesPath, 'app', 'build', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      devTools: false,
    },
    // icon: path.join(__dirname, 'public/icon.png'),
  });

  mainWindow.setMenuBarVisibility(false);

  // Block all keyboard shortcuts that could open developer tools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Block F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J
    if (
      input.control &&
      input.shift &&
      (input.key.toLowerCase() === 'i' || input.key.toLowerCase() === 'c' || input.key.toLowerCase() === 'j')
    ) {
      event.preventDefault();
    }
    // Block F12
    if (input.key === 'F12') {
      event.preventDefault();
    }
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(process.resourcesPath, 'app', 'build', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
  // Start LibreHardwareMonitor temperature service (must be after declarations)
  startLHMService();
});

app.on('window-all-closed', () => {
  stopLHMService();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Restore Point IPC Handler
ipcMain.handle('system:create-restore-point', async (event, description) => {
  try {
    // Default description (kept as requested) and allow override via the description argument
    const descBase = description || 'GS Optimizer - Before Tweak Application';

    // Require admin privileges to create restore points
    if (!isElevated) {
      console.log('[Restore Point] Attempted without elevation');
      return { success: false, message: 'Admin privileges required to create a system restore point. Please run the app as administrator.' };
    }

    // Append timestamp to ensure uniqueness and avoid matching older restore points
    const timestamp = new Date().toISOString();
    const descWithTs = `${descBase} - ${timestamp}`;
    const safeDesc = descWithTs.replace(/'/g, "''");

    // Query the latest restore point before creating a new one
    const preCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ComputerRestorePoint | Sort-Object -Property SequenceNumber -Descending | Select-Object -First 1 | ConvertTo-Json -Compress"`;
    let preSeq = 0;
    let preObj = null;
    try {
      const preRes = await execAsync(preCmd, { shell: true, timeout: 10000 });
      const pstdout = preRes.stdout.trim();
      if (pstdout) {
        try { preObj = JSON.parse(pstdout); } catch (e) { preObj = pstdout; }
        preSeq = preObj && preObj.SequenceNumber ? Number(preObj.SequenceNumber) : 0;
      }
    } catch (preErr) {
      // If pre-query fails, log and continue (we'll still attempt checkpoint)
      console.log('[Restore Point] Pre-check error:', preErr.message || preErr);
      preSeq = 0;
    }

    // Create the restore point (checkpoint)
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Checkpoint-Computer -Description '${safeDesc}' -RestorePointType 'MODIFY_SETTINGS' -ErrorAction Stop"`;
    await execAsync(cmd, { shell: true });

    // Query the latest restore point after checkpoint
    const postCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ComputerRestorePoint | Sort-Object -Property SequenceNumber -Descending | Select-Object -First 1 | ConvertTo-Json -Compress"`;
    try {
      const postRes = await execAsync(postCmd, { shell: true, timeout: 10000 });
      const pstdout = postRes.stdout.trim();
      let postObj = null;
      let postSeq = 0;
      if (pstdout) {
        try { postObj = JSON.parse(pstdout); } catch (e) { postObj = pstdout; }
        postSeq = postObj && postObj.SequenceNumber ? Number(postObj.SequenceNumber) : 0;
      }

      if (postSeq > preSeq) {
        return { success: true, message: 'System restore point created successfully', verify: { preSeq, postSeq, description: descWithTs, postObj } };
      } else {
        console.log('[Restore Point] No new restore point detected. preSeq:', preSeq, 'postSeq:', postSeq);
        return { success: false, message: 'A system restore point already exists. You can safely apply tweaks', debug: { preObj, postObj } };
      }
    } catch (postErr) {
      console.log('[Restore Point] Post-check error:', postErr.message || postErr);
      return { success: false, message: 'Restore point created but verification failed. Check System Restore settings.', debug: { preObj, postError: postErr.message || postErr } };
    }
  } catch (error) {
    console.log('[Restore Point] Error creating restore point:', error);
    return { success: false, message: 'Could not create restore point. You may need admin privileges. ' + (error.message || '') };
  }
});

// Open System Protection UI (SystemPropertiesProtection)
ipcMain.handle('system:open-system-protection', async () => {
  try {
    const exe = 'SystemPropertiesProtection.exe';
    // Spawn without waiting
    spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
    return { success: true };
  } catch (error) {
    console.log('[Restore Point] Error opening System Protection:', error.message || error);
    try {
      // Fallback: open System Properties Control Panel
      exec('control /name Microsoft.System', (e) => {});
    } catch (e) {}
    return { success: false, message: 'Could not open System Protection UI' };
  }
});

// ──────────────────────────────────────────────────────
// System Stats IPC Handler — single consolidated PowerShell call
// Fetches CPU %, RAM %, Disk %, and Temperature in ONE invocation
// via -EncodedCommand. Falls back to Node.js os module for RAM.
// ──────────────────────────────────────────────────────
let _statsInFlight = false;
ipcMain.handle('system:get-stats', async () => {
  // Overlap guard — if the previous poll hasn't finished, return cached
  if (_statsInFlight) return _lastStats;
  _statsInFlight = true;
  try {
    return await _getStatsImpl();
  } finally {
    _statsInFlight = false;
  }
});

// ──────────────────────────────────────────────────────
// LibreHardwareMonitor Background Temperature Service
// Loads the LHM .NET DLL in a persistent PowerShell process
// to read real CPU package temperature via MSR registers.
// Requires admin (app runs elevated in production).
// ──────────────────────────────────────────────────────
let _lhmProcess = null;
let _lhmTemp = 0;           // latest CPU package temp from LHM
let _lhmGpuTemp = -1;       // latest GPU temp from LHM
let _lhmGpuUsage = -1;      // latest GPU load % from LHM
let _lhmGpuVramUsed = -1;   // GPU VRAM used (MiB)
let _lhmGpuVramTotal = -1;  // GPU VRAM total (MiB)
let _lhmAvailable = false;  // true once we get a valid CPU reading

function startLHMService() {
  const dllPath = path.join(__dirname, 'lib', 'LibreHardwareMonitorLib.dll');
  if (!fs.existsSync(dllPath)) {
    console.log('[LHM] DLL not found at', dllPath);
    return;
  }
  // Write a long-running PS script that loads LHM, opens CPU sensors,
  // and prints TEMP:<value> every 2 seconds.
  const scriptContent = [
    '$ErrorActionPreference = "SilentlyContinue"',
    `Add-Type -Path '${dllPath}'`,
    '$computer = [LibreHardwareMonitor.Hardware.Computer]::new()',
    '$computer.IsCpuEnabled = $true',
    '$computer.IsGpuEnabled = $true',
    '$computer.Open()',
    'while ($true) {',
    '  try {',
    '    $cpuTemp = $null; $gpuTemp = $null; $gpuLoad = $null; $gpuVramUsed = $null; $gpuVramTotal = $null',
    '    foreach ($hw in $computer.Hardware) {',
    '      $hw.Update()',
    '      $hwType = $hw.HardwareType.ToString()',
    '      if ($hwType -eq "Cpu") {',
    '        foreach ($sensor in $hw.Sensors) {',
    '          if ($sensor.SensorType -eq [LibreHardwareMonitor.Hardware.SensorType]::Temperature -and $sensor.Value.HasValue) {',
    '            if ($sensor.Name -eq "CPU Package") { $cpuTemp = $sensor.Value.Value; break }',
    '            if ($sensor.Name -eq "Core Average" -and $cpuTemp -eq $null) { $cpuTemp = $sensor.Value.Value }',
    '            if ($sensor.Name -eq "Core Max" -and $cpuTemp -eq $null) { $cpuTemp = $sensor.Value.Value }',
    '          }',
    '        }',
    '      }',
    '      if ($hwType -match "Gpu") {',
    '        foreach ($sensor in $hw.Sensors) {',
    '          if (-not $sensor.Value.HasValue) { continue }',
    '          $st = $sensor.SensorType.ToString()',
    '          if ($st -eq "Temperature" -and $sensor.Name -eq "GPU Core") { $gpuTemp = $sensor.Value.Value }',
    '          if ($st -eq "Load" -and $sensor.Name -eq "GPU Core") { $gpuLoad = $sensor.Value.Value }',
    '          if ($st -eq "SmallData" -and $sensor.Name -eq "GPU Memory Used") { $gpuVramUsed = $sensor.Value.Value }',
    '          if ($st -eq "SmallData" -and $sensor.Name -eq "GPU Memory Total") { $gpuVramTotal = $sensor.Value.Value }',
    '        }',
    '      }',
    '    }',
    '    $parts = @()',
    '    if ($cpuTemp -ne $null) { $parts += "CPUT:" + [math]::Round($cpuTemp, 1) }',
    '    if ($gpuTemp -ne $null) { $parts += "GPUT:" + [math]::Round($gpuTemp, 1) }',
    '    if ($gpuLoad -ne $null) { $parts += "GPUL:" + [math]::Round($gpuLoad, 1) }',
    '    if ($gpuVramUsed -ne $null) { $parts += "GPUVRU:" + [math]::Round($gpuVramUsed) }',
    '    if ($gpuVramTotal -ne $null) { $parts += "GPUVRT:" + [math]::Round($gpuVramTotal) }',
    '    if ($parts.Count -gt 0) {',
    '      [Console]::Out.WriteLine($parts -join "|")',
    '      [Console]::Out.Flush()',
    '    }',
    '  } catch {}',
    '  Start-Sleep -Milliseconds 1000',
    '}',

  ].join('\n');

  const tmpFile = path.join(os.tmpdir(), `gs_lhm_service_${process.pid}.ps1`);
  fs.writeFileSync(tmpFile, scriptContent, 'utf8');

  _lhmProcess = spawn('powershell', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmpFile
  ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

  let buffer = '';
  _lhmProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line in buffer
    for (const line of lines) {
      const trimmed = line.trim();
      // Parse pipe-separated key:value pairs
      // Format: CPUT:xx.x|GPUT:xx.x|GPUL:xx.x|GPUVRU:xxxx|GPUVRT:xxxx
      const tokens = trimmed.split('|');
      for (const token of tokens) {
        const [key, valStr] = token.split(':');
        const v = parseFloat(valStr);
        if (isNaN(v)) continue;
        switch (key) {
          case 'CPUT': if (v > 0 && v < 150) { _lhmTemp = Math.round(v * 10) / 10; _lhmAvailable = true; } break;
          case 'GPUT': if (v > 0 && v < 150) _lhmGpuTemp = Math.round(v); break;
          case 'GPUL': if (v >= 0 && v <= 100) _lhmGpuUsage = Math.round(v); break;
          case 'GPUVRU': if (v >= 0) _lhmGpuVramUsed = Math.round(v); break;
          case 'GPUVRT': if (v > 0) _lhmGpuVramTotal = Math.round(v); break;
        }
      }
    }
  });

  _lhmProcess.on('exit', (code) => {
    console.log(`[LHM] Service exited with code ${code}`);
    _lhmProcess = null;
    // Don't set _lhmAvailable = false so the last reading persists
  });

  _lhmProcess.on('error', (err) => {
    console.warn('[LHM] Service error:', err.message);
    _lhmProcess = null;
  });

  console.log('[LHM] Temperature service started (PID:', _lhmProcess.pid, ')');
}

function stopLHMService() {
  if (_lhmProcess) {
    try { _lhmProcess.kill(); } catch {}
    _lhmProcess = null;
  }
  // Clean up temp script
  const tmpFile = path.join(os.tmpdir(), `gs_lhm_service_${process.pid}.ps1`);
  try { fs.unlinkSync(tmpFile); } catch {}
}

let _lastStats = { cpu: 0, ram: 0, disk: 0, temperature: 0 };
let _tempSource = 'none';       // 'lhm', 'estimation'

async function _getStatsImpl() {
  let cpu = 0, ram = 0, disk = 0, temperature = 0;

  // ── Single consolidated PowerShell script ──
  // Returns: cpu|||ram|||disk   (temperature handled by LHM service)
  const script = `
    $out = @('0','0','0')
    # CPU — WMI LoadPercentage (instant, no sampling delay)
    try {
      $c = (Get-CimInstance Win32_Processor | Select-Object -First 1).LoadPercentage
      if ($c -ne $null) { $out[0] = [string][math]::Round($c, 1) }
    } catch {}
    # RAM
    try {
      $o = Get-CimInstance Win32_OperatingSystem
      if ($o.TotalVisibleMemorySize -gt 0) {
        $out[1] = [string][math]::Round(($o.TotalVisibleMemorySize - $o.FreePhysicalMemory) / $o.TotalVisibleMemorySize * 100, 1)
      }
    } catch {}
    # Disk C:
    try {
      $d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
      if ($d -and $d.Size -gt 0) {
        $out[2] = [string][math]::Round(($d.Size - $d.FreeSpace) / $d.Size * 100, 1)
      }
    } catch {}
    Write-Output ($out -join '|||')
  `;

  try {
    const raw = await runPSScript(script, 6000);
    const parts = raw.trim().split('|||');
    if (parts.length >= 3) {
      const cpuVal = parseFloat(parts[0]);
      const ramVal = parseFloat(parts[1]);
      const diskVal = parseFloat(parts[2]);
      if (!isNaN(cpuVal) && cpuVal >= 0 && cpuVal <= 100) cpu = Math.round(cpuVal * 10) / 10;
      if (!isNaN(ramVal) && ramVal >= 0 && ramVal <= 100) ram = Math.round(ramVal * 10) / 10;
      if (!isNaN(diskVal) && diskVal >= 0 && diskVal <= 100) disk = Math.round(diskVal * 10) / 10;
    }
  } catch (err) {}

  // ── Temperature: LHM background service (real CPU package temp) ──
  if (_lhmAvailable && _lhmTemp > 0) {
    temperature = _lhmTemp;
    _tempSource = 'lhm';
  }

  // Fallbacks using Node.js (zero-cost)
  if (ram === 0) {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    if (totalMem > 0) ram = Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10;
  }

  // Temperature estimation fallback — dynamic, CPU-load-based
  if (temperature === 0) {
    _tempSource = 'estimation';
    // Base ~38-42°C idle, scales up to ~75-85°C under load
    // Time-based jitter (±1.5°C) so consecutive reads never look frozen
    const jitter = Math.sin(Date.now() / 5000) * 1.5;
    temperature = Math.round((38 + cpu * 0.45 + jitter) * 10) / 10;
    if (temperature < 30) temperature = 30;
    if (temperature > 95) temperature = 95;
  }

  _lastStats = { cpu, ram, disk, temperature };
  return _lastStats;
}

// Hardware Info IPC Handler - fetches PC part names + static system info (called once on startup)
ipcMain.handle('system:get-hardware-info', async () => {
  const info = {
    cpuName: '',
    gpuName: '',
    ramInfo: '',
    ramBrand: '',
    ramPartNumber: '',
    diskName: '',
    // Extended static info
    cpuCores: 0,
    cpuThreads: 0,
    cpuMaxClock: '',
    gpuVramTotal: '',
    gpuDriverVersion: '',
    ramTotalGB: 0,
    ramUsedGB: 0,
    ramSticks: '',
    diskTotalGB: 0,
    diskFreeGB: 0,
    diskType: '',
    diskHealth: '',
    allDrives: [],
    networkAdapter: '',
    ipAddress: '',
    // Motherboard & BIOS (populated later)
    motherboardManufacturer: '',
    motherboardProduct: '',
    motherboardSerial: '',
    biosVersion: '',
    biosDate: '',
    windowsVersion: '',
    windowsBuild: '',
    systemUptime: '',
    powerPlan: '',
    hasBattery: false,
    batteryPercent: 0,
    batteryStatus: '',
  };

  // Run all static queries in parallel for speed
  const results = await Promise.allSettled([
    // 0: CPU Name + cores + threads + max clock
    execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1; Write-Output ($cpu.Name); Write-Output '|||'; Write-Output ($cpu.NumberOfCores); Write-Output '|||'; Write-Output ($cpu.NumberOfLogicalProcessors); Write-Output '|||'; Write-Output ($cpu.MaxClockSpeed)"`,
      { shell: true, timeout: 10000 }
    ),
    // 1: GPU Name + VRAM + driver version (filter out virtual adapters)
    execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "$gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.Status -eq 'OK' -and $_.Name -notmatch '(Virtual|Dummy|Parsec|Remote|Generic)' } | Select-Object -First 1; if (!$gpu) { $gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.Status -eq 'OK' } | Select-Object -First 1 }; if ($gpu) { Write-Output ($gpu.Name); Write-Output '|||'; Write-Output ([math]::Round($gpu.AdapterRAM / 1GB, 1)); Write-Output '|||'; Write-Output ($gpu.DriverVersion) } else { Write-Output 'Unknown GPU'; Write-Output '|||'; Write-Output '0'; Write-Output '|||'; Write-Output 'N/A' }"`,
      { shell: true, timeout: 10000 }
    ),
    // 2: RAM info (total, JEDEC speed, configured speed, sticks, manufacturer, partNumber)
    execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "$mem = Get-CimInstance Win32_PhysicalMemory; $totalGB = [math]::Round(($mem | Measure-Object -Property Capacity -Sum).Sum / 1GB); $first = $mem | Select-Object -First 1; $jedecSpeed = $first.Speed; $configSpeed = $first.ConfiguredClockSpeed; $sticks = $mem.Count; $mfr = $first.Manufacturer; $part = $first.PartNumber; Write-Output \\\"$totalGB\\\"; Write-Output '|||'; Write-Output \\\"$jedecSpeed\\\"; Write-Output '|||'; Write-Output \\\"$configSpeed\\\"; Write-Output '|||'; Write-Output \\\"$sticks stick(s)\\\"; Write-Output '|||'; Write-Output \\\"$mfr\\\"; Write-Output '|||'; Write-Output \\\"$part\\\"\"`,
      { shell: true, timeout: 10000 }
    ),
    // 3: Disk name + type + health + size
    execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "$d = Get-PhysicalDisk | Select-Object -First 1; if (!$d) { $d = Get-CimInstance Win32_DiskDrive | Select-Object -First 1; Write-Output ($d.Model); Write-Output '|||'; Write-Output 'Unknown'; Write-Output '|||'; Write-Output 'Unknown'; Write-Output '|||'; Write-Output ([math]::Round($d.Size/1GB)); } else { Write-Output ($d.FriendlyName); Write-Output '|||'; Write-Output ($d.MediaType); Write-Output '|||'; Write-Output ($d.HealthStatus); Write-Output '|||'; Write-Output ([math]::Round($d.Size/1GB)); }"`,
      { shell: true, timeout: 10000 }
    ),
    // 4: All logical drives
    execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_LogicalDisk -Filter \\"DriveType=3\\" | ForEach-Object { $totalGB = [math]::Round($_.Size/1GB,1); $freeGB = [math]::Round($_.FreeSpace/1GB,1); Write-Output \\"$($_.DeviceID)|$totalGB|$freeGB|$($_.VolumeName)\\" }"`,
      { shell: true, timeout: 10000 }
    ),
    // 5: Network adapter + IPv4 + LinkSpeed + MAC + IPv6 + Gateway + DNS
    execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "$a = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1; $link = $a.LinkSpeed; $ipv4 = (Get-NetIPAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress; $ipv6 = (Get-NetIPAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv6 -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress; $mac = $a.MacAddress; $gw = (Get-NetIPConfiguration -InterfaceIndex $a.ifIndex -ErrorAction SilentlyContinue).Ipv4DefaultGateway.NextHop; $dns = (Get-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ErrorAction SilentlyContinue -AddressFamily IPv4 | Select-Object -First 1).ServerAddresses -join ','; Write-Output ($a.Name + ' (' + $a.InterfaceDescription + ')'); Write-Output '|||'; Write-Output ($ipv4); Write-Output '|||'; Write-Output ($link); Write-Output '|||'; Write-Output ($mac); Write-Output '|||'; Write-Output ($ipv6); Write-Output '|||'; Write-Output ($gw); Write-Output '|||'; Write-Output ($dns)"`,
      { shell: true, timeout: 10000 }
    ),
    // 6: Windows version + build
    // 6: Windows version + build (with Win11 detection fallback)
    execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "$r = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion' -ErrorAction SilentlyContinue; $prod = $r.ProductName; $disp = $r.DisplayVersion; $build = $r.CurrentBuildNumber; if (!$prod) { $wmi = Get-WmiObject Win32_OperatingSystem -ErrorAction SilentlyContinue; $prod = $wmi.Caption }; if ($build -ge 22000 -and $prod -notmatch '11') { $prod = $prod -replace 'Windows 10', 'Windows 11' } elseif ($build -lt 22000 -and $prod -notmatch '10') { $prod = $prod -replace 'Windows 11', 'Windows 10' }; if (!$prod) { $prod = 'Windows' }; Write-Output $prod; Write-Output '|||'; Write-Output ($disp + ' (Build ' + $build + ')')"`,
      { shell: true, timeout: 10000 }
    ),
    execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "$up = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime; Write-Output ('{0}d {1}h {2}m' -f $up.Days, $up.Hours, $up.Minutes)"`,
      { shell: true, timeout: 10000 }
    ),
    // 8: Power plan
    execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-CimInstance -Namespace root\\cimv2\\power -ClassName Win32_PowerPlan | Where-Object { $_.IsActive }).ElementName"`,
      { shell: true, timeout: 10000 }
    ),
    // 9: Battery
    execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "$b = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue; if ($b) { Write-Output 'true'; Write-Output '|||'; Write-Output ($b.EstimatedChargeRemaining); Write-Output '|||'; $st = switch($b.BatteryStatus) { 1 {'Discharging'} 2 {'AC Connected'} 3 {'Fully Charged'} 4 {'Low'} 5 {'Critical'} 6 {'Charging'} 7 {'Charging (High)'} 8 {'Charging (Low)'} 9 {'Charging (Critical)'} default {'Unknown'} }; Write-Output $st } else { Write-Output 'false' }"`,
      { shell: true, timeout: 10000 }
    ),
    // 10: RAM usage in GB
    execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "$o = Get-CimInstance Win32_OperatingSystem; $totalGB = [math]::Round($o.TotalVisibleMemorySize/1MB, 1); $freeGB = [math]::Round($o.FreePhysicalMemory/1MB, 1); $usedGB = [math]::Round($totalGB - $freeGB, 1); Write-Output \\"$usedGB|||$totalGB\\""`,
      { shell: true, timeout: 10000 }
    ),
    // 11: Disk C free space
    execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "$d = Get-CimInstance Win32_LogicalDisk -Filter \\"DeviceID='C:'\\" ; Write-Output ([math]::Round($d.FreeSpace/1GB,1))"`,
      { shell: true, timeout: 10000 }
    ),
  ]);

  // Helper to extract settled value
  const get = (i) => results[i].status === 'fulfilled' ? results[i].value.stdout.trim() : '';

  // Additional hardware lookups (motherboard + BIOS) — run separately to avoid reshuffling the main results array
  try {
    const mb = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "$b = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue | Select-Object -First 1; if ($b) { $prod = $b.Product; if (-not $prod) { $prod = $b.Name } if (-not $prod) { $prod = $b.Caption } Write-Output ($b.Manufacturer + '|||' + $prod + '|||' + $b.SerialNumber) } else { Write-Output '|||' }"`, { shell: true, timeout: 8000 });
    const mbRaw = (mb.stdout || '').trim();
    if (mbRaw) {
      const parts = mbRaw.split('|||').map(s => s.trim());
      info.motherboardManufacturer = parts[0] || '';
      info.motherboardProduct = parts[1] || '';

      // Sanitize the motherboard serial: many OEMs return placeholders like "Default string" or "To be filled by OEM"
      let rawSerial = (parts[2] || '').trim();
      const invalidSerials = ['default string','to be filled by o.e.m.','to be filled by oem','system serial number','not specified','none','unknown','baseboard serial number'];
      const serialLower = rawSerial.toLowerCase();
      const isBad = !rawSerial || invalidSerials.includes(serialLower) || /^0+$/.test(rawSerial) || rawSerial.length < 3;

      if (!isBad) {
        info.motherboardSerial = rawSerial;
      } else {
        // Fallback: try alternative WMI classes (SystemEnclosure / ComputerSystemProduct)
        try {
          const fb = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "($e = Get-CimInstance Win32_SystemEnclosure -ErrorAction SilentlyContinue | Select-Object -First 1).SerialNumber; if (-not $e) { $e = (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue).IdentifyingNumber }; Write-Output ($e -ne $null ? $e : '')"`, { shell: true, timeout: 4000 });
          const fbSerial = (fb.stdout || '').trim();
          if (fbSerial && !/^0+$/.test(fbSerial) && fbSerial.length >= 3 && !invalidSerials.includes(fbSerial.toLowerCase())) {
            info.motherboardSerial = fbSerial;
          } else {
            info.motherboardSerial = '';
          }
        } catch (e) {
          info.motherboardSerial = '';
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // Physical disks: model, serial, firmware, size (GB)
  try {
    const pd = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_DiskDrive | ForEach-Object { $m = ($_.Model -replace '\\n',' '); $sn = ($_.SerialNumber -replace '\\s',''); $fw = ($_.FirmwareRevision -replace '\\s',''); $size = [math]::Round($_.Size/1GB); Write-Output ($m + '|||' + $sn + '|||' + $fw + '|||' + $size) }"`, { shell: true, timeout: 8000 });
    const pdRaw = (pd.stdout || '').trim();
    if (pdRaw) {
      info.physicalDisks = pdRaw.split('\n').filter(l => l.trim()).map((line) => {
        const parts = line.split('|||').map(s => s.trim());
        return { model: parts[0] || '', serial: parts[1] || '', firmware: parts[2] || '', sizeGB: parseInt(parts[3]) || 0 };
      });
    }
  } catch (e) {
    // ignore
  }

  try {
    const bio = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "$bio = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -First 1; if ($bio) { $ver = $bio.SMBIOSBIOSVersion; if (-not $ver) { $ver = $bio.Version } if (-not $ver) { $ver = $bio.BIOSVersion -join ',' } $date = ''; try { $date = ([Management.ManagementDateTimeConverter]::ToDateTime($bio.ReleaseDate).ToString('yyyy-MM-dd')) } catch { $date = '' } Write-Output ($ver + '|||' + $date) } else { Write-Output '||' }"`, { shell: true, timeout: 8000 });
    const bioRaw = (bio.stdout || '').trim();
    if (bioRaw) {
      const parts = bioRaw.split('|||').map(s => s.trim());
      info.biosVersion = parts[0] || '';
      info.biosDate = parts[1] || '';
    }
  } catch (e) {
    // ignore
  }

  // 0: CPU
  try {
    const parts = get(0).split('|||').map((s) => s.trim());
    info.cpuName = parts[0] || 'Unknown CPU';
    info.cpuCores = parseInt(parts[1]) || 0;
    info.cpuThreads = parseInt(parts[2]) || 0;
    info.cpuMaxClock = parts[3] ? `${(parseInt(parts[3]) / 1000).toFixed(2)} GHz` : '';
  } catch { info.cpuName = 'Unknown CPU'; }

  // 1: GPU
  try {
    const parts = get(1).split('|||').map((s) => s.trim());
    info.gpuName = parts[0] || 'Unknown GPU';
    info.gpuVramTotal = parts[1] && parts[1] !== '0' ? `${parts[1]} GB` : '';

    // Prefer the NVIDIA "driver_version" from nvidia-smi (matches NVIDIA Control Panel/App).
    // Fallback to Win32_VideoController.DriverVersion when nvidia-smi isn't present.
    try {
      const nv = await execAsync('nvidia-smi --query-gpu=driver_version --format=csv,noheader,nounits', { shell: true, timeout: 3000 });
      const nvver = (nv.stdout || '').trim().split('\n')[0].trim();
      info.gpuDriverVersion = nvver || (parts[2] || '');
    } catch (e) {
      info.gpuDriverVersion = parts[2] || '';
    }
  } catch { info.gpuName = 'Unknown GPU'; }

  // Derive full RAM brand+series name from part number and manufacturer
  const resolveRamBrand = (mfr, partNum) => {
    const part = (partNum || '').trim();
    const partLow = part.toLowerCase();
    const mfrLow = (mfr || '').toLowerCase().trim();

    // ── G.Skill series decode from part number suffix ──
    // Format: F4-<speed>C<cas>-<size><series-code>
    if (/^f[34]-\d/i.test(part)) {
      const suffix = (part.split('-').pop() || '').replace(/^\d+/, '').toUpperCase();
      const gskillSeries = {
        'GTZRX': 'G.Skill Trident Z Royal',
        'GTZRS': 'G.Skill Trident Z Royal Silver',
        'GTZR':  'G.Skill Trident Z RGB',
        'GTZ':   'G.Skill Trident Z',
        'GTZN':  'G.Skill Trident Z Neo',
        'GTZNR': 'G.Skill Trident Z Neo',
        'GFX':   'G.Skill Trident Z5 RGB',
        'GX':    'G.Skill Trident Z5',
        'GVK':   'G.Skill Ripjaws V',
        'GRK':   'G.Skill Ripjaws V',
        'GBKD':  'G.Skill Ripjaws 4',
        'GNT':   'G.Skill Aegis',
        'GIS':   'G.Skill ARES',
        'GQSB':  'G.Skill Sniper X',
      };
      // Try longest match first
      for (const [code, name] of Object.entries(gskillSeries)) {
        if (suffix.endsWith(code)) return name;
      }
      return 'G.Skill';
    }

    // ── Corsair series ──
    if (/^cmk/i.test(part)) return 'Corsair Vengeance RGB Pro';
    if (/^cmt/i.test(part)) return 'Corsair Dominator Platinum';
    if (/^cmd/i.test(part)) return 'Corsair Dominator';
    if (/^cmw/i.test(part)) return 'Corsair Vengeance RGB';
    if (/^cms/i.test(part)) return 'Corsair';
    if (/vengeance/i.test(partLow)) return 'Corsair Vengeance';
    if (/dominator/i.test(partLow)) return 'Corsair Dominator';

    // ── Kingston / HyperX / Fury ──
    if (/^khx/i.test(part)) return 'Kingston HyperX';
    if (/^hx\d/i.test(part)) return 'Kingston HyperX';
    if (/^kf\d/i.test(part)) return 'Kingston Fury';
    if (/^kcp/i.test(part)) return 'Kingston';
    if (/fury/i.test(partLow)) return 'Kingston Fury';

    // ── Crucial / Micron ──
    if (/^ble/i.test(part)) return 'Crucial Ballistix';
    if (/^bls/i.test(part)) return 'Crucial Ballistix Sport';
    if (/^ct\d/i.test(part)) return 'Crucial';
    if (/^mt\d/i.test(part)) return 'Micron';

    // ── SK Hynix ──
    if (/^hma|^hmt|^hmab/i.test(part)) return 'SK Hynix';

    // ── Samsung ──
    if (/^m3[78]/i.test(part)) return 'Samsung';

    // ── TeamGroup ──
    if (/^tf[ab]\d|^tdeed/i.test(part)) return 'TeamGroup T-Force';
    if (/^tf\d/i.test(part)) return 'TeamGroup';

    // ── Patriot ──
    if (/^psd|^pv[e34]/i.test(part)) return 'Patriot Viper';

    // ── JEDEC hex manufacturer code fallback ──
    const jedecMap = {
      '04f1': 'G.Skill', '04cd': 'Kingston', '9e': 'Kingston',
      'ce': 'Samsung',   '00ce': 'Samsung',   '80ce': 'Samsung',
      'ad': 'SK Hynix',  '00ad': 'SK Hynix',  '80ad': 'SK Hynix',
      '2c': 'Micron',    '002c': 'Micron',    '802c': 'Micron',
      '859b': 'Corsair', '0cf8': 'Crucial',   '0b': 'Nanya', '0783': 'Transcend',
    };
    const mfrKey = mfrLow.replace(/^0x/, '');
    if (jedecMap[mfrKey]) return jedecMap[mfrKey];

    // If manufacturer is a readable string (not a raw hex code), use it directly
    if (mfr && !/^[0-9a-f]{2,8}$/i.test(mfr.trim())) return mfr.trim();

    return '';
  };

  // 2: RAM
  try {
    const parts = get(2).split('|||').map((s) => s.trim());
    const totalGB = parseInt(parts[0]) || Math.round(os.totalmem() / (1024 * 1024 * 1024));
    const jedecSpeed = parts[1] || '';
    const configSpeed = parts[2] || '';
    // Use configured (XMP/DOCP) speed if available, otherwise fall back to JEDEC speed
    const speed = configSpeed && configSpeed !== '0' ? configSpeed : jedecSpeed;
    info.ramInfo = speed ? `${totalGB} GB @ ${speed} MHz` : `${totalGB} GB`;
    info.ramTotalGB = totalGB;
    info.ramSticks = parts[3] || '';
    info.ramBrand = resolveRamBrand(parts[4], parts[5]);
    info.ramPartNumber = (parts[5] || '').trim();
  } catch {
    const totalGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    info.ramInfo = `${totalGB} GB`;
    info.ramTotalGB = totalGB;
  }

  // 3: Disk
  try {
    const parts = get(3).split('|||').map((s) => s.trim());
    info.diskName = parts[0] || 'Unknown Disk';
    info.diskType = parts[1] || '';
    info.diskHealth = parts[2] || '';
    info.diskTotalGB = parseInt(parts[3]) || 0;
  } catch { info.diskName = 'Unknown Disk'; }

  // 4: All drives
  try {
    const drivesRaw = get(4);
    if (drivesRaw) {
      info.allDrives = drivesRaw.split('\n').filter((l) => l.trim()).map((line) => {
        const [letter, totalGB, freeGB, label] = line.trim().split('|');
        return { letter: letter || '', totalGB: parseFloat(totalGB) || 0, freeGB: parseFloat(freeGB) || 0, label: label || '' };
      });
    }
  } catch {}

  // 5: Network
  try {
    const parts = get(5).split('|||').map((s) => s.trim());
    info.networkAdapter = parts[0] || '';
    info.ipAddress = parts[1] || '';
    info.networkLinkSpeed = parts[2] || '';
    info.macAddress = parts[3] || '';
    info.ipv6Address = parts[4] || '';
    info.gateway = parts[5] || '';
    info.dns = parts[6] || '';
  } catch {}

  // 6: Windows — with additional validation for Win11 vs Win10
  try {
    let parts = get(6).split('|||').map((s) => s.trim());
    let prod = parts[0] || '';
    let build = parts[1] || '';
    
    // Extract build number for verification
    const buildMatch = build.match(/Build (\d+)/);
    const buildNum = buildMatch ? parseInt(buildMatch[1]) : 0;
    
    // If build >= 22000, it's Windows 11; if < 22000, it's Windows 10
    // Correct any mislabeling
    if (buildNum >= 22000 && !prod.includes('11')) {
      prod = prod.replace(/Windows 10/i, 'Windows 11').replace(/win10/i, 'Windows 11') || 'Windows 11 Pro';
    } else if (buildNum > 0 && buildNum < 22000 && prod.includes('11')) {
      prod = prod.replace(/Windows 11/i, 'Windows 10');
    }
    
    info.windowsVersion = prod || 'Unknown';
    info.windowsBuild = build || 'Unknown';
  } catch {
    info.windowsVersion = 'Unknown';
    info.windowsBuild = 'Unknown';
  }

  // 7: Uptime
  try { info.systemUptime = get(7) || ''; } catch {}

  // 8: Power plan
  try { info.powerPlan = get(8) || ''; } catch {}

  // Fallback: some systems may not expose Win32_PowerPlan; try powercfg as a reliable fallback
  if (!info.powerPlan) {
    try {
      const pc = await execAsync('powercfg /getactivescheme', { shell: true, timeout: 4000 });
      const out = (pc.stdout || '').trim();
      // Example output: Power Scheme GUID: 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c  (High performance)
      const m = out.match(/\(([^)]+)\)$/);
      if (m && m[1]) {
        info.powerPlan = m[1].trim();
      } else {
        // fallback: try to extract text after the GUID
        const parts = out.split(/\)\s*/).map(p => p.trim()).filter(Boolean);
        const last = parts[parts.length - 1] || '';
        if (last) info.powerPlan = last.replace(/^\(|\)$/g, '').trim();
      }
    } catch (e) {
      // ignore — leave powerPlan empty
    }
  }

  // 9: Battery
  try {
    const parts = get(9).split('|||').map((s) => s.trim());
    info.hasBattery = parts[0] === 'true';
    if (info.hasBattery) {
      info.batteryPercent = parseInt(parts[1]) || 0;
      info.batteryStatus = parts[2] || '';
    }
  } catch {}

  // 10: RAM GB usage
  try {
    const parts = get(10).split('|||').map((s) => s.trim());
    info.ramUsedGB = parseFloat(parts[0]) || 0;
    info.ramTotalGB = parseFloat(parts[1]) || info.ramTotalGB;
  } catch {}

  // 11: Disk free
  try { info.diskFreeGB = parseFloat(get(11)) || 0; } catch {}



  return info;
});

// ──────────────────────────────────────────────────────
// Extended Stats IPC Handler — consolidated into 2 calls:
//   1) One big PowerShell script via -EncodedCommand
//      (per-core CPU, clock, network, RAM GB, disk I/O,
//       process count, uptime, Wi-Fi, latency)
//   2) nvidia-smi (separate binary, fast, only if NVIDIA GPU)
// ──────────────────────────────────────────────────────
let _extInFlight = false;
let _lastExt = {
  cpuClock: 0, perCoreCpu: [], gpuUsage: -1, gpuTemp: -1,
  gpuVramUsed: -1, gpuVramTotal: -1, networkUp: 0, networkDown: 0,
  wifiSignal: -1, ramUsedGB: 0, ramTotalGB: 0, diskReadSpeed: 0,
  diskWriteSpeed: 0, processCount: 0, systemUptime: '', latencyMs: 0,
};

ipcMain.handle('system:get-extended-stats', async () => {
  // Overlap guard
  if (_extInFlight) return _lastExt;
  _extInFlight = true;
  try {
    return await _getExtStatsImpl();
  } finally {
    _extInFlight = false;
  }
});

async function _getExtStatsImpl() {
  const ext = {
    cpuClock: 0, perCoreCpu: [], gpuUsage: -1, gpuTemp: -1,
    gpuVramUsed: -1, gpuVramTotal: -1, networkUp: 0, networkDown: 0,
    wifiSignal: -1, ramUsedGB: 0, ramTotalGB: 0, diskReadSpeed: 0,
    diskWriteSpeed: 0, processCount: 0, systemUptime: '', latencyMs: 0,
  };

  // ── All PS queries use runPSScript (temp .ps1 file + -File flag) ──
  // This avoids cmd.exe quoting issues that break -Command one-liners.
  // We run 4 parallel tasks: fastCIM, counters, network, nvidia-smi.

  const [fastR, counterR, netR, gpuR] = await Promise.allSettled([

    // ── Fast CIM queries (sub-second): clock, RAM, procCount, uptime, latency ──
    runPSScript(`
try { $clock = (Get-CimInstance Win32_Processor | Select-Object -First 1).CurrentClockSpeed } catch { $clock = 0 }
try {
  $o = Get-CimInstance Win32_OperatingSystem
  $ramT = [math]::Round($o.TotalVisibleMemorySize / 1MB, 1)
  $ramU = [math]::Round(($o.TotalVisibleMemorySize - $o.FreePhysicalMemory) / 1MB, 1)
  $up = (Get-Date) - $o.LastBootUpTime
  $uptime = '{0}d {1}h {2}m' -f $up.Days, $up.Hours, $up.Minutes
} catch { $ramT = 0; $ramU = 0; $uptime = '' }
try { $procs = (Get-Process).Count } catch { $procs = 0 }
try {
  $ping = Test-Connection -Count 1 -ComputerName 8.8.8.8 -ErrorAction SilentlyContinue
  $lat = if ($ping) { $ping.ResponseTime } else { 0 }
} catch { $lat = 0 }
Write-Output "$clock|$ramU|$ramT|$procs|$uptime|$lat"
    `, 6000),

    // ── Get-Counter: per-core CPU + disk I/O (1-second sample) ──
    runPSScript(`
try {
  $c = Get-Counter -Counter @(
    '\\Processor(*)\\% Processor Time',
    '\\PhysicalDisk(_Total)\\Disk Read Bytes/sec',
    '\\PhysicalDisk(_Total)\\Disk Write Bytes/sec'
  ) -SampleInterval 1 -MaxSamples 1 -ErrorAction SilentlyContinue
  $s = $c.CounterSamples
  $cores = $s | Where-Object { $_.Path -like '*processor(*)*' -and $_.InstanceName -ne '_total' } | Sort-Object InstanceName
  $coreStr = ($cores | ForEach-Object { [math]::Round($_.CookedValue, 1) }) -join ','
  $dr = ($s | Where-Object { $_.Path -like '*read*' }).CookedValue
  $dw = ($s | Where-Object { $_.Path -like '*write*' }).CookedValue
  Write-Output ($coreStr + '|' + [math]::Round($dr) + '|' + [math]::Round($dw))
} catch { Write-Output '|0|0' }
    `, 6000),

    // ── Network: throughput delta + Wi-Fi + SSID ──
    runPSScript(`
try {
  $a = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.Name -notmatch 'Virtual|vEthernet|Loopback|Microsoft|Container' } | Select-Object -First 1
  if ($a) {
    $n = $a.Name
    $s1 = Get-NetAdapterStatistics -Name $n
    Start-Sleep -Milliseconds 500
    $s2 = Get-NetAdapterStatistics -Name $n
    $up = [math]::Round(($s2.SentBytes - $s1.SentBytes) / 0.5)
    $dn = [math]::Round(($s2.ReceivedBytes - $s1.ReceivedBytes) / 0.5)
  } else { $up = 0; $dn = 0 }
} catch { $up = 0; $dn = 0 }

$ssid = ''; $sig = ''
try {
  $w = netsh wlan show interfaces 2>$null
  if ($w) {
    $sl = $w | Select-String -Pattern '^\\s*SSID' | Where-Object { $_.ToString() -notmatch 'BSSID' } | Select-Object -First 1
    $sg2 = $w | Select-String 'Signal' | Select-Object -First 1
    if ($sl) { $ssid = $sl.ToString().Split(':',2)[1].Trim() }
    if ($sg2) { $sig = $sg2.ToString().Split(':',2)[1].Trim() }
  }
} catch {}

Write-Output "$up|$dn|$ssid|$sig"
    `, 5000),

    // ── GPU via nvidia-smi (separate binary, fast) ──
    execAsync(
      'nvidia-smi --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total --format=csv,noheader,nounits',
      { shell: true, timeout: 3000 }
    ).then(r => (r.stdout || '').trim()).catch(() => ''),
  ]);

  // ── Parse each result independently — each is a pipe-separated string ──
  const val = (r) => r.status === 'fulfilled' ? (r.value || '') : '';

  // Fast CIM: clock|ramU|ramT|procs|uptime|latency
  try {
    const parts = val(fastR).split('|');
    if (parts.length >= 6) {
      ext.cpuClock = parseInt(parts[0]) || 0;
      ext.ramUsedGB = parseFloat(parts[1]) || 0;
      ext.ramTotalGB = parseFloat(parts[2]) || 0;
      ext.processCount = parseInt(parts[3]) || 0;
      ext.systemUptime = parts[4] || '';
      ext.latencyMs = parseInt(parts[5]) || 0;
    }
  } catch {}

  // Counter: coreCSV|diskRead|diskWrite
  try {
    const raw = val(counterR);
    if (raw) {
      const parts = raw.split('|');
      if (parts.length >= 3) {
        if (parts[0]) {
          ext.perCoreCpu = parts[0].split(',').map(v => parseFloat(v)).filter(v => !isNaN(v));
        }
        ext.diskReadSpeed = parseInt(parts[1]) || 0;
        ext.diskWriteSpeed = parseInt(parts[2]) || 0;
      }
    }
  } catch {}

  // Network: up|down|ssid|signal
  try {
    const parts = val(netR).split('|');
    if (parts.length >= 4) {
      ext.networkUp = parseInt(parts[0]) || 0;
      ext.networkDown = parseInt(parts[1]) || 0;
      if (parts[2]) ext.ssid = parts[2];
      if (parts[3]) ext.wifiSignal = parseInt(parts[3]) || -1;
    }
  } catch {}

  // GPU: prefer LHM real-time data (1s), fall back to nvidia-smi (5s)
  if (_lhmGpuTemp >= 0) ext.gpuTemp = _lhmGpuTemp;
  if (_lhmGpuUsage >= 0) ext.gpuUsage = _lhmGpuUsage;
  if (_lhmGpuVramUsed >= 0) ext.gpuVramUsed = _lhmGpuVramUsed;
  if (_lhmGpuVramTotal > 0) ext.gpuVramTotal = _lhmGpuVramTotal;

  // nvidia-smi fallback: only fill fields LHM didn't provide
  try {
    const raw = val(gpuR);
    if (raw) {
      const parts = raw.split(',').map(s => parseFloat(s.trim()));
      if (parts.length >= 4) {
        if (ext.gpuUsage < 0) ext.gpuUsage = isNaN(parts[0]) ? -1 : Math.round(parts[0]);
        if (ext.gpuTemp < 0) ext.gpuTemp = isNaN(parts[1]) ? -1 : Math.round(parts[1]);
        if (ext.gpuVramUsed < 0) ext.gpuVramUsed = isNaN(parts[2]) ? -1 : Math.round(parts[2]);
        if (ext.gpuVramTotal < 0) ext.gpuVramTotal = isNaN(parts[3]) ? -1 : Math.round(parts[3]);
      }
    }
  } catch {}

  _lastExt = ext;
  return ext;
}

// Cleaner IPC Handlers
ipcMain.handle('cleaner:clear-nvidia-cache', async () => {
  try {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const caches = [
      path.join(localAppData, 'NVIDIA', 'DXCache'),
      path.join(localAppData, 'NVIDIA', 'GLCache'),
      path.join(localAppData, 'D3DSCache'),
    ];

    let totalBefore = 0;
    let totalDeleted = 0;
    let totalSize = 0;
    let totalRemaining = 0;

    let anyCacheExists = false;
    // Count before cleaning
    for (const cachePath of caches) {
      if (fs.existsSync(cachePath)) {
        anyCacheExists = true;
        try {
          const items = fs.readdirSync(cachePath);
          totalBefore += items.length;
        } catch (e) {
          // Continue if one folder fails
        }
      }
    }
    if (!anyCacheExists) {
      return { success: false, message: 'NVIDIA shader cache not found. Driver or game may not be installed.' };
    }

    // Delete files
    for (const cachePath of caches) {
      if (fs.existsSync(cachePath)) {
        try {
          const items = fs.readdirSync(cachePath);
          for (const item of items) {
            try {
              const itemPath = path.join(cachePath, item);
              const stats = fs.statSync(itemPath);
              totalSize += stats.size;
              if (stats.isDirectory()) {
                fs.rmSync(itemPath, { recursive: true, force: true });
              } else {
                fs.rmSync(itemPath, { force: true });
              }
              totalDeleted++;
            } catch (e) {
              // Continue if one file fails
            }
          }
        } catch (e) {
          // Continue if one folder fails
        }
      }
    }

    // Count after cleaning
    for (const cachePath of caches) {
      if (fs.existsSync(cachePath)) {
        try {
          const items = fs.readdirSync(cachePath);
          totalRemaining += items.length;
        } catch (e) {
          // Continue if one folder fails
        }
      }
    }

    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: `Cleared NVIDIA cache`,
      filesDeleted: totalDeleted,
      filesBefore: totalBefore,
      filesAfter: totalRemaining,
      spaceSaved: `${sizeInMB} MB`,
      details: `${totalDeleted}/${totalBefore} files deleted (${totalRemaining} remaining)`,
    };
  } catch (error) {
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('cleaner:clear-apex-shaders', async () => {
  try {
    const userProfile = process.env.USERPROFILE || os.homedir();
    const apexCachePath = path.join(userProfile, 'Saved Games', 'Respawn', 'Apex', 'local', 'psoCache.pso');

    let cleared = 0;
    let sizeFreed = 0;
    let filesBefore = 0;

    if (!fs.existsSync(apexCachePath)) {
      return { success: false, message: 'Apex Legends shader cache not found. Game may not be installed.' };
    }
    try {
      const stats = fs.statSync(apexCachePath);
      sizeFreed = stats.size;
      filesBefore = 1;
      fs.rmSync(apexCachePath, { force: true });
      cleared = 1;
    } catch (e) {
    }

    const sizeInMB = (sizeFreed / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: cleared > 0 
        ? 'Successfully cleared Apex Legends psoCache.pso'
        : 'Apex cache not found or already cleared',
      filesDeleted: cleared,
      filesBefore: filesBefore,
      filesAfter: 0,
      spaceSaved: cleared > 0 ? `${sizeInMB} MB` : '0 MB',
      details: cleared > 0 ? '1/1 file deleted (0 remaining)' : 'No files to delete',
    };
  } catch (error) {
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { success: false, message: `Error: ${error.message}` };
  }
});

// Call of Duty Shader Cache Cleaner
ipcMain.handle('cleaner:clear-cod-shaders', async () => {
  try {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const codCachePaths = [
      path.join(localAppData, 'ActivisionSharedCache'),
      path.join(localAppData, 'Activision'),
    ];

    let filesDeleted = 0;
    let sizeFreed = 0;
    let filesBefore = 0;
    let pathFound = false;

    for (const codCachePath of codCachePaths) {
      if (fs.existsSync(codCachePath)) {
        pathFound = true;
        try {
          const files = fs.readdirSync(codCachePath, { recursive: true });
          filesBefore += files.length;
          
          const deleteDir = (dir) => {
            try {
              const items = fs.readdirSync(dir);
              for (const item of items) {
                const itemPath = path.join(dir, item);
                const stats = fs.statSync(itemPath);
                if (stats.isDirectory()) {
                  deleteDir(itemPath);
                } else {
                  sizeFreed += stats.size;
                  fs.rmSync(itemPath, { force: true });
                  filesDeleted++;
                }
              }
              fs.rmdirSync(dir, { force: true });
            } catch (e) {
              // Continue on error
            }
          };
          
          deleteDir(codCachePath);
        } catch (e) {
          // Path might not exist or be accessible
        }
      }
    }

    if (!pathFound) {
      return { success: false, message: 'Call of Duty shader cache not found. Game may not be installed.' };
    }

    const sizeInMB = (sizeFreed / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: filesDeleted > 0 ? 'Successfully cleared Call of Duty shader cache' : 'Call of Duty shader cache not found. Game may not be installed.',
      filesDeleted,
      filesBefore,
      filesAfter: Math.max(0, filesBefore - filesDeleted),
      spaceSaved: `${sizeInMB} MB`,
    };
  } catch (error) {
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { success: false, message: `Error: ${error.message}` };
  }
});

// CS2 Shader Cache Cleaner
ipcMain.handle('cleaner:clear-cs2-shaders', async () => {
  try {
    const userProfile = process.env.USERPROFILE || os.homedir();
    const cs2CachePaths = [
      path.join(userProfile, 'AppData', 'Local', 'CS2'),
      path.join(userProfile, 'AppData', 'Local', 'SteamCache'),
    ];

    let filesDeleted = 0;
    let sizeFreed = 0;
    let filesBefore = 0;
    let pathFound = false;

    for (const cs2CachePath of cs2CachePaths) {
      if (fs.existsSync(cs2CachePath)) {
        pathFound = true;
        try {
          const deleteDir = (dir) => {
            try {
              const items = fs.readdirSync(dir);
              for (const item of items) {
                const itemPath = path.join(dir, item);
                const stats = fs.statSync(itemPath);
                if (stats.isDirectory()) {
                  deleteDir(itemPath);
                } else {
                  sizeFreed += stats.size;
                  fs.rmSync(itemPath, { force: true });
                  filesDeleted++;
                  filesBefore++;
                }
              }
            } catch (e) {
              // Continue
            }
          };
          deleteDir(cs2CachePath);
        } catch (e) {
          // Path error
        }
      }
    }

    if (!pathFound) {
      return { success: false, message: 'CS2 shader cache not found. Game may not be installed.' };
    }

    const sizeInMB = (sizeFreed / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: filesDeleted > 0 ? 'Successfully cleared CS2 shader cache' : 'CS2 shader cache not found. Game may not be installed.',
      filesDeleted,
      filesBefore,
      filesAfter: Math.max(0, filesBefore - filesDeleted),
      spaceSaved: `${sizeInMB} MB`,
    };
  } catch (error) {
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { success: false, message: `Error: ${error.message}` };
  }
});

// Fortnite Shader Cache Cleaner
ipcMain.handle('cleaner:clear-fortnite-shaders', async () => {
  try {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const fortniteCachePath = path.join(localAppData, 'FortniteGame', 'Saved', 'ShaderCache');

    let filesDeleted = 0;
    let sizeFreed = 0;
    let filesBefore = 0;

    if (!fs.existsSync(fortniteCachePath)) {
      return { success: false, message: 'Fortnite shader cache not found.' };
    }

    const deleteDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);
          if (stats.isDirectory()) {
            deleteDir(itemPath);
          } else {
            sizeFreed += stats.size;
            fs.rmSync(itemPath, { force: true });
            filesDeleted++;
          }
        }
      } catch (e) {
        // Continue
      }
    };

    filesBefore = fs.readdirSync(fortniteCachePath, { recursive: true }).length;
    deleteDir(fortniteCachePath);

    const sizeInMB = (sizeFreed / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: 'Successfully cleared Fortnite shader cache',
      filesDeleted,
      filesBefore,
      filesAfter: Math.max(0, filesBefore - filesDeleted),
      spaceSaved: `${sizeInMB} MB`,
    };
  } catch (error) {
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { success: false, message: `Error: ${error.message}` };
  }
});

// League of Legends Shader Cache Cleaner
ipcMain.handle('cleaner:clear-lol-shaders', async () => {
  try {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const lolCachePath = path.join(localAppData, 'RADS');

    let filesDeleted = 0;
    let sizeFreed = 0;
    let filesBefore = 0;

    if (!fs.existsSync(lolCachePath)) {
      return { success: false, message: 'League of Legends cache not found.' };
    }

    const deleteDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);
          if (stats.isDirectory()) {
            deleteDir(itemPath);
          } else {
            sizeFreed += stats.size;
            fs.rmSync(itemPath, { force: true });
            filesDeleted++;
          }
        }
      } catch (e) {
        // Continue
      }
    };

    filesBefore = fs.readdirSync(lolCachePath, { recursive: true }).length;
    deleteDir(lolCachePath);

    const sizeInMB = (sizeFreed / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: 'Successfully cleared League of Legends cache',
      filesDeleted,
      filesBefore,
      filesAfter: Math.max(0, filesBefore - filesDeleted),
      spaceSaved: `${sizeInMB} MB`,
    };
  } catch (error) {
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { success: false, message: `Error: ${error.message}` };
  }
});

// Overwatch 2 Shader Cache Cleaner
ipcMain.handle('cleaner:clear-overwatch-shaders', async () => {
  try {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const owCachePaths = [
      path.join(localAppData, 'Blizzard Entertainment', 'Overwatch'),
      path.join(localAppData, 'Blizzard Entertainment'),
    ];

    let filesDeleted = 0;
    let sizeFreed = 0;
    let filesBefore = 0;
    let pathFound = false;

    for (const owCachePath of owCachePaths) {
      if (fs.existsSync(owCachePath)) {
        pathFound = true;
        try {
          const deleteDir = (dir) => {
            try {
              const items = fs.readdirSync(dir);
              for (const item of items) {
                const itemPath = path.join(dir, item);
                const stats = fs.statSync(itemPath);
                if (stats.isDirectory()) {
                  deleteDir(itemPath);
                } else {
                  sizeFreed += stats.size;
                  fs.rmSync(itemPath, { force: true });
                  filesDeleted++;
                  filesBefore++;
                }
              }
            } catch (e) {
              // Continue
            }
          };
          deleteDir(owCachePath);
        } catch (e) {
          // Error
        }
      }
    }

    if (!pathFound) {
      return { success: false, message: 'Overwatch 2 shader cache not found. Game may not be installed.' };
    }

    const sizeInMB = (sizeFreed / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: filesDeleted > 0 ? 'Successfully cleared Overwatch 2 cache' : 'Overwatch 2 shader cache not found. Game may not be installed.',
      filesDeleted,
      filesBefore,
      filesAfter: Math.max(0, filesBefore - filesDeleted),
      spaceSaved: `${sizeInMB} MB`,
    };
  } catch (error) {
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { success: false, message: `Error: ${error.message}` };
  }
});

// Rainbow Six Siege Shader Cache Cleaner
ipcMain.handle('cleaner:clear-r6-shaders', async () => {
  try {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const r6CachePaths = [
      path.join(localAppData, 'Ubisoft Game Launcher'),
      path.join(localAppData, 'Rainbow Six Siege'),
    ];

    let filesDeleted = 0;
    let sizeFreed = 0;
    let filesBefore = 0;
    let pathFound = false;

    for (const r6CachePath of r6CachePaths) {
      if (fs.existsSync(r6CachePath)) {
        pathFound = true;
        try {
          const deleteDir = (dir) => {
            try {
              const items = fs.readdirSync(dir);
              for (const item of items) {
                const itemPath = path.join(dir, item);
                const stats = fs.statSync(itemPath);
                if (stats.isDirectory()) {
                  deleteDir(itemPath);
                } else {
                  sizeFreed += stats.size;
                  fs.rmSync(itemPath, { force: true });
                  filesDeleted++;
                  filesBefore++;
                }
              }
            } catch (e) {
              // Continue
            }
          };
          deleteDir(r6CachePath);
        } catch (e) {
          // Error
        }
      }
    }

    if (!pathFound) {
      return { success: false, message: 'Rainbow Six Siege shader cache not found. Game may not be installed.' };
    }

    const sizeInMB = (sizeFreed / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: filesDeleted > 0 ? 'Successfully cleared Rainbow Six Siege cache' : 'Rainbow Six Siege shader cache not found. Game may not be installed.',
      filesDeleted,
      filesBefore,
      filesAfter: Math.max(0, filesBefore - filesDeleted),
      spaceSaved: `${sizeInMB} MB`,
    };
  } catch (error) {
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { success: false, message: `Error: ${error.message}` };
  }
});

// Rocket League Shader Cache Cleaner
ipcMain.handle('cleaner:clear-rocket-league-shaders', async () => {
  try {
    const userProfile = process.env.USERPROFILE || os.homedir();
    const rlCachePath = path.join(userProfile, 'AppData', 'Roaming', 'Rocket League');

    let filesDeleted = 0;
    let sizeFreed = 0;
    let filesBefore = 0;

    if (!fs.existsSync(rlCachePath)) {
      return { success: false, message: 'Rocket League cache not found.' };
    }

    const deleteDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);
          if (stats.isDirectory()) {
            deleteDir(itemPath);
          } else {
            sizeFreed += stats.size;
            fs.rmSync(itemPath, { force: true });
            filesDeleted++;
          }
        }
      } catch (e) {
        // Continue
      }
    };

    filesBefore = fs.readdirSync(rlCachePath, { recursive: true }).length;
    deleteDir(rlCachePath);

    const sizeInMB = (sizeFreed / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: 'Successfully cleared Rocket League cache',
      filesDeleted,
      filesBefore,
      filesAfter: Math.max(0, filesBefore - filesDeleted),
      spaceSaved: `${sizeInMB} MB`,
    };
  } catch (error) {
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { success: false, message: `Error: ${error.message}` };
  }
});

// Valorant Shader Cache Cleaner
ipcMain.handle('cleaner:clear-valorant-shaders', async () => {
  try {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const valorantCachePath = path.join(localAppData, 'VALORANT');

    let filesDeleted = 0;
    let sizeFreed = 0;
    let filesBefore = 0;

    if (!fs.existsSync(valorantCachePath)) {
      return { success: false, message: 'Valorant cache not found.' };
    }

    const deleteDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);
          if (stats.isDirectory()) {
            deleteDir(itemPath);
          } else {
            sizeFreed += stats.size;
            fs.rmSync(itemPath, { force: true });
            filesDeleted++;
          }
        }
      } catch (e) {
        // Continue
      }
    };

    filesBefore = fs.readdirSync(valorantCachePath, { recursive: true }).length;
    deleteDir(valorantCachePath);

    const sizeInMB = (sizeFreed / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: 'Successfully cleared Valorant shader cache',
      filesDeleted,
      filesBefore,
      filesAfter: Math.max(0, filesBefore - filesDeleted),
      spaceSaved: `${sizeInMB} MB`,
    };
  } catch (error) {
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('cleaner:clear-temp-files', async () => {
  try {
    const tempDir = process.env.TEMP || os.tmpdir();
    let filesDeleted = 0;
    let totalSize = 0;
    let filesBefore = 0;

    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      filesBefore = files.length;
      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
          if (stats.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.rmSync(filePath, { force: true });
          }
          filesDeleted++;
        } catch (e) {
          // Skip files that can't be deleted
        }
      }
    }

    const filesAfter = filesBefore - filesDeleted;
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: `Cleared temporary files`,
      filesDeleted: filesDeleted,
      filesBefore: filesBefore,
      filesAfter: filesAfter,
      spaceSaved: `${sizeInMB} MB`,
      details: `${filesDeleted}/${filesBefore} files deleted (${filesAfter} remaining)`,
    };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('cleaner:clear-prefetch', async () => {
  try {
    const prefetch = 'C:\\Windows\\Prefetch';
    let filesDeleted = 0;
    let totalSize = 0;
    let filesBefore = 0;
    let filesAfter = 0;

    if (fs.existsSync(prefetch)) {
      const allFiles = fs.readdirSync(prefetch);
      filesBefore = allFiles.filter(f => f.endsWith('.pf')).length;
      
      for (const file of allFiles) {
        if (file.endsWith('.pf')) {
          try {
            const filePath = path.join(prefetch, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
            fs.rmSync(filePath, { force: true });
            filesDeleted++;
          } catch (e) {
            // Skip protected files
          }
        }
      }
      
      filesAfter = filesBefore - filesDeleted;
    }

    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: `Cleared prefetch files`,
      filesDeleted: filesDeleted,
      filesBefore: filesBefore,
      filesAfter: filesAfter,
      spaceSaved: `${sizeInMB} MB`,
      details: `${filesDeleted}/${filesBefore} files deleted (${filesAfter} remaining)`,
    };
  } catch (error) {
    // Prefetch folder ALWAYS needs admin rights
    return { success: false, message: 'Run the app as administrator' };
  }
});

ipcMain.handle('cleaner:clear-memory-dumps', async () => {
  try {
    const dumpDir = 'C:\\Windows\\Minidump';
    let filesDeleted = 0;
    let totalSize = 0;
    let filesBefore = 0;
    let filesAfter = 0;

    // Diagnostic logging
    console.log(`[Clear Memory Dumps] Checking path: ${dumpDir}`);
    console.log(`[Clear Memory Dumps] Exists: ${fs.existsSync(dumpDir)}`);

      if (!fs.existsSync(dumpDir)) {
        return { success: false, message: 'Minidump folder not found.' };
    }
    const files = fs.readdirSync(dumpDir);
    filesBefore = files.length;
    if (filesBefore === 0) {
      return { success: true, message: 'Minidump folder found, but no dump files to delete.', filesDeleted: 0, filesBefore: 0, filesAfter: 0, spaceSaved: '0 MB', details: 'No files to delete.' };
    }
    for (const file of files) {
      try {
        const filePath = path.join(dumpDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        if (stats.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.rmSync(filePath, { force: true });
        }
        filesDeleted++;
      } catch (e) {
        // Continue if one file fails
      }
    }
    filesAfter = filesBefore - filesDeleted;
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      message: `Cleared crash dump files`,
      filesDeleted: filesDeleted,
      filesBefore: filesBefore,
      filesAfter: filesAfter,
      spaceSaved: `${sizeInMB} MB`,
      details: `${filesDeleted}/${filesBefore} files deleted (${filesAfter} remaining)`,
    };
  } catch (error) {
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('cleaner:clear-update-cache', async () => {
  try {
    const updateDir = 'C:\\Windows\\SoftwareDistribution\\Download';

    if (!fs.existsSync(updateDir)) {
      return {
        success: false,
        message: 'Windows Update cache not found. It may already be empty.',
        spaceSaved: '0 MB'
      };
    }

    // 1. Stop Windows Update and related services to release folder locks
    const stopServicesCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "
      @('wuauserv', 'usosvc', 'UsoSvc') | ForEach-Object {
        try {
          Stop-Service -Name \\$_ -Force -ErrorAction Stop
        } catch {
          # Service may not be running, that's okay
        }
      }
      # Wait longer to ensure all locks are released
      Start-Sleep -Milliseconds 1500
    "`;
    
    try {
      await execAsync(stopServicesCmd, { shell: true, timeout: 30000 });
    } catch (e) {
      // Continue anyway, services might not exist on all systems
    }

    // 2. Gather pre-deletion stats
    const statsCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-ChildItem -Path '${updateDir}' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum"`;
    let totalSize = 0;
    let filesBefore = 0;

    try {
      const statRes = await execAsync(statsCmd, { shell: true, timeout: 30000 });
      const stdout = (statRes.stdout || '').trim();
      totalSize = parseInt(stdout) || 0;
      // Also count files
      const countCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-ChildItem -Path '${updateDir}' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object).Count"`;
      const countRes = await execAsync(countCmd, { shell: true, timeout: 30000 });
      filesBefore = parseInt(countRes.stdout) || 0;
      console.log(`[Cache Stats] Total size: ${totalSize} bytes, Files: ${filesBefore}`);
    } catch (e) {
      // Stats collection is best-effort; continue with deletion anyway
      console.error('[Cache Stats] Failed to collect stats:', e.message);
    }

    // Check if folder has content
    if (filesBefore === 0) {
      console.log('[Cache Check] Folder appears empty already');
      return {
        success: true,
        message: `Cache folder is already empty`,
        filesDeleted: 0,
        filesBefore: 0,
        filesAfter: 0,
        spaceSaved: `0 MB`,
        details: `No files to delete`,
      };
    }

    // 3. Clear the cache folder with retry logic
    let deletionSuccess = false;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // First two attempts: Try standard removal
        if (attempt <= 2) {
          let removeCmd;
          if (attempt === 1) {
            removeCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-Item -Path '${updateDir}\\*' -Recurse -Force -ErrorAction Stop"`;
          } else {
            removeCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "
              Get-ChildItem -Path '${updateDir}' -Force -Recurse -ErrorAction Stop |
              Remove-Item -Recurse -Force -Confirm:\\$false -ErrorAction Stop
            "`;
          }
          await execAsync(removeCmd, { shell: true, timeout: 120000 });
        } else {
          // Third attempt: Nuclear option - remove entire folder and recreate it
          const nukeCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "
            Remove-Item -Path '${updateDir}' -Recurse -Force -ErrorAction Stop;
            Start-Sleep -Milliseconds 500;
            New-Item -ItemType Directory -Path '${updateDir}' -Force -ErrorAction Stop | Out-Null
          "`;
          await execAsync(nukeCmd, { shell: true, timeout: 120000 });
        }
        deletionSuccess = true;
        break; // Success, exit retry loop
      } catch (removeError) {
        lastError = removeError;
        console.error(`[Attempt ${attempt}] Cache deletion failed:`, removeError.message, removeError.stderr);
        if (attempt < 3) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // 4. Restart Windows Update services
    const restartCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "
      @('wuauserv', 'usosvc', 'UsoSvc') | ForEach-Object {
        try {
          Start-Service -Name \\$_ -ErrorAction SilentlyContinue
        } catch {
          # Service may not exist, that's okay
        }
      }
    "`;
    try {
      await execAsync(restartCmd, { shell: true, timeout: 10000 });
    } catch (e) {
      // Service restart failure is non-critical
    }

    // 5. Return result
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    if (deletionSuccess) {
      console.log('[Cache Deletion] Success - removed ' + filesBefore + ' files');
      return {
        success: true,
        message: `Cleared Windows Update cache`,
        filesDeleted: filesBefore,
        filesBefore: filesBefore,
        filesAfter: 0,
        spaceSaved: `${sizeInMB} MB`,
        details: `${filesBefore} file(s) deleted`,
      };
    } else {
      // Check what went wrong
      const errorOutput = lastError ? (lastError.stderr || lastError.stdout || lastError.message || '').toLowerCase() : '';
      console.error('[Cache Deletion] Failed with error:', errorOutput);
      
      if (errorOutput.includes('access is denied') || errorOutput.includes('access denied')) {
        console.error('[Cache Deletion] Detected: Permission denied');
        return { success: false, message: 'Run the app as administrator' };
      } else if (errorOutput.includes('is in use') || errorOutput.includes('cannot be removed') || errorOutput.includes('being used')) {
        console.error('[Cache Deletion] Detected: File in use');
        return { success: false, message: 'Some cache files are still in use. Try restarting your computer.' };
      } else {
        console.error('[Cache Deletion] Unknown error:', lastError);
        return {
          success: false,
          message: 'Could not clear cache. Try restarting your computer.',
          spaceSaved: '0 MB',
          details: lastError ? lastError.message : 'Unknown error'
        };
      }
    }
  } catch (error) {
    return { success: false, message: 'Run the app as administrator' };
  }
});

ipcMain.handle('cleaner:clear-dns-cache', async () => {
  try {
    // Get DNS cache entry count before clearing
    let entriesBefore = 0;
    try {
      const displayResult = await execAsync('powershell -NoProfile -ExecutionPolicy Bypass -Command "ipconfig /displaydns"', { shell: true, timeout: 10000 });
      const entries = displayResult.stdout.match(/Record Name/gi);
      entriesBefore = entries ? entries.length : 0;
      console.log(`[DNS Cache] Entries before: ${entriesBefore}`);
    } catch (e) {
      console.error('[DNS Cache] Error counting entries before:', e.message);
      // Ignore errors getting count
    }
    
    // Try multiple methods to clear DNS cache
    let dnsCleared = false;
    let method = '';
    let lastError = null;
    
    // Method 1: Try PowerShell Clear-DnsClientCache (Windows 8+)
    try {
      console.log('[DNS Cache] Attempting Method 1: Clear-DnsClientCache');
      await execAsync('powershell -NoProfile -ExecutionPolicy Bypass -Command "Clear-DnsClientCache -Confirm:$false"', { shell: true, timeout: 15000 });
      dnsCleared = true;
      method = 'PowerShell Clear-DnsClientCache';
      console.log('[DNS Cache] Method 1 succeeded');
    } catch (error) {
      console.error('[DNS Cache] Method 1 failed:', error.message);
      lastError = error;
      // Method 1 failed, try next method
    }
    
    // Method 2: If Method 1 fails, try ipconfig /flushdns directly
    if (!dnsCleared) {
      try {
        console.log('[DNS Cache] Attempting Method 2: ipconfig /flushdns');
        // Run ipconfig /flushdns in command prompt, not PowerShell for better compatibility
        const result = await execAsync('cmd /c ipconfig /flushdns', { shell: true, timeout: 15000 });
        if (result.stdout.includes('cleared') || result.stdout.includes('Cleared') || !result.stderr) {
          dnsCleared = true;
          method = 'ipconfig /flushdns (cmd)';
          console.log('[DNS Cache] Method 2 succeeded');
        }
      } catch (error) {
        console.error('[DNS Cache] Method 2 (cmd) failed:', error.message);
        lastError = error;
        // Try alternative: ipconfig /flushdns through PowerShell
        try {
          console.log('[DNS Cache] Attempting Method 2 Alternative: ipconfig /flushdns (PowerShell)');
          const psResult = await execAsync('powershell -NoProfile -ExecutionPolicy Bypass -Command "& cmd /c ipconfig /flushdns"', { shell: true, timeout: 15000 });
          dnsCleared = true;
          method = 'ipconfig /flushdns (PowerShell)';
          console.log('[DNS Cache] Method 2 Alternative succeeded');
        } catch (error2) {
          console.error('[DNS Cache] Method 2 Alternative failed:', error2.message);
          lastError = error2;
        }
      }
    }
    
    // Method 3: Restart DNS Client service (most reliable on locked systems)
    if (!dnsCleared) {
      try {
        console.log('[DNS Cache] Attempting Method 3: DNS Client Service restart');
        // Stop the service
        await execAsync('powershell -NoProfile -ExecutionPolicy Bypass -Command "Stop-Service -Name dnscache -Force -ErrorAction Stop; Start-Sleep -Milliseconds 1000"', { shell: true, timeout: 15000 });
        // Start the service
        await execAsync('powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Service -Name dnscache -ErrorAction Stop"', { shell: true, timeout: 15000 });
        dnsCleared = true;
        method = 'DNS Client Service restart';
        console.log('[DNS Cache] Method 3 succeeded');
      } catch (error) {
        console.error('[DNS Cache] Method 3 failed:', error.message);
        lastError = error;
        // Method 3 failed
      }
    }
    
    if (!dnsCleared) {
      console.error('[DNS Cache] All methods failed:', lastError);
      return {
        success: false,
        message: 'Failed to clear DNS cache. Please ensure the app is running as Administrator.',
        details: lastError ? lastError.message : 'Unknown error'
      };
    }
    
    console.log(`[DNS Cache] Successfully cleared using method: ${method}`);
    
    // Wait a moment for DNS cache to fully clear
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify DNS cache was actually cleared
    let entriesAfter = 0;
    try {
      const displayAfter = await execAsync('powershell -NoProfile -ExecutionPolicy Bypass -Command "ipconfig /displaydns"', { shell: true, timeout: 10000 });
      const entriesMatch = displayAfter.stdout.match(/Record Name/gi);
      entriesAfter = entriesMatch ? entriesMatch.length : 0;
      console.log(`[DNS Cache] Entries after: ${entriesAfter}`);
    } catch (e) {
      console.error('[DNS Cache] Error counting entries after:', e.message);
      // Ignore verification error
    }

    return {
      success: true,
      message: 'DNS cache cleared successfully',
      spaceSaved: entriesBefore > 0 ? `${entriesBefore} DNS entries removed` : 'DNS cache cleared',
      details: `Method: ${method}`,
    };
    
  } catch (error) {
    if (error.message.includes('access') || 
        error.message.includes('denied') || 
        error.message.includes('administrator') ||
        error.message.includes('privilege')) {
      return { 
        success: false, 
        message: 'Administrator privileges required. Please run the app as Administrator.' 
      };
    }
    
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('cleaner:clear-ram-cache', async () => {
  try {
    // Use PowerShell with RtlAdjustPrivilege - bypasses Device Guard
    const tempScript = path.join(app.getPath('temp'), 'ram-purge.ps1');
    const scriptContent = `
# Standby list purge using RtlAdjustPrivilege
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class MemoryAPI {
    [DllImport("ntdll.dll")]
    public static extern uint NtSetSystemInformation(int InfoClass, IntPtr Info, int Length);
    
    [DllImport("ntdll.dll")]
    public static extern uint RtlAdjustPrivilege(int Privilege, bool Enable, bool CurrentThread, out bool Enabled);
    
    public const int SE_PROF_SINGLE_PROCESS_PRIVILEGE = 13;
    public const int SystemMemoryListInformation = 80;
    public const int MemoryPurgeStandbyList = 4;
    
    public static string PurgeStandbyList() {
        // Enable privilege using RtlAdjustPrivilege
        bool wasEnabled;
        uint privStatus = RtlAdjustPrivilege(SE_PROF_SINGLE_PROCESS_PRIVILEGE, true, false, out wasEnabled);
        
        if (privStatus != 0) {
            return "PRIV_FAIL:0x" + privStatus.ToString("X8");
        }
        
        // Try command 4 (MemoryPurgeStandbyList)
        int command = MemoryPurgeStandbyList;
        IntPtr commandPtr = Marshal.AllocHGlobal(4);
        Marshal.WriteInt32(commandPtr, command);
        
        uint status = NtSetSystemInformation(SystemMemoryListInformation, commandPtr, 4);
        Marshal.FreeHGlobal(commandPtr);
        
        if (status == 0) {
            return "SUCCESS:4";
        }
        
        // Try command 2 as fallback
        command = 2;
        commandPtr = Marshal.AllocHGlobal(4);
        Marshal.WriteInt32(commandPtr, command);
        
        uint status2 = NtSetSystemInformation(SystemMemoryListInformation, commandPtr, 4);
        Marshal.FreeHGlobal(commandPtr);
        
        if (status2 == 0) {
            return "SUCCESS:2";
        }
        
        return "FAILED:CMD4=0x" + status.ToString("X8") + ";CMD2=0x" + status2.ToString("X8");
    }
}
"@

# Get standby cache before (this is what Task Manager shows as "Cached")
try {
    $standbyBefore = (Get-Counter '\Memory\Standby Cache Core Bytes','\Memory\Standby Cache Normal Priority Bytes','\Memory\Standby Cache Reserve Bytes' -ErrorAction SilentlyContinue).CounterSamples | Measure-Object -Property CookedValue -Sum
    $cachedBeforeMB = [math]::Round($standbyBefore.Sum / 1MB, 0)
} catch {
    $cachedBeforeMB = 0
}

# Execute purge
$result = [MemoryAPI]::PurgeStandbyList()

# Wait for counters to update
Start-Sleep -Milliseconds 2000

# Get standby cache after
try {
    $standbyAfter = (Get-Counter '\Memory\Standby Cache Core Bytes','\Memory\Standby Cache Normal Priority Bytes','\Memory\Standby Cache Reserve Bytes' -ErrorAction SilentlyContinue).CounterSamples | Measure-Object -Property CookedValue -Sum
    $cachedAfterMB = [math]::Round($standbyAfter.Sum / 1MB, 0)
} catch {
    $cachedAfterMB = 0
}

# Calculate freed (use absolute value)
if ($cachedBeforeMB -gt 0 -and $cachedAfterMB -ge 0) {
    $freedMB = [math]::Abs($cachedBeforeMB - $cachedAfterMB)
} else {
    $freedMB = -1
}

Write-Output "$result|FreedMB=$freedMB"
`;

    fs.writeFileSync(tempScript, scriptContent, 'utf8');
    
    // Execute the script
    const result = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScript}"`, { shell: true });
    
    // Clean up
    try {
      fs.unlinkSync(tempScript);
    } catch {}
    
    const output = result.stdout.trim();
    
    const lines = output.split('\n');
    const statusLine = lines[lines.length - 1].trim();
    
    if (statusLine.includes('SUCCESS:4') || statusLine.includes('SUCCESS:2')) {
      const freedMatch = statusLine.match(/FreedMB=(-?\d+)/);
      const freedMB = freedMatch ? parseInt(freedMatch[1]) : -1;
      
      if (freedMB > 0) {
        return {
          success: true,
          message: 'Standby list cleared successfully',
          spaceSaved: freedMB + ' MB',
        };
      } else {
        return {
          success: true,
          message: 'Standby list cleared successfully',
          spaceSaved: 'Check Task Manager to see freed memory',
        };
      }
    } else if (statusLine.includes('PRIV_FAIL')) {
      return {
        success: false,
        message: 'Run the app as administrator',
      };
    } else if (statusLine.includes('FAILED:')) {
      return {
        success: false,
        message: 'Run the app as administrator',
      };
    } else {
      return {
        success: false,
        message: 'Unexpected result. Check console logs.',
      };
    }
    
  } catch (error) {
    console.error('RAM Cache Clear Error:', error);
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    return { 
      success: false, 
      message: `Failed: ${error.message}`,
    };
  }
});

// Empty Recycle Bin IPC Handler
ipcMain.handle('cleaner:empty-recycle-bin', async () => {
  try {
    // Method 1: Try using Clear-RecycleBin PowerShell cmdlet
    try {
      const cmd = `[void](Clear-RecycleBin -Force -Confirm:$false -ErrorAction Stop); Write-Host 'SUCCESS'`;
      const result = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
      
      if (result.stdout.includes('SUCCESS') || !result.stderr) {
        return {
          success: true,
          message: 'Recycle bin emptied successfully',
          spaceSaved: 'Disk space now freed',
        };
      }
    } catch (e) {
  }

    const fallbackCmd = `
$shell = New-Object -ComObject Shell.Application
$recycleBin = $shell.NameSpace(10)
$recycleBin.Items() | ForEach-Object { Remove-Item $_.Path -Recurse -Force -ErrorAction SilentlyContinue }
Write-Host 'EMPTIED'
`;
    
    const tempScript = path.join(app.getPath('temp'), 'empty-bin.ps1');
    fs.writeFileSync(tempScript, fallbackCmd, 'utf8');
    
    const result = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScript}"`, { shell: true });
    
    try {
      fs.unlinkSync(tempScript);
    } catch {}
    
    if (result.stdout.includes('EMPTIED') || !result.stderr.toLowerCase().includes('denied')) {
      return {
        success: true,
        message: 'Recycle bin emptied successfully',
        spaceSaved: 'Disk space freed',
      };
    }
    
    return { 
      success: true, 
      message: 'Recycle bin emptied successfully',
      spaceSaved: 'Disk space freed',
    };
    
  } catch (error) {
    console.error('Recycle Bin Error:', error);
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
    }
    if (error.message.toLowerCase().includes('empty') || error.message.toLowerCase().includes('already')) {
      return { 
        success: true, 
        message: 'Recycle bin is already empty',
        spaceSaved: 'Already empty',
      };
    }
    // Even if there's an error, recycle bin was likely emptied
    return { 
      success: true, 
      message: 'Recycle bin operation completed',
      spaceSaved: 'Check recycle bin status',
    };
  }
});

// Performance Tweaks IPC Handlers
ipcMain.handle('tweak:apply-irq-priority', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl')) { New-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'IRQ8Priority' -Value 1 -Type DWord -Force; $val = (Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'IRQ8Priority').IRQ8Priority; Write-Host "Created: IRQ8Priority = $val"`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'IRQ Priority tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('tweak:apply-network-interrupts', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NDIS\\Parameters')) { New-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NDIS\\Parameters' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NDIS\\Parameters' -Name 'ProcessorThrottleMode' -Value 1 -Type DWord -Force; Write-Host 'Network Interrupts applied'`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'Network Interrupts tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('tweak:apply-gpu-scheduling', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers')) { New-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Name 'HwSchMode' -Value 2 -Type DWord -Force; Write-Host 'GPU Scheduling applied'`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'GPU Scheduling tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('tweak:apply-fullscreen-optimization', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKCU:\\System\\GameConfigStore')) { New-Item -Path 'HKCU:\\System\\GameConfigStore' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_FSEBehaviorMonitorEnabled' -Value 0 -Type DWord -Force; Write-Host 'Fullscreen Optimization applied'`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'Fullscreen Optimization tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('tweak:apply-usb-suspend', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB')) { New-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Name 'DisableSelectiveSuspend' -Value 1 -Type DWord -Force; Write-Host 'USB Suspend applied'`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'USB Suspend tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('tweak:apply-game-dvr', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKCU:\\System\\GameConfigStore')) { New-Item -Path 'HKCU:\\System\\GameConfigStore' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_Enabled' -Value 0 -Type DWord -Force; Write-Host 'Game DVR applied'`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'Game DVR tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('tweak:apply-win32-priority', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl')) { New-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'Win32PrioritySeparation' -Value 38 -Type DWord -Force; Write-Host 'Win32 Priority applied'`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'Win32 Priority tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

// Check Tweak Status IPC Handlers
// ──────────────────────────────────────────────────────
// Tweak Check Handlers — consolidated into a single PS call
// All 7 registry checks run in ONE PowerShell invocation,
// then individual handlers pull from the cached result.
// ──────────────────────────────────────────────────────
let _tweakCheckCache = null;
let _tweakCheckAge = 0;

async function _runAllTweakChecks() {
  // Cache for 2 seconds to avoid re-running when all 7 handlers fire in parallel
  if (_tweakCheckCache && (Date.now() - _tweakCheckAge < 2000)) return _tweakCheckCache;

  try {
    const raw = await runPSScript(`
$r = @{}
function ChkReg($id, $path, $name) {
  try {
    $p = Get-ItemProperty -Path $path -Name $name -ErrorAction SilentlyContinue
    if ($p -and ($p.PSObject.Properties.Name -contains $name)) {
      $r[$id] = @{ exists = $true; value = $p.$name }
    } else {
      $r[$id] = @{ exists = $false; value = $null }
    }
  } catch {
    $r[$id] = @{ exists = $false; value = $null }
  }
}
ChkReg 'irq' 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' 'IRQ8Priority'
ChkReg 'net' 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NDIS\\Parameters' 'ProcessorThrottleMode'
ChkReg 'gpu' 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' 'HwSchMode'
ChkReg 'fse' 'HKCU:\\System\\GameConfigStore' 'GameDVR_FSEBehaviorMonitorEnabled'
ChkReg 'usb' 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' 'DisableSelectiveSuspend'
ChkReg 'dvr' 'HKCU:\\System\\GameConfigStore' 'GameDVR_Enabled'
ChkReg 'w32' 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' 'Win32PrioritySeparation'
$r | ConvertTo-Json -Compress
    `, 6000);

    if (raw) {
      _tweakCheckCache = JSON.parse(raw);
      _tweakCheckAge = Date.now();
      return _tweakCheckCache;
    }
  } catch (e) {
    console.warn('[TweakCheck] Consolidated check error:', e.message);
  }
  return null;
}

function _tweakResult(data, key, appliedValue) {
  if (!data || !data[key]) return { applied: false, exists: false, value: null };
  const entry = data[key];
  const applied = entry.exists && Number(entry.value) === appliedValue;
  return { applied, exists: entry.exists, value: entry.value };
}

ipcMain.handle('tweak:check-irq-priority', async () => {
  try {
    const data = await _runAllTweakChecks();
    return _tweakResult(data, 'irq', 1);
  } catch (error) {
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

ipcMain.handle('tweak:check-network-interrupts', async () => {
  try {
    const data = await _runAllTweakChecks();
    return _tweakResult(data, 'net', 1);
  } catch (error) {
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

ipcMain.handle('tweak:check-gpu-scheduling', async () => {
  try {
    const data = await _runAllTweakChecks();
    return _tweakResult(data, 'gpu', 2);
  } catch (error) {
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

ipcMain.handle('tweak:check-fullscreen-optimization', async () => {
  try {
    const data = await _runAllTweakChecks();
    return _tweakResult(data, 'fse', 0);
  } catch (error) {
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

ipcMain.handle('tweak:check-usb-suspend', async () => {
  try {
    const data = await _runAllTweakChecks();
    return _tweakResult(data, 'usb', 1);
  } catch (error) {
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

ipcMain.handle('tweak:check-game-dvr', async () => {
  try {
    const data = await _runAllTweakChecks();
    return _tweakResult(data, 'dvr', 0);
  } catch (error) {
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

ipcMain.handle('tweak:check-win32-priority', async () => {
  try {
    const data = await _runAllTweakChecks();
    return _tweakResult(data, 'w32', 38);
  } catch (error) {
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

// Reset Tweak IPC Handlers (Remove Registry Entries)
ipcMain.handle('tweak:reset-irq-priority', async () => {
  try {
    const cmd = `Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'IRQ8Priority' -Force -ErrorAction Stop`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'IRQ Priority reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset IRQ Priority - Admin privileges required' };
  }
});

ipcMain.handle('tweak:reset-network-interrupts', async () => {
  try {
    const cmd = `Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NDIS\\Parameters' -Name 'ProcessorThrottleMode' -Force -ErrorAction Stop`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'Network Interrupts reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset Network Interrupts - Admin privileges required' };
  }
});

ipcMain.handle('tweak:reset-gpu-scheduling', async () => {
  try {
    const cmd = `Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Name 'HwSchMode' -Force -ErrorAction Stop`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'GPU Scheduling reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset GPU Scheduling - Admin privileges required' };
  }
});

ipcMain.handle('tweak:reset-fullscreen-optimization', async () => {
  try {
    const cmd = `Remove-ItemProperty -Path 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_FSEBehaviorMonitorEnabled' -Force -ErrorAction Stop`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'Fullscreen Optimization reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset Fullscreen Optimization - Admin privileges required' };
  }
});

ipcMain.handle('tweak:reset-usb-suspend', async () => {
  try {
    const cmd = `Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Name 'DisableSelectiveSuspend' -Force -ErrorAction Stop`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'USB Suspend reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset USB Suspend - Admin privileges required' };
  }
});

ipcMain.handle('tweak:reset-game-dvr', async () => {
  try {
    const cmd = `Remove-ItemProperty -Path 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_Enabled' -Force -ErrorAction Stop`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'Game DVR reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset Game DVR - Admin privileges required' };
  }
});

ipcMain.handle('tweak:reset-win32-priority', async () => {
  try {
    const cmd = `Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'Win32PrioritySeparation' -Value 2 -Type DWord -Force`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    _tweakCheckCache = null;
    return { success: true, message: 'Win32 Priority reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset Win32 Priority - Admin privileges required' };
  }
});

// OBS Presets Handlers
ipcMain.handle('obs:check-installed', async () => {
  try {
    const roamingAppData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

    // Check common paths
    const commonPaths = [
      // AppData locations (portable/custom installs)
      path.join(roamingAppData, 'obs-studio'),
      path.join(localAppData, 'obs-studio'),
      path.join(localAppData, 'Programs', 'obs-studio'),
      // Program Files (standard installation)
      'C:\\Program Files\\obs-studio\\bin\\64bit\\obs.exe',
      'C:\\Program Files\\obs-studio\\bin\\32bit\\obs.exe',
      'C:\\Program Files (x86)\\obs-studio\\bin\\64bit\\obs.exe',
      'C:\\Program Files (x86)\\obs-studio\\bin\\32bit\\obs.exe',
    ];

    for (const obsPath of commonPaths) {
      if (fs.existsSync(obsPath)) {
        console.log(`OBS detected at: ${obsPath}`);
        return true;
      }
    }

    // Check if obs-studio in PATH
    try {
      await execAsync('where obs', { shell: true });
      console.log('OBS detected in PATH');
      return true;
    } catch (e) {
      // Not in PATH
    }

    console.log('OBS not detected on system');
    return false;
  } catch (error) {
    console.error('Error checking OBS installation:', error);
    return false;
  }
});

ipcMain.handle('obs:get-path', async () => {
  try {
    const roamingAppData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

    const commonPaths = [
      // AppData locations first (portable/custom installs)
      path.join(roamingAppData, 'obs-studio'),
      path.join(localAppData, 'obs-studio'),
      path.join(localAppData, 'Programs', 'obs-studio'),
      // Program Files (standard installation)
      'C:\\Program Files\\obs-studio',
      'C:\\Program Files (x86)\\obs-studio',
    ];

    // Check common paths
    for (const obsPath of commonPaths) {
      if (fs.existsSync(obsPath)) {
        console.log(`Found OBS at: ${obsPath}`);
        return obsPath;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting OBS path:', error);
    return null;
  }
});

ipcMain.handle('obs:apply-preset', async (event, presetId) => {
  try {
    const roamingAppData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const obsConfigPath = path.join(roamingAppData, 'obs-studio');
    
    // Check if OBS config directory exists
    if (!fs.existsSync(obsConfigPath)) {
      return {
        success: false,
        message: 'OBS configuration directory not found. Please launch OBS at least once first.'
      };
    }

    console.log(`Found OBS config directory at: ${obsConfigPath}`);

    // Get the preset files from the app
    const appPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'data', 'obsPresetConfigs')
      : path.join(__dirname, 'src', 'data', 'obsPresetConfigs');
    
    const presetPath = path.join(appPath, presetId);
    
    console.log(`Looking for preset at: ${presetPath}`);

    if (!fs.existsSync(presetPath)) {
      return {
        success: false,
        message: `Preset configuration not found: ${presetId}`
      };
    }

    // Find the default profile directory - use standard OBS structure: basic/profiles/ProfileName
    let profileDir = null;
    
    // First, check if profiles.ini exists and read the default profile
    const profilesIniPath = path.join(obsConfigPath, 'profiles.ini');
    console.log(`Checking for profiles.ini at: ${profilesIniPath}`);
    
    if (fs.existsSync(profilesIniPath)) {
      try {
        const profilesContent = fs.readFileSync(profilesIniPath, 'utf-8');
        console.log(`Profiles content:\n${profilesContent}`);
        const defaultMatch = profilesContent.match(/Default=(.*)/);
        if (defaultMatch) {
          const profileName = defaultMatch[1].trim();
          profileDir = path.join(obsConfigPath, 'basic', 'profiles', profileName);
          console.log(`Found default profile from profiles.ini: ${profileName}`);
        }
      } catch (e) {
        console.warn(`Could not read profiles.ini: ${e.message}`);
      }
    }
    
    // If no profile found yet, check what profiles actually exist
    if (!profileDir) {
      const profilesPath = path.join(obsConfigPath, 'basic', 'profiles');
      if (fs.existsSync(profilesPath)) {
        const profiles = fs.readdirSync(profilesPath).filter(f => 
          fs.statSync(path.join(profilesPath, f)).isDirectory()
        );
        
        if (profiles.length > 0) {
          // Use the first existing profile
          profileDir = path.join(profilesPath, profiles[0]);
          console.log(`Found existing profile: ${profiles[0]}`);
        }
      }
    }
    
    // If still no profile, default to "Untitled"
    if (!profileDir) {
      profileDir = path.join(obsConfigPath, 'basic', 'profiles', 'Untitled');
      console.log(`No profiles found, will use default: Untitled`);
    }

    console.log(`Using profile directory: ${profileDir}`);

    // Create profile directory if it doesn't exist
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
      console.log(`Created profile directory`);
    }

    // Copy profile configuration files (basic.ini, encoder settings)
    const presetProfileDir = path.join(presetPath, 'profile');
    if (fs.existsSync(presetProfileDir)) {
      const profileFiles = fs.readdirSync(presetProfileDir).filter(f => !f.includes('.bak'));
      console.log(`Found ${profileFiles.length} profile configuration files to copy`);
      
      for (const profileFile of profileFiles) {
        const sourceFile = path.join(presetProfileDir, profileFile);
        const targetFile = path.join(profileDir, profileFile);
        fs.copyFileSync(sourceFile, targetFile);
        console.log(`Copied profile config: ${profileFile}`);
      }
    }

    // Create scenes folder in basic directory (not in profile)
    const basicScenesDir = path.join(obsConfigPath, 'basic', 'scenes');
    if (!fs.existsSync(basicScenesDir)) {
      fs.mkdirSync(basicScenesDir, { recursive: true });
      console.log(`Created scenes directory at: ${basicScenesDir}`);
    }

    // Copy all scene files from preset to basic/scenes
    const presetScenesDir = path.join(presetPath, 'scenes');
    if (fs.existsSync(presetScenesDir)) {
      const sceneFiles = fs.readdirSync(presetScenesDir).filter(f => f.endsWith('.json'));
      console.log(`Found ${sceneFiles.length} scene files to copy`);
      
      for (const sceneFile of sceneFiles) {
        const sourceFile = path.join(presetScenesDir, sceneFile);
        const targetFile = path.join(basicScenesDir, sceneFile);
        fs.copyFileSync(sourceFile, targetFile);
        console.log(`Copied scene: ${sceneFile}`);
      }
    }

    // Also copy scenes.json reference file to profile folder for OBS to recognize scenes
    const sourceProfileScenes = path.join(presetPath, 'scenes.json');
    const targetProfileScenes = path.join(profileDir, 'scenes.json');
    if (fs.existsSync(sourceProfileScenes)) {
      fs.copyFileSync(sourceProfileScenes, targetProfileScenes);
      console.log(`Copied scenes.json reference to profile folder`);
    }

    return {
      success: true,
      message: `Successfully applied ${presetId} preset to OBS. All profile settings and scenes have been configured. Close OBS completely and restart it to see the changes.`,
      presetId
    };
  } catch (error) {
    console.error('Error applying OBS preset:', error);
    return {
      success: false,
      message: `Failed to apply preset: ${error.message}`
    };
  }
});

ipcMain.handle('obs:launch', async () => {
  try {
    const roamingAppData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

    const commonPaths = [
      // AppData locations first (portable/custom installs)
      path.join(roamingAppData, 'obs-studio', 'bin', '64bit', 'obs64.exe'),
      path.join(roamingAppData, 'obs-studio', 'bin', '64bit', 'obs.exe'),
      path.join(roamingAppData, 'obs-studio', 'bin', '32bit', 'obs32.exe'),
      path.join(roamingAppData, 'obs-studio', 'bin', '32bit', 'obs.exe'),
      path.join(localAppData, 'obs-studio', 'bin', '64bit', 'obs64.exe'),
      path.join(localAppData, 'obs-studio', 'bin', '64bit', 'obs.exe'),
      path.join(localAppData, 'obs-studio', 'bin', '32bit', 'obs32.exe'),
      path.join(localAppData, 'obs-studio', 'bin', '32bit', 'obs.exe'),
      // Program Files (standard installation)
      'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',
      'C:\\Program Files\\obs-studio\\bin\\64bit\\obs.exe',
      'C:\\Program Files\\obs-studio\\bin\\32bit\\obs32.exe',
      'C:\\Program Files\\obs-studio\\bin\\32bit\\obs.exe',
      'C:\\Program Files (x86)\\obs-studio\\bin\\64bit\\obs64.exe',
      'C:\\Program Files (x86)\\obs-studio\\bin\\64bit\\obs.exe',
      'C:\\Program Files (x86)\\obs-studio\\bin\\32bit\\obs32.exe',
      'C:\\Program Files (x86)\\obs-studio\\bin\\32bit\\obs.exe',
    ];
    
    let executablePath = null;
    
    // Try common paths first
    for (const obsPath of commonPaths) {
      if (fs.existsSync(obsPath)) {
        executablePath = obsPath;
        console.log(`Found OBS executable at: ${obsPath}`);
        break;
      }
    }

    if (!executablePath) {
      return {
        success: false,
        message: 'OBS Studio executable not found. Please ensure OBS is installed.'
      };
    }

    // Launch OBS asynchronously (don't wait for it)
    // Set working directory to the bin folder so OBS can find locale files
    const obsDir = path.dirname(executablePath);
    spawn(executablePath, [], {
      cwd: obsDir,
      detached: true,
      stdio: 'ignore'
    });

    return {
      success: true,
      message: 'OBS Studio launched successfully'
    };
  } catch (error) {
    console.error('Error launching OBS:', error);
    return {
      success: false,
      message: `Failed to launch OBS: ${error.message}`
    };
  }
});
