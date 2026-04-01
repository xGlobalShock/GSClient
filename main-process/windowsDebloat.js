'use strict';

const { ipcMain } = require('electron');
const { execAsync } = require('./utils');
const windowManager = require('./windowManager');

/* ─── Module state ──────────────────────────────────────────────────────── */
let _isElevated = false;

/* ─── GS Apps Catalog ───────────────────────────────────────────────────── */
const GS_APPS_CATALOG = [
  // 3D/Mixed Reality
  { name: '3D Viewer', pkg: ['Microsoft.Microsoft3DViewer'], description: 'View 3D models and animations', canBeReinstalled: true },
  { name: 'Mixed Reality Portal', pkg: ['Microsoft.MixedReality.Portal'], description: 'Portal for Windows Mixed Reality experiences', canBeReinstalled: true },

  // Bing/Search
  { name: 'Bing Search', pkg: ['Microsoft.BingSearch'], description: 'Bing search integration for Windows', canBeReinstalled: true },
  { name: 'Microsoft News', pkg: ['Microsoft.BingNews'], description: 'Microsoft News app', canBeReinstalled: true },
  { name: 'MSN Weather', pkg: ['Microsoft.BingWeather'], description: 'Weather forecasts and information', canBeReinstalled: true },

  // Camera/Media
  { name: 'Camera', pkg: ['Microsoft.WindowsCamera'], description: 'Windows Camera app', canBeReinstalled: true },
  { name: 'Clipchamp', pkg: ['Clipchamp.Clipchamp'], description: 'Video editor app', canBeReinstalled: true },

  // System Utilities
  { name: 'Alarms & Clock', pkg: ['Microsoft.WindowsAlarms'], description: 'Clock, alarms, timer, and stopwatch app', canBeReinstalled: true },
  { name: 'Cortana', pkg: ['Microsoft.549981C3F5F10'], description: "Microsoft's virtual assistant", canBeReinstalled: false },
  { name: 'Get Help', pkg: ['Microsoft.GetHelp'], description: 'Microsoft support app', canBeReinstalled: true },
  { name: 'Calculator', pkg: ['Microsoft.WindowsCalculator'], description: 'Calculator app with standard, scientific, and programmer modes', canBeReinstalled: true },

  // Development
  { name: 'Dev Home', pkg: ['Microsoft.Windows.DevHome'], description: 'Development environment for Windows', canBeReinstalled: true },

  // Communication
  { name: 'Microsoft Family Safety', pkg: ['MicrosoftCorporationII.MicrosoftFamily'], description: 'Family safety and screen time management', canBeReinstalled: true },
  { name: 'Mail and Calendar', pkg: ['microsoft.windowscommunicationsapps'], description: 'Microsoft Mail and Calendar apps', canBeReinstalled: true },
  { name: 'Skype', pkg: ['Microsoft.SkypeApp'], description: 'Video calling and messaging app', canBeReinstalled: false },
  { name: 'Microsoft Teams', pkg: ['MSTeams'], description: 'Team collaboration and communication app', canBeReinstalled: true },

  // System Tools
  { name: 'Feedback Hub', pkg: ['Microsoft.WindowsFeedbackHub'], description: 'App for sending feedback to Microsoft', canBeReinstalled: true },
  { name: 'Maps', pkg: ['Microsoft.WindowsMaps'], description: 'Microsoft Maps app', canBeReinstalled: true },
  { name: 'Terminal', pkg: ['Microsoft.WindowsTerminal'], description: 'Modern terminal application for Windows', canBeReinstalled: true },

  // Office & Productivity
  { name: 'MS 365 Copilot (Office Hub)', pkg: ['Microsoft.MicrosoftOfficeHub'], description: 'Microsoft 365 Copilot (formerly known as Office hub)', canBeReinstalled: true },
  { name: 'Outlook for Windows', pkg: ['Microsoft.OutlookForWindows'], description: 'Reimagined Outlook app for Windows', canBeReinstalled: true },

  // Graphics & Images
  { name: 'Paint 3D', pkg: ['Microsoft.MSPaint'], description: '3D modeling and editing app', canBeReinstalled: false },
  { name: 'Paint', pkg: ['Microsoft.Paint'], description: 'Traditional image editing app', canBeReinstalled: true },
  { name: 'Photos', pkg: ['Microsoft.Windows.Photos'], description: 'Photo viewing and editing app', canBeReinstalled: true },
  { name: 'Snipping Tool', pkg: ['Microsoft.ScreenSketch'], description: 'Screen capture and annotation tool', canBeReinstalled: true },

  // Social & People
  { name: 'People', pkg: ['Microsoft.People'], description: 'Contact management app', canBeReinstalled: true },

  // Automation
  { name: 'Power Automate', pkg: ['Microsoft.PowerAutomateDesktop'], description: 'Desktop automation tool', canBeReinstalled: true },

  // Support Tools
  { name: 'Quick Assist', pkg: ['MicrosoftCorporationII.QuickAssist'], description: 'Remote assistance tool', canBeReinstalled: true },

  // Games & Entertainment
  { name: 'Solitaire Collection', pkg: ['Microsoft.MicrosoftSolitaireCollection'], description: 'Microsoft Solitaire Collection games', canBeReinstalled: true },
  { name: 'Xbox', pkg: ['Microsoft.GamingApp', 'Microsoft.XboxApp'], description: 'Xbox App for Windows', canBeReinstalled: true },
  { name: 'Xbox Identity Provider', pkg: ['Microsoft.XboxIdentityProvider'], description: 'Authentication service for Xbox Live and related Microsoft gaming services', canBeReinstalled: true },
  { name: 'Xbox Game Bar Plugin', pkg: ['Microsoft.XboxGameOverlay'], description: 'Extension component for Xbox Game Bar providing additional functionality', canBeReinstalled: true },
  { name: 'Xbox Live In-Game Experience', pkg: ['Microsoft.Xbox.TCUI'], description: 'Core component for Xbox Live services within games', canBeReinstalled: true },
  { name: 'Xbox Game Bar', pkg: ['Microsoft.XboxGamingOverlay'], description: 'Gaming overlay with screen capture, performance monitoring, and social features', canBeReinstalled: true },

  // Windows Store
  { name: 'Microsoft Store', pkg: ['Microsoft.WindowsStore'], description: 'App store for Windows', canBeReinstalled: true },

  // Media Players
  { name: 'Media Player', pkg: ['Microsoft.ZuneMusic'], description: 'Music player app', canBeReinstalled: true },
  { name: 'Movies & TV', pkg: ['Microsoft.ZuneVideo'], description: 'Video player app', canBeReinstalled: true },
  { name: 'Sound Recorder', pkg: ['Microsoft.WindowsSoundRecorder'], description: 'Audio recording app', canBeReinstalled: true },

  // Productivity Tools
  { name: 'Sticky Notes', pkg: ['Microsoft.MicrosoftStickyNotes'], description: 'Note-taking app', canBeReinstalled: true },
  { name: 'Tips', pkg: ['Microsoft.Getstarted'], description: 'Windows tutorial app', canBeReinstalled: false },
  { name: 'To Do: Lists, Tasks & Reminders', pkg: ['Microsoft.Todos'], description: 'Task management app', canBeReinstalled: true },
  { name: 'Notepad', pkg: ['Microsoft.WindowsNotepad'], description: 'Text editing app', canBeReinstalled: true },

  // Phone Integration
  { name: 'Phone Link', pkg: ['Microsoft.YourPhone'], description: 'Connect your Android or iOS device to Windows', canBeReinstalled: true },

  // AI & Copilot
  { name: 'Copilot', pkg: ['Microsoft.Copilot', 'Microsoft.Windows.Ai.Copilot.Provider', 'Microsoft.Copilot_8wekyb3d8bbwe'], description: 'AI assistant for Windows', canBeReinstalled: true },

  // Special Items
  { name: 'Microsoft Edge', pkg: ['Microsoft.MicrosoftEdge.Stable', 'Microsoft.MicrosoftEdge'], description: "Microsoft's web browser", canBeReinstalled: true, isEdge: true },
  { name: 'OneDrive', pkg: ['Microsoft.OneDriveSync'], description: "Microsoft's cloud storage service", canBeReinstalled: true, isOneDrive: true },
  { name: 'OneNote', pkg: ['Microsoft.Office.OneNote'], description: 'Microsoft note-taking app', canBeReinstalled: true }
];

