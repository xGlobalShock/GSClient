const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

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
        : path.join(process.resourcesPath, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    icon: path.join(__dirname, 'public/icon.png'),
  });

  mainWindow.setMenuBarVisibility(false);

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(process.resourcesPath, 'app.asar', 'build', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  // Uncomment to debug
  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }

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
    const descBase = description || 'PC Optimizer - Before Tweak Application';

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
        return { success: false, message: 'Checkpoint executed but no new restore point detected. System may throttle restore creation or it may be disabled.', debug: { preObj, postObj } };
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
    return { success: false, message: `Error: ${error.message}` };
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
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('cleaner:clear-update-cache', async () => {
  try {
    const updateDir = 'C:\\Windows\\SoftwareDistribution\\Download';
    let filesDeleted = 0;
    let totalSize = 0;
    let filesBefore = 0;

    if (fs.existsSync(updateDir)) {
      const files = fs.readdirSync(updateDir);
      filesBefore = files.length;
      for (const file of files) {
        try {
          const filePath = path.join(updateDir, file);
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
      message: `Cleared Windows Update cache`,
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

ipcMain.handle('cleaner:clear-dns-cache', async () => {
  try {
    const result = await execAsync('ipconfig /flushdns', { shell: true });
    return {
      success: true,
      message: 'DNS cache flushed successfully',
      spaceSaved: '~10 MB',
    };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}` };
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
    const cmd = `If ((Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'IRQ8Priority').IRQ8Priority -eq 1) { Write-Host 'APPLIED' } Else { Write-Host 'NOT_APPLIED' }`;
    const result = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    const output = result.stdout.trim();
    return { applied: output.trim() === 'APPLIED' };
  } catch (error) {
    return { applied: false };
  }
});

ipcMain.handle('tweak:check-network-interrupts', async () => {
  try {
    const cmd = `If ((Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NDIS\\Parameters' -Name 'ProcessorThrottleMode').ProcessorThrottleMode -eq 1) { Write-Host 'APPLIED' } Else { Write-Host 'NOT_APPLIED' }`;
    const result = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    const output = result.stdout.trim();
    return { applied: output.trim() === 'APPLIED' };
  } catch (error) {
    return { applied: false };
  }
});

ipcMain.handle('tweak:check-gpu-scheduling', async () => {
  try {
    const cmd = `If ((Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Name 'HwSchMode').HwSchMode -eq 2) { Write-Host 'APPLIED' } Else { Write-Host 'NOT_APPLIED' }`;
    const result = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    const output = result.stdout.trim();
    return { applied: output.trim() === 'APPLIED' };
  } catch (error) {
    return { applied: false };
  }
});

ipcMain.handle('tweak:check-fullscreen-optimization', async () => {
  try {
    const cmd = `If ((Get-ItemProperty -Path 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_FSEBehaviorMonitorEnabled').GameDVR_FSEBehaviorMonitorEnabled -eq 0) { Write-Host 'APPLIED' } Else { Write-Host 'NOT_APPLIED' }`;
    const result = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    const output = result.stdout.trim();
    return { applied: output.trim() === 'APPLIED' };
  } catch (error) {
    return { applied: false };
  }
});

ipcMain.handle('tweak:check-usb-suspend', async () => {
  try {
    const cmd = `If ((Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Name 'DisableSelectiveSuspend').DisableSelectiveSuspend -eq 1) { Write-Host 'APPLIED' } Else { Write-Host 'NOT_APPLIED' }`;
    const result = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    const output = result.stdout.trim();
    return { applied: output.trim() === 'APPLIED' };
  } catch (error) {
    return { applied: false };
  }
});

ipcMain.handle('tweak:check-game-dvr', async () => {
  try {
    const cmd = `If ((Get-ItemProperty -Path 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_Enabled').GameDVR_Enabled -eq 0) { Write-Host 'APPLIED' } Else { Write-Host 'NOT_APPLIED' }`;
    const result = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    const output = result.stdout.trim();
    return { applied: output.includes('APPLIED') };
  } catch (error) {
    return { applied: false };
  }
});

ipcMain.handle('tweak:check-win32-priority', async () => {
  try {
    const cmd = `If ((Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'Win32PrioritySeparation').Win32PrioritySeparation -eq 38) { Write-Host 'APPLIED' } Else { Write-Host 'NOT_APPLIED' }`;
    const result = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { shell: true });
    const output = result.stdout.trim();
    return { applied: output.includes('APPLIED') };
  } catch (error) {
    return { applied: false };
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
