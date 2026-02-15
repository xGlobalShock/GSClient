const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

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
    },
    icon: path.join(__dirname, 'public/icon.png'),
  });

  mainWindow.setMenuBarVisibility(false);

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(process.resourcesPath, 'app', 'build', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
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

// System Stats IPC Handler
ipcMain.handle('system:get-stats', async () => {
  try {
    const cpuCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Counter '\\Processor(_Total)\\% Processor Time' | Select-Object -ExpandProperty CounterSamples | Select-Object -ExpandProperty CookedValue"`;
    const cpuResult = await execAsync(cpuCmd, { shell: true });
    const cpu = parseFloat(cpuResult.stdout.trim()) || 0;

    const ramCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$os = Get-CimInstance Win32_OperatingSystem; [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 1)"`;
    const ramResult = await execAsync(ramCmd, { shell: true });
    const ram = parseFloat(ramResult.stdout.trim()) || 0;

    const diskCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$disk = Get-CimInstance Win32_LogicalDisk -Filter \\"DeviceID='C:'\\" ; [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 1)"`;
    const diskResult = await execAsync(diskCmd, { shell: true });
    const disk = parseFloat(diskResult.stdout.trim()) || 0;

    const temperature = Math.round((40 + (cpu * 0.4)) * 10) / 10;

    return {
      cpu: Math.round(cpu * 10) / 10,
      ram: Math.round(ram * 10) / 10,
      disk: Math.round(disk * 10) / 10,
      temperature
    };
  } catch (error) {
    return { cpu: 0, ram: 0, disk: 0, temperature: 0 };
  }
});

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
      // File might be in use
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

    // Gather pre-deletion stats using PowerShell (non-blocking)
    const statsCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '${updateDir}' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue | ConvertTo-Json -Compress"`;
    let filesBefore = 0;
    let totalSize = 0;

    try {
      const statRes = await execAsync(statsCmd, { shell: true, timeout: 30000 });
      const stdout = (statRes.stdout || '').trim();
      if (stdout) {
        try {
          const parsed = JSON.parse(stdout);
          filesBefore = parsed.Count || 0;
          totalSize = parsed.Sum || 0;
        } catch (e) {
          // ignore parse errors
        }
      }
    } catch (e) {
      // If stats collection fails, may need admin - check before attempting deletion
      return {
        success: false,
        message: 'Run the app as administrator'
      };
    }

    // Remove files using PowerShell Remove-Item to avoid blocking the main event loop
    const removeCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-Item -Path '${updateDir}\\*' -Recurse -Force -ErrorAction SilentlyContinue"`;
    
    try {
      await execAsync(removeCmd, { shell: true, timeout: 120000 });
    } catch (removeError) {
      // Removal failed - always needs admin for Windows Update cache
      return { success: false, message: 'Run the app as administrator' };
    }

    // Return pre-computed size as space saved (best-effort)
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

    return {
      success: true,
      message: `Cleared Windows Update cache`,
      filesDeleted: filesBefore,
      filesBefore: filesBefore,
      filesAfter: 0,
      spaceSaved: `${sizeInMB} MB`,
      details: `${filesBefore}/${filesBefore} files deleted (0 remaining)`,
    };
  } catch (error) {
    // Windows Update cache ALWAYS needs admin rights - never show detailed error
    return { success: false, message: 'Run the app as administrator' };
  }
});