/* ─── GS Capabilities Catalog ───────────────────────────────────────────── */
const GS_CAPABILITIES = [
  { match: 'Browser.InternetExplorer', label: 'Internet Explorer', description: 'Legacy web browser', canBeReinstalled: false },
  { match: 'Microsoft.Windows.PowerShell.ISE', label: 'PowerShell ISE', description: 'PowerShell Integrated Scripting Environment', canBeReinstalled: true },
  { match: 'App.Support.QuickAssist', label: 'Quick Assist (Legacy)', description: 'Remote assistance app', canBeReinstalled: false },
  { match: 'App.StepsRecorder', label: 'Steps Recorder', description: 'Screen recording tool', canBeReinstalled: true },
  { match: 'Media.WindowsMediaPlayer', label: 'Windows Media Player', description: 'Classic media player', canBeReinstalled: true },
  { match: 'Microsoft.Windows.WordPad', label: 'WordPad', description: 'Rich text editor', canBeReinstalled: false },
  { match: 'Microsoft.Windows.Notepad', label: 'Notepad (Legacy)', description: 'Simple text editor', canBeReinstalled: false },
  { match: 'Microsoft.Windows.MSPaint', label: 'Paint (Legacy)', description: 'Classic Paint app', canBeReinstalled: false },
  { match: 'OpenSSH.Client', label: 'OpenSSH Client', description: 'Secure Shell client for remote connections', canBeReinstalled: true },
  { match: 'OpenSSH.Server', label: 'OpenSSH Server', description: 'Secure Shell server for remote connections', canBeReinstalled: true }
];

/* ─── GS Optional Features Catalog ──────────────────────────────────────── */
const GS_OPTIONAL_FEATURES = [
  { key: 'Microsoft-Windows-Subsystem-Linux', label: 'Subsystem for Linux', description: 'Allows running Linux binary executables natively on Windows', canBeReinstalled: true },
  { key: 'Microsoft-Hyper-V-Hypervisor', label: 'Windows Hypervisor Platform', description: 'Core virtualization platform without Hyper-V management tools', canBeReinstalled: true },
  { key: 'Microsoft-Hyper-V-All', label: 'Hyper-V', description: 'Virtualization platform for running multiple operating systems', canBeReinstalled: true },
  { key: 'Microsoft-Hyper-V-Tools-All', label: 'Hyper-V Management Tools', description: 'Tools for managing Hyper-V virtual machines', canBeReinstalled: true },
  { key: 'NetFx3', label: '.NET Framework 3.5', description: 'Legacy .NET Framework for older applications', canBeReinstalled: true },
  { key: 'Containers-DisposableClientVM', label: 'Windows Sandbox', description: 'Isolated desktop environment for running applications', canBeReinstalled: true },
  { key: 'Recall', label: 'Recall', description: 'Windows 11 feature that records user activity', canBeReinstalled: true }
];

/* ─── Lookup helpers ────────────────────────────────────────────────────── */

function matchCapability(rawName) {
  if (!rawName) return null;
  const normalized = rawName.toString();
  const item = GS_CAPABILITIES.find(c => normalized.toLowerCase().startsWith(c.match.toLowerCase()));
  return item ? { label: item.label, description: item.description, canBeReinstalled: item.canBeReinstalled } : null;
}

function matchOptionalFeature(rawName) {
  if (!rawName) return null;
  const entry = GS_OPTIONAL_FEATURES.find(f => f.key.toLowerCase() === rawName.toString().toLowerCase());
  return entry ? { label: entry.label, description: entry.description, canBeReinstalled: entry.canBeReinstalled } : null;
}

/**
 * Extract the AppxPackage Name from a PackageFamilyName.
 * PackageFamilyName = "Microsoft.GetHelp_8wekyb3d8bbwe"  →  Name = "Microsoft.GetHelp"
 * If there's no underscore, return it as-is (it's likely already a Name).
 */
function extractPackageName(packageId) {
  if (!packageId) return '';
  const idx = packageId.indexOf('_');
  return idx > 0 ? packageId.substring(0, idx) : packageId;
}

/* ─── PowerShell runner ─────────────────────────────────────────────────── */

async function runPS(script, timeoutMs = 120000) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const cmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`;
  const { stdout } = await execAsync(cmd, {
    timeout: timeoutMs,
    windowsHide: true,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });
  return stdout.trim();
}

function sendProgress(msg, current, total) {
  const win = windowManager.getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('wdebloat:progress', { msg, current, total });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   APPS (AppxPackages)
   ═══════════════════════════════════════════════════════════════════════════ */

async function handleListApps() {
  try {
    const script = `