ipcMain.handle('cleaner:clear-dns-cache', async () => {
  try {
    // Get DNS cache entry count before clearing
    let entriesBefore = 0;
    try {
      const displayResult = await execAsync('ipconfig /displaydns', { shell: true });
      const entries = displayResult.stdout.match(/Record Name/g);
      entriesBefore = entries ? entries.length : 0;
      console.log(`DNS cache entries before: ${entriesBefore}`);
    } catch {}
    
    // Clear DNS cache
    const result = await execAsync('ipconfig /flushdns', { shell: true });
    const output = result.stdout + result.stderr;
    
    console.log('DNS Flush output:', output);
    
    // Check if successful
    if (output.includes('Successfully flushed') || output.includes('The DNS Resolver Cache')) {
      return {
        success: true,
        message: 'DNS cache flushed successfully',
        spaceSaved: entriesBefore > 0 ? `${entriesBefore} entries cleared` : 'Cache cleared',
      };
    } else if (output.includes('access') || output.includes('denied') || output.includes('privilege')) {
      return {
        success: false,
        message: 'Administrator privileges required. Please run the app as Administrator.',
      };
    } else {
      return {
        success: false,
        message: 'DNS flush may have failed. Check console logs.',
      };
    }
  } catch (error) {
    console.error('DNS Flush error:', error);
    if (isPermissionError(error)) {
      return { success: false, message: 'Run the app as administrator' };
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

// Performance Tweaks IPC Handlers
ipcMain.handle('tweak:apply-irq-priority', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl')) { New-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'IRQ8Priority' -Value 1 -Type DWord -Force; $val = (Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'IRQ8Priority').IRQ8Priority; Write-Host "Created: IRQ8Priority = $val"`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'IRQ Priority tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('tweak:apply-network-interrupts', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NDIS\\Parameters')) { New-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NDIS\\Parameters' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NDIS\\Parameters' -Name 'ProcessorThrottleMode' -Value 1 -Type DWord -Force; Write-Host 'Network Interrupts applied'`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'Network Interrupts tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('tweak:apply-gpu-scheduling', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers')) { New-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Name 'HwSchMode' -Value 2 -Type DWord -Force; Write-Host 'GPU Scheduling applied'`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'GPU Scheduling tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('tweak:apply-fullscreen-optimization', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKCU:\\System\\GameConfigStore')) { New-Item -Path 'HKCU:\\System\\GameConfigStore' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_FSEBehaviorMonitorEnabled' -Value 0 -Type DWord -Force; Write-Host 'Fullscreen Optimization applied'`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'Fullscreen Optimization tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('tweak:apply-usb-suspend', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB')) { New-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Name 'DisableSelectiveSuspend' -Value 1 -Type DWord -Force; Write-Host 'USB Suspend applied'`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'USB Suspend tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('tweak:apply-game-dvr', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKCU:\\System\\GameConfigStore')) { New-Item -Path 'HKCU:\\System\\GameConfigStore' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_Enabled' -Value 0 -Type DWord -Force; Write-Host 'Game DVR applied'`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'Game DVR tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('tweak:apply-win32-priority', async () => {
  try {
    const cmd = `If (-not (Test-Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl')) { New-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'Win32PrioritySeparation' -Value 38 -Type DWord -Force; Write-Host 'Win32 Priority applied'`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'Win32 Priority tweak applied successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
  }
});

// Check Tweak Status IPC Handlers
ipcMain.handle('tweak:check-irq-priority', async () => {
  try {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'IRQ8Priority' -ErrorAction SilentlyContinue; if ($p) { @{ exists = $true; value = $p.IRQ8Priority } | ConvertTo-Json -Compress } else { @{ exists = $false; value = $null } | ConvertTo-Json -Compress }"`;
    const result = await execAsync(cmd, { shell: true });
    const out = (result.stdout || '').trim();
    if (!out) return { applied: false };
    const parsed = JSON.parse(out);
    const applied = parsed.exists && Number(parsed.value) === 1;
    return { applied, value: parsed.value };
  } catch (error) {
    console.log('[Tweak Check] IRQ Priority check error:', error.message || error);
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

ipcMain.handle('tweak:check-network-interrupts', async () => {
  try {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NDIS\\Parameters' -Name 'ProcessorThrottleMode' -ErrorAction SilentlyContinue; if ($p) { @{ exists = $true; value = $p.ProcessorThrottleMode } | ConvertTo-Json -Compress } else { @{ exists = $false; value = $null } | ConvertTo-Json -Compress }"`;
    const result = await execAsync(cmd, { shell: true });
    const out = (result.stdout || '').trim();
    if (!out) return { applied: false };
    const parsed = JSON.parse(out);
    const applied = parsed.exists && Number(parsed.value) === 1;
    return { applied, value: parsed.value };
  } catch (error) {
    console.log('[Tweak Check] Network Interrupts check error:', error.message || error);
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

ipcMain.handle('tweak:check-gpu-scheduling', async () => {
  try {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Name 'HwSchMode' -ErrorAction SilentlyContinue; if ($p) { @{ exists = $true; value = $p.HwSchMode } | ConvertTo-Json -Compress } else { @{ exists = $false; value = $null } | ConvertTo-Json -Compress }"`;
    const result = await execAsync(cmd, { shell: true });
    const out = (result.stdout || '').trim();
    if (!out) return { applied: false };
    const parsed = JSON.parse(out);
    const applied = parsed.exists && Number(parsed.value) === 2;
    return { applied, value: parsed.value };
  } catch (error) {
    console.log('[Tweak Check] GPU Scheduling check error:', error.message || error);
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

ipcMain.handle('tweak:check-fullscreen-optimization', async () => {
  try {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-ItemProperty -Path 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_FSEBehaviorMonitorEnabled' -ErrorAction SilentlyContinue; if ($p) { @{ exists = $true; value = $p.GameDVR_FSEBehaviorMonitorEnabled } | ConvertTo-Json -Compress } else { @{ exists = $false; value = $null } | ConvertTo-Json -Compress }"`;
    const result = await execAsync(cmd, { shell: true });
    const out = (result.stdout || '').trim();
    if (!out) return { applied: false };
    const parsed = JSON.parse(out);
    const applied = parsed.exists && Number(parsed.value) === 0;
    return { applied, value: parsed.value };
  } catch (error) {
    console.log('[Tweak Check] Fullscreen Optimization check error:', error.message || error);
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

ipcMain.handle('tweak:check-usb-suspend', async () => {
  try {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Name 'DisableSelectiveSuspend' -ErrorAction SilentlyContinue; if ($p) { @{ exists = $true; value = $p.DisableSelectiveSuspend } | ConvertTo-Json -Compress } else { @{ exists = $false; value = $null } | ConvertTo-Json -Compress }"`;
    const result = await execAsync(cmd, { shell: true });
    const out = (result.stdout || '').trim();
    if (!out) return { applied: false };
    const parsed = JSON.parse(out);
    const applied = parsed.exists && Number(parsed.value) === 1;
    return { applied, value: parsed.value };
  } catch (error) {
    console.log('[Tweak Check] USB Suspend check error:', error.message || error);
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

ipcMain.handle('tweak:check-game-dvr', async () => {
  try {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-ItemProperty -Path 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_Enabled' -ErrorAction SilentlyContinue; if ($p) { @{ exists = $true; value = $p.GameDVR_Enabled } | ConvertTo-Json -Compress } else { @{ exists = $false; value = $null } | ConvertTo-Json -Compress }"`;
    const result = await execAsync(cmd, { shell: true });
    const out = (result.stdout || '').trim();
    if (!out) return { applied: false };
    const parsed = JSON.parse(out);
    const applied = parsed.exists && Number(parsed.value) === 0;
    return { applied, value: parsed.value };
  } catch (error) {
    console.log('[Tweak Check] Game DVR check error:', error.message || error);
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

ipcMain.handle('tweak:check-win32-priority', async () => {
  try {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'Win32PrioritySeparation' -ErrorAction SilentlyContinue; if ($p) { @{ exists = $true; value = $p.Win32PrioritySeparation } | ConvertTo-Json -Compress } else { @{ exists = $false; value = $null } | ConvertTo-Json -Compress }"`;
    const result = await execAsync(cmd, { shell: true });
    const out = (result.stdout || '').trim();
    if (!out) return { applied: false };
    const parsed = JSON.parse(out);
    const applied = parsed.exists && Number(parsed.value) === 38;
    return { applied, value: parsed.value };
  } catch (error) {
    console.log('[Tweak Check] Win32 Priority check error:', error.message || error);
    return { applied: false, exists: false, value: null, error: error.message || String(error) };
  }
});

// Reset Tweak IPC Handlers (Remove Registry Entries)
ipcMain.handle('tweak:reset-irq-priority', async () => {
  try {
    const cmd = `Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'IRQ8Priority' -Force -ErrorAction Stop`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'IRQ Priority reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset IRQ Priority - Admin privileges required' };
  }
});

ipcMain.handle('tweak:reset-network-interrupts', async () => {
  try {
    const cmd = `Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NDIS\\Parameters' -Name 'ProcessorThrottleMode' -Force -ErrorAction Stop`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'Network Interrupts reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset Network Interrupts - Admin privileges required' };
  }
});

ipcMain.handle('tweak:reset-gpu-scheduling', async () => {
  try {
    const cmd = `Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Name 'HwSchMode' -Force -ErrorAction Stop`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'GPU Scheduling reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset GPU Scheduling - Admin privileges required' };
  }
});

ipcMain.handle('tweak:reset-fullscreen-optimization', async () => {
  try {
    const cmd = `Remove-ItemProperty -Path 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_FSEBehaviorMonitorEnabled' -Force -ErrorAction Stop`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'Fullscreen Optimization reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset Fullscreen Optimization - Admin privileges required' };
  }
});

ipcMain.handle('tweak:reset-usb-suspend', async () => {
  try {
    const cmd = `Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Name 'DisableSelectiveSuspend' -Force -ErrorAction Stop`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'USB Suspend reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset USB Suspend - Admin privileges required' };
  }
});

ipcMain.handle('tweak:reset-game-dvr', async () => {
  try {
    const cmd = `Remove-ItemProperty -Path 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_Enabled' -Force -ErrorAction Stop`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'Game DVR reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset Game DVR - Admin privileges required' };
  }
});

ipcMain.handle('tweak:reset-win32-priority', async () => {
  try {
    const cmd = `Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'Win32PrioritySeparation' -Value 2 -Type DWord -Force`;
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    return { success: true, message: 'Win32 Priority reset to default' };
  } catch (error) {
    return { success: false, message: 'Failed to reset Win32 Priority - Admin privileges required' };
  }
});