$pkgs = Get-AppxPackage -AllUsers | Select-Object Name, PackageFamilyName, Version, NonRemovable | Sort-Object Name
$pkgs | ConvertTo-Json -Compress -Depth 2
`;
    const raw = await runPS(script);
    let packages = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        packages = Array.isArray(parsed) ? parsed : [parsed];
      } catch { packages = []; }
    }

    // Merge with catalog for friendly display names
    const items = packages.map(pkg => {
      const packageFamily = (pkg.PackageFamilyName || '').toLowerCase();
      const lowerName = (pkg.Name || '').toLowerCase();
      const catalogEntry = GS_APPS_CATALOG.find(c =>
        c.pkg.some(p => {
          const pLower = p.toLowerCase();
          return packageFamily.startsWith(pLower) || lowerName.startsWith(pLower) || lowerName === pLower;
        })
      );

      return {
        id: pkg.Name || pkg.PackageFamilyName,
        name: catalogEntry ? catalogEntry.name : pkg.Name,
        description: catalogEntry ? catalogEntry.description : '',
        packageFamilyName: pkg.PackageFamilyName || '',
        version: pkg.Version || '',
        installed: true,
        nonRemovable: (catalogEntry && catalogEntry.isEdge) ? false : !!pkg.NonRemovable,
        isCatalog: !!catalogEntry,
        canBeReinstalled: catalogEntry ? catalogEntry.canBeReinstalled : true,
        isEdge: catalogEntry ? !!catalogEntry.isEdge : false,
        isOneDrive: catalogEntry ? !!catalogEntry.isOneDrive : false,
      };
    });

    // Deduplicate installed packages that map to the same catalog entry (e.g. Edge reports two packages)
    const seenCatalogNames = new Set();
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].isCatalog) {
        if (seenCatalogNames.has(items[i].name)) {
          items.splice(i, 1);
        } else {
          seenCatalogNames.add(items[i].name);
        }
      }
    }

    // Add catalog entries that are NOT installed (so user can reinstall them)
    for (const entry of GS_APPS_CATALOG) {
      const alreadyListed = items.some(i => {
        const idLower = (i.id || '').toLowerCase();
        const pfnLower = (i.packageFamilyName || '').toLowerCase();
        return entry.pkg.some(p => {
          const pLower = p.toLowerCase();
          return idLower.startsWith(pLower) || pfnLower.startsWith(pLower);
        });
      });
      if (!alreadyListed) {
        items.push({
          id: entry.pkg[0],
          name: entry.name,
          description: entry.description,
          packageFamilyName: '',
          version: '',
          installed: false,
          nonRemovable: false,
          isCatalog: true,
          canBeReinstalled: entry.canBeReinstalled,
          isEdge: !!entry.isEdge,
          isOneDrive: !!entry.isOneDrive,
        });
      }
    }

    // Keep only catalog-managed entries for the Windows Apps tab
    const catalogItems = items.filter(i => i.isCatalog);
    catalogItems.sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, items: catalogItems };
  } catch (err) {
    return { success: false, error: err.message, items: [] };
  }
}

/* ─── Special removal: Microsoft Edge ───────────────────────────────────── */
const removeEdgeScript = `
try {
  $stop = "MicrosoftEdgeUpdate", "msedge", "msedgewebview2"
  $stop | ForEach-Object { Stop-Process -Name $_ -Force -ErrorAction SilentlyContinue }

  $edgePath = "$env:SystemRoot\\SystemApps\\Microsoft.MicrosoftEdge_8wekyb3d8bbwe"
  New-Item -Path $edgePath -ItemType Directory -ErrorAction SilentlyContinue | Out-Null
  New-Item -Path $edgePath -ItemType File -Name "MicrosoftEdge.exe" -ErrorAction SilentlyContinue | Out-Null

  $uninstallKeys = Get-ChildItem "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
  foreach ($key in $uninstallKeys) {
      if ((Get-ItemProperty $key.PSPath -ErrorAction SilentlyContinue).DisplayName -like "*Microsoft Edge*") {
          $uninstallString = (Get-ItemProperty $key.PSPath).UninstallString
          if ($uninstallString) {
              Stop-Process -Name "msedge" -Force -ErrorAction SilentlyContinue
              if ($uninstallString -like "*msiexec*") { Start-Process cmd.exe "/c $uninstallString /quiet" -WindowStyle Hidden -Wait | Out-Null }
              else { Start-Process cmd.exe "/c $uninstallString --force-uninstall --silent" -WindowStyle Hidden -Wait | Out-Null }
          }
      }
  }
  Get-AppxPackage -AllUsers Microsoft.MicrosoftEdge.Stable | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue | Out-Null
  Remove-Item -Recurse -Force $edgePath -ErrorAction SilentlyContinue | Out-Null

  $edgeupdate = @()
  $searchPaths = @("LocalApplicationData", "ProgramFilesX86", "ProgramFiles")
  foreach ($pathType in $searchPaths) {
      $folder = [Environment]::GetFolderPath($pathType)
      $foundFiles = Get-ChildItem "$folder\\Microsoft\\EdgeUpdate\\*.*.*.*\\MicrosoftEdgeUpdate.exe" -Recurse -ErrorAction SilentlyContinue
      if ($foundFiles) { $edgeupdate += $foundFiles.FullName }
  }
  foreach ($path in $edgeupdate) {
      if (Test-Path $path) { Start-Process $path "/uninstall /silent" -WindowStyle Hidden -Wait | Out-Null }
  }
  [PSCustomObject]@{ success=$true; removed=$true } | ConvertTo-Json -Compress
} catch {
  [PSCustomObject]@{ success=$false; error=$_.Exception.Message } | ConvertTo-Json -Compress
}
`;

/* ─── Special removal: OneDrive ─────────────────────────────────────────── */
const removeOneDriveScript = `
try {
  Stop-Process -Name "*OneDrive*" -Force -ErrorAction SilentlyContinue | Out-Null
  Get-AppxPackage -AllUsers *OneDriveSync* | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue | Out-Null

  $hklmUninstallKey = "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OneDriveSetup.exe"
  $uninstallString = reg.exe query $hklmUninstallKey /v UninstallString 2>$null
  if ($LASTEXITCODE -eq 0 -and $uninstallString -match "REG_SZ\\s+(.+)") {
      $cmd = $matches[1].Trim()
      if ($cmd -match '^"([^"]+)"(.*)') {
          Start-Process -FilePath $matches[1] -ArgumentList $matches[2].Trim() -WindowStyle Hidden -Wait | Out-Null
      } else {
          cmd.exe /c $cmd 2>&1 | Out-Null
      }
  } else {
      $users = Get-ChildItem "HKU:\\" | Where-Object { $_.Name -match 'S-1-5-21-[0-9]+-[0-9]+-[0-9]+-[0-9]+$' }
      foreach ($u in $users) {
          $hkuKey = "HKU\\$($u.PSChildName)\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OneDriveSetup.exe"
          $ustring = reg.exe query $hkuKey /v UninstallString 2>$null
          if ($LASTEXITCODE -eq 0 -and $ustring -match "REG_SZ\\s+(.+)") {
              $cmd = $matches[1].Trim()
              if ($cmd -match '^"([^"]+)"(.*)') {
                  Start-Process -FilePath $matches[1] -ArgumentList $matches[2].Trim() -WindowStyle Hidden -Wait | Out-Null
              } else { cmd.exe /c $cmd 2>&1 | Out-Null }
          }
      }
  }

  Remove-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\OneDrive" -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -Path "$env:USERPROFILE\\AppData\\Local\\Microsoft\\OneDrive" -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -Path "$env:PROGRAMDATA\\Microsoft OneDrive" -Recurse -Force -ErrorAction SilentlyContinue

  [PSCustomObject]@{ success=$true; removed=$true } | ConvertTo-Json -Compress
} catch {
  [PSCustomObject]@{ success=$false; error=$_.Exception.Message } | ConvertTo-Json -Compress
}
`;

/* ─── Remove app ────────────────────────────────────────────────────────── */

async function handleRemoveApp(_event, packageId) {
  if (!_isElevated) return { success: false, error: 'Administrator privileges required.' };

  // Extract the clean package Name from PackageFamilyName (strip _<hash>)
  const pkgName = extractPackageName(packageId);
  const safe = pkgName.replace(/'/g, "''");

  // Check catalog for special handling
  const catalogEntry = GS_APPS_CATALOG.find(c =>
    c.pkg.some(p => pkgName.toLowerCase().startsWith(p.toLowerCase()) || p.toLowerCase() === pkgName.toLowerCase())
  );

  let script = '';
  if (catalogEntry && catalogEntry.isEdge) {
    script = removeEdgeScript;
  } else if (catalogEntry && catalogEntry.isOneDrive) {
    script = removeOneDriveScript;
  } else {
    script = `
try {
  $pkg = Get-AppxPackage -AllUsers | Where-Object { $_.Name -eq '${safe}' }
  if ($pkg) {
    foreach ($p in $pkg) {
      $p | Remove-AppxPackage -AllUsers -ErrorAction Stop
    }
    # Also remove provisioned package to prevent reinstall for new users
    $prov = Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -eq '${safe}' }
    if ($prov) {
      Remove-AppxProvisionedPackage -Online -PackageName $prov.PackageName -ErrorAction SilentlyContinue | Out-Null
    }
    [PSCustomObject]@{ success=$true; removed=$true } | ConvertTo-Json -Compress
  } else {
    # Try provisioned only
    $prov = Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -eq '${safe}' }
    if ($prov) {
      Remove-AppxProvisionedPackage -Online -PackageName $prov.PackageName -ErrorAction Stop | Out-Null
      [PSCustomObject]@{ success=$true; removed=$true } | ConvertTo-Json -Compress
    } else {
      [PSCustomObject]@{ success=$false; error='Package not found' } | ConvertTo-Json -Compress
    }
  }
} catch {
  [PSCustomObject]@{ success=$false; error=$_.Exception.Message } | ConvertTo-Json -Compress
}
`;
  }

  try {
    const raw = await runPS(script);
    const result = JSON.parse(raw || '{"success":false,"error":"No output"}');
    console.log(`[wdebloat] removeApp '${pkgName}':`, result);
    return result;
  } catch (err) {
    console.error(`[wdebloat] removeApp '${pkgName}' error:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Bulk remove multiple AppxPackages, broadcasting progress.
 */
async function handleRemoveApps(_event, packageIds) {
  if (!_isElevated) return { success: false, error: 'Administrator privileges required.' };
  const results = [];
  let current = 0;
  for (const id of packageIds) {
    const friendlyName = extractPackageName(id);
    sendProgress(`Removing ${friendlyName}…`, ++current, packageIds.length);
    const r = await handleRemoveApp(null, id);
    results.push({ id, ...r });
  }
  sendProgress('Done', packageIds.length, packageIds.length);
  return { success: true, results };
}

/**
 * Re-register a built-in AppxPackage from the Windows installation.
 * Falls back to winget install if provisioned package is not available.
 */
async function handleInstallApp(_event, packageId) {
  if (!_isElevated) return { success: false, error: 'Administrator privileges required.' };

  const pkgName = extractPackageName(packageId);
  const safe = pkgName.replace(/'/g, "''");

  try {
    // Step 1: Try re-registering from provisioned package or family name
    const reregisterScript = `
$ProgressPreference = 'SilentlyContinue'
try {
  $prov = Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -eq '${safe}' } | Select-Object -First 1
  if ($prov) {
    Add-AppxPackage -RegisterByFamilyName -MainPackage $prov.PackageName -ErrorAction Stop | Out-Null
    [PSCustomObject]@{ success=$true; method='provision' } | ConvertTo-Json -Compress
  } else {
    $fam = (Get-AppxPackage -AllUsers | Where-Object { $_.Name -eq '${safe}' }).PackageFamilyName
    if ($fam) {
      Add-AppxPackage -RegisterByFamilyName -MainPackage $fam -ErrorAction Stop | Out-Null
      [PSCustomObject]@{ success=$true; method='family' } | ConvertTo-Json -Compress
    } else {
      [PSCustomObject]@{ success=$false; error='NOT_FOUND' } | ConvertTo-Json -Compress
    }
  }
} catch {
  [PSCustomObject]@{ success=$false; error=$_.Exception.Message } | ConvertTo-Json -Compress
}
`;
    const raw = await runPS(reregisterScript);
    const result = JSON.parse(raw || '{"success":false,"error":"No output"}');

    if (result.success) {
      console.log(`[wdebloat] installApp '${pkgName}': re-registered via ${result.method}`);
      return result;
    }

    // Step 2: Fallback to winget if provisioned package not found
    if (result.error === 'NOT_FOUND') {
      // Look up the friendly name from catalog for winget search
      const catalogEntry = GS_APPS_CATALOG.find(c =>
        c.pkg.some(p => pkgName.toLowerCase().startsWith(p.toLowerCase()) || p.toLowerCase() === pkgName.toLowerCase())
      );
      const searchName = catalogEntry ? catalogEntry.name : pkgName;
      const safeName = searchName.replace(/'/g, "''");

      console.log(`[wdebloat] installApp '${pkgName}': provisioned not found, trying winget with name '${searchName}'...`);
      try {
        const wingetScript = `
$ProgressPreference = 'SilentlyContinue'
try {
  $output = & winget install --name '${safeName}' --source msstore --accept-source-agreements --accept-package-agreements --silent 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0) {
    [PSCustomObject]@{ success=$true; method='winget' } | ConvertTo-Json -Compress
  } else {
    [PSCustomObject]@{ success=$false; error="winget failed (exit $LASTEXITCODE): $($output.Trim().Substring(0, [Math]::Min(200, $output.Trim().Length)))" } | ConvertTo-Json -Compress
  }
} catch {
  [PSCustomObject]@{ success=$false; error=$_.Exception.Message } | ConvertTo-Json -Compress
}
`;
        const wingetRaw = await runPS(wingetScript, 300000);
        const wingetResult = JSON.parse(wingetRaw || '{"success":false,"error":"No output from winget"}');
        console.log(`[wdebloat] installApp '${pkgName}' winget result:`, wingetResult);
        return wingetResult;
      } catch (wingetErr) {
        console.error(`[wdebloat] installApp '${pkgName}' winget error:`, wingetErr.message);
        return { success: false, error: `Provisioned package not found and winget failed: ${wingetErr.message}` };
      }
    }

    console.log(`[wdebloat] installApp '${pkgName}':`, result);
    return result;
  } catch (err) {
    console.error(`[wdebloat] installApp '${pkgName}' error:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Bulk install multiple AppxPackages.
 */
async function handleInstallApps(_event, packageIds) {
  if (!_isElevated) return { success: false, error: 'Administrator privileges required.' };
  const results = [];
  let current = 0;
  for (const id of packageIds) {
    const friendlyName = extractPackageName(id);
    sendProgress(`Installing ${friendlyName}…`, ++current, packageIds.length);
    const r = await handleInstallApp(null, id);
    results.push({ id, ...r });
  }
  sendProgress('Done', packageIds.length, packageIds.length);
  return { success: true, results };
}

/* ═══════════════════════════════════════════════════════════════════════════
   CAPABILITIES
   ═══════════════════════════════════════════════════════════════════════════ */

async function handleListCapabilities() {
  try {
    const script = `
$caps = Get-WindowsCapability -Online | Select-Object Name, @{Name='State';Expression={$_.State.ToString()}} | Sort-Object Name
$caps | ConvertTo-Json -Compress -Depth 2
`;
    const raw = await runPS(script);
    let caps = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        caps = Array.isArray(parsed) ? parsed : [parsed];
      } catch { caps = []; }
    }
    const items = caps
      .map(c => {
        const match = matchCapability(c.Name);
        return match ? {
          id: c.Name,
          name: match.label,
          description: match.description,
          rawName: c.Name,
          installed: c.State === 'Installed',
          state: c.State || 'Unknown',
          canBeReinstalled: match.canBeReinstalled,
        } : null;
      })
      .filter(Boolean);

    return { success: true, items };
  } catch (err) {
    return { success: false, error: err.message, items: [] };
  }
}

async function handleRemoveCapability(_event, capabilityName) {
  if (!_isElevated) return { success: false, error: 'Administrator privileges required.' };
  try {
    const script = `
$ProgressPreference = 'SilentlyContinue'
try {
  Remove-WindowsCapability -Online -Name '${capabilityName.replace(/'/g, "''")}' -ErrorAction Stop | Out-Null
  [PSCustomObject]@{ success=$true } | ConvertTo-Json -Compress
} catch {
  [PSCustomObject]@{ success=$false; error=$_.Exception.Message } | ConvertTo-Json -Compress
}
`;
    const raw = await runPS(script);
    const result = JSON.parse(raw || '{"success":false,"error":"No output"}');
    console.log(`[wdebloat] removeCapability '${capabilityName}':`, result);
    return result;
  } catch (err) {
    console.error(`[wdebloat] removeCapability '${capabilityName}' error:`, err.message);
    return { success: false, error: err.message };
  }
}

async function handleRemoveCapabilities(_event, names) {
  if (!_isElevated) return { success: false, error: 'Administrator privileges required.' };
  const results = [];
  let i = 0;
  for (const n of names) {
    sendProgress(`Removing capability: ${n}…`, ++i, names.length);
    const r = await handleRemoveCapability(null, n);
    results.push({ id: n, ...r });
  }
  return { success: true, results };
}

async function handleAddCapability(_event, capabilityName) {
  if (!_isElevated) return { success: false, error: 'Administrator privileges required.' };
  try {
    const script = `
$ProgressPreference = 'SilentlyContinue'
try {
  Add-WindowsCapability -Online -Name '${capabilityName.replace(/'/g, "''")}' -ErrorAction Stop | Out-Null
  [PSCustomObject]@{ success=$true } | ConvertTo-Json -Compress
} catch {
  [PSCustomObject]@{ success=$false; error=$_.Exception.Message } | ConvertTo-Json -Compress
}
`;
    const raw = await runPS(script, 300000);
    const result = JSON.parse(raw || '{"success":false,"error":"No output"}');
    console.log(`[wdebloat] addCapability '${capabilityName}':`, result);
    return result;
  } catch (err) {
    console.error(`[wdebloat] addCapability '${capabilityName}' error:`, err.message);
    return { success: false, error: err.message };
  }
}

async function handleAddCapabilities(_event, names) {
  if (!_isElevated) return { success: false, error: 'Administrator privileges required.' };
  const results = [];
  let i = 0;
  for (const n of names) {
    sendProgress(`Installing capability: ${n}…`, ++i, names.length);
    const r = await handleAddCapability(null, n);
    results.push({ id: n, ...r });
  }
  return { success: true, results };
}

/* ═══════════════════════════════════════════════════════════════════════════
   OPTIONAL FEATURES
   ═══════════════════════════════════════════════════════════════════════════ */

async function handleListFeatures() {
  try {
    const script = `
$feats = Get-WindowsOptionalFeature -Online | Select-Object FeatureName, @{Name='State';Expression={$_.State.ToString()}} | Sort-Object FeatureName
$feats | ConvertTo-Json -Compress -Depth 2
`;
    const raw = await runPS(script);
    let feats = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        feats = Array.isArray(parsed) ? parsed : [parsed];
      } catch { feats = []; }
    }
    const items = feats
      .map(f => {
        const match = matchOptionalFeature(f.FeatureName);
        return match ? {
          id: f.FeatureName,
          name: match.label,
          description: match.description,
          rawName: f.FeatureName,
          installed: f.State === 'Enabled',
          state: f.State || 'Unknown',
          canBeReinstalled: match.canBeReinstalled,
        } : null;
      })
      .filter(Boolean);
    return { success: true, items };
  } catch (err) {
    return { success: false, error: err.message, items: [] };
  }
}

async function handlePreloadAll() {
  try {
    const script = `
$pkgs = Get-AppxPackage -AllUsers | Select-Object Name, PackageFamilyName, Version, NonRemovable
$caps = Get-WindowsCapability -Online | Select-Object Name, @{Name='State';Expression={$_.State.ToString()}}
$feats = Get-WindowsOptionalFeature -Online | Select-Object FeatureName, @{Name='State';Expression={$_.State.ToString()}}

[PSCustomObject]@{
  apps = $pkgs
  caps = $caps
  feats = $feats
} | ConvertTo-Json -Compress -Depth 3
`;
    const raw = await runPS(script);
    if (!raw) return { success: false };

    const parsed = JSON.parse(raw);
    const rawApps = Array.isArray(parsed.apps) ? parsed.apps : [parsed.apps].filter(Boolean);
    const rawCaps = Array.isArray(parsed.caps) ? parsed.caps : [parsed.caps].filter(Boolean);
    const rawFeats = Array.isArray(parsed.feats) ? parsed.feats : [parsed.feats].filter(Boolean);

    // Map apps
    const appsItems = rawApps.map(pkg => {
      const packageFamily = (pkg.PackageFamilyName || '').toLowerCase();
      const lowerName = (pkg.Name || '').toLowerCase();
      const catalogEntry = GS_APPS_CATALOG.find(c =>
        c.pkg.some(p => {
          const pLower = p.toLowerCase();
          return packageFamily.startsWith(pLower) || lowerName.startsWith(pLower) || lowerName === pLower;
        })
      );

      return {
        id: pkg.Name || pkg.PackageFamilyName,
        name: catalogEntry ? catalogEntry.name : pkg.Name,
        description: catalogEntry ? catalogEntry.description : '',
        packageFamilyName: pkg.PackageFamilyName || '',
        version: pkg.Version || '',
        installed: true,
        nonRemovable: (catalogEntry && catalogEntry.isEdge) ? false : !!pkg.NonRemovable,
        isCatalog: !!catalogEntry,
        canBeReinstalled: catalogEntry ? catalogEntry.canBeReinstalled : true,
        isEdge: catalogEntry ? !!catalogEntry.isEdge : false,
        isOneDrive: catalogEntry ? !!catalogEntry.isOneDrive : false,
      };
    });

    // Deduplicate installed packages that map to the same catalog entry (e.g. Edge reports two packages)
    const seenCatalogNamesPA = new Set();
    for (let i = appsItems.length - 1; i >= 0; i--) {
      if (appsItems[i].isCatalog) {
        if (seenCatalogNamesPA.has(appsItems[i].name)) {
          appsItems.splice(i, 1);
        } else {
          seenCatalogNamesPA.add(appsItems[i].name);
        }
      }
    }

    for (const entry of GS_APPS_CATALOG) {
      const alreadyListed = appsItems.some(i => {
        const idLower = (i.id || '').toLowerCase();
        const pfnLower = (i.packageFamilyName || '').toLowerCase();
        return entry.pkg.some(p => idLower.startsWith(p.toLowerCase()) || pfnLower.startsWith(p.toLowerCase()));
      });
      if (!alreadyListed) {
        appsItems.push({
          id: entry.pkg[0],
          name: entry.name,
          description: entry.description,
          packageFamilyName: '',
          version: '',
          installed: false,
          nonRemovable: false,
          isCatalog: true,
          canBeReinstalled: entry.canBeReinstalled,
          isEdge: !!entry.isEdge,
          isOneDrive: !!entry.isOneDrive,
        });
      }
    }

    const finalApps = appsItems.filter(i => i.isCatalog).sort((a, b) => a.name.localeCompare(b.name));

    // Map caps
    const capsItems = rawCaps.map(c => {
      const match = matchCapability(c.Name);
      return match ? {
        id: c.Name,
        name: match.label,
        description: match.description,
        rawName: c.Name,
        installed: c.State === 'Installed',
        state: c.State || 'Unknown',
        canBeReinstalled: match.canBeReinstalled,
      } : null;
    }).filter(Boolean);

    // Map feats
    const featsItems = rawFeats.map(f => {
      const match = matchOptionalFeature(f.FeatureName);
      return match ? {
        id: f.FeatureName,
        name: match.label,
        description: match.description,
        rawName: f.FeatureName,
        installed: f.State === 'Enabled',
        state: f.State || 'Unknown',
        canBeReinstalled: match.canBeReinstalled,
      } : null;
    }).filter(Boolean);

    return {
      success: true,
      data: {
        apps: { success: true, items: finalApps },
        caps: { success: true, items: capsItems },
        feats: { success: true, items: featsItems }
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleRemoveFeature(_event, featureName) {
  if (!_isElevated) return { success: false, error: 'Administrator privileges required.' };
  try {
    const script = `
$ProgressPreference = 'SilentlyContinue'
try {
  Disable-WindowsOptionalFeature -Online -FeatureName '${featureName.replace(/'/g, "''")}' -NoRestart -ErrorAction Stop | Out-Null
  [PSCustomObject]@{ success=$true } | ConvertTo-Json -Compress
} catch {
  [PSCustomObject]@{ success=$false; error=$_.Exception.Message } | ConvertTo-Json -Compress
}
`;
    const raw = await runPS(script);
    return JSON.parse(raw || '{"success":false,"error":"No output"}');
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleRemoveFeatures(_event, names) {
  if (!_isElevated) return { success: false, error: 'Administrator privileges required.' };
  const results = [];
  let i = 0;
  for (const n of names) {
    sendProgress(`Disabling feature: ${n}…`, ++i, names.length);
    const r = await handleRemoveFeature(null, n);
    results.push({ id: n, ...r });
  }
  return { success: true, results };
}

async function handleAddFeature(_event, featureName) {
  if (!_isElevated) return { success: false, error: 'Administrator privileges required.' };
  try {
    const script = `
$ProgressPreference = 'SilentlyContinue'
try {
  Enable-WindowsOptionalFeature -Online -FeatureName '${featureName.replace(/'/g, "''")}' -NoRestart -ErrorAction Stop | Out-Null
  [PSCustomObject]@{ success=$true } | ConvertTo-Json -Compress
} catch {
  [PSCustomObject]@{ success=$false; error=$_.Exception.Message } | ConvertTo-Json -Compress
}
`;
    const raw = await runPS(script, 300000);
    return JSON.parse(raw || '{"success":false,"error":"No output"}');
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleAddFeatures(_event, names) {
  if (!_isElevated) return { success: false, error: 'Administrator privileges required.' };
  const results = [];
  let i = 0;
  for (const n of names) {
    sendProgress(`Enabling feature: ${n}…`, ++i, names.length);
    const r = await handleAddFeature(null, n);
    results.push({ id: n, ...r });
  }
  return { success: true, results };
}

/* ─── Module exports ────────────────────────────────────────────────────── */
module.exports = {
  init({ isElevated }) {
    _isElevated = isElevated;
  },

  registerIPC() {
    // Apps (AppxPackages)
    ipcMain.handle('wdebloat:list-apps',    handleListApps);
    ipcMain.handle('wdebloat:remove-app',   handleRemoveApp);
    ipcMain.handle('wdebloat:remove-apps',  handleRemoveApps);
    ipcMain.handle('wdebloat:install-app',  handleInstallApp);
    ipcMain.handle('wdebloat:install-apps', handleInstallApps);

    // Capabilities
    ipcMain.handle('wdebloat:list-capabilities',    handleListCapabilities);
    ipcMain.handle('wdebloat:remove-capability',    handleRemoveCapability);
    ipcMain.handle('wdebloat:remove-capabilities',  handleRemoveCapabilities);
    ipcMain.handle('wdebloat:add-capability',       handleAddCapability);
    ipcMain.handle('wdebloat:add-capabilities',     handleAddCapabilities);

    // Optional Features
    ipcMain.handle('wdebloat:list-features',   handleListFeatures);
    ipcMain.handle('wdebloat:remove-feature',  handleRemoveFeature);
    ipcMain.handle('wdebloat:remove-features', handleRemoveFeatures);
    ipcMain.handle('wdebloat:add-feature',     handleAddFeature);
    ipcMain.handle('wdebloat:add-features',    handleAddFeatures);
  },

  handlePreloadAll,
};
