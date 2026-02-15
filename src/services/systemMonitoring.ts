import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get CPU usage using Windows command
export async function getCPUUsage(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      'wmic cpu get loadpercentage /format:list'
    );
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.includes('LoadPercentage')) {
        const value = parseInt(line.split('=')[1]);
        return isNaN(value) ? 0 : value;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

// Get RAM usage
export async function getRAMUsage(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      'wmic os get totalvisiblememorybytes,freephysicalmemory /format:list'
    );
    const lines = stdout.split('\n');
    let totalMemory = 0;
    let freeMemory = 0;

    lines.forEach(line => {
      if (line.includes('TotalVisibleMemoryBytes')) {
        totalMemory = parseInt(line.split('=')[1]);
      }
      if (line.includes('FreePhysicalMemory')) {
        freeMemory = parseInt(line.split('=')[1]);
      }
    });

    const usedMemory = totalMemory - freeMemory * 1024;
    return parseFloat(((usedMemory / totalMemory) * 100).toFixed(2));
  } catch {
    return 0;
  }
}

// Get Disk usage
export async function getDiskUsage(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      'wmic logicaldisk where name="C:" get size,freespace /format:list'
    );
    const lines = stdout.split('\n');
    let totalDisk = 0;
    let freeDisk = 0;

    lines.forEach(line => {
      if (line.includes('Size')) {
        totalDisk = parseInt(line.split('=')[1]);
      }
      if (line.includes('FreeSpace')) {
        freeDisk = parseInt(line.split('=')[1]);
      }
    });

    if (totalDisk === 0) return 0;
    const usedDisk = totalDisk - freeDisk;
    return parseFloat(((usedDisk / totalDisk) * 100).toFixed(2));
  } catch {
    return 0;
  }
}

// Get system temperature
export async function getSystemTemperature(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      'wmic /namespace:\\\\root\\wmi path win32_perfformatteddata_ohdictsensors_systemtemperature get currentreading /format:list'
    );
    const match = stdout.match(/\d+/);
    if (!match) return 45; // Default temp if not available
    const temp = parseInt(match[0]);
    return isNaN(temp) ? 45 : Math.round((temp / 1000) * 100) / 100;
  } catch {
    return 45;
  }
}

// Get running processes
export async function getRunningProcesses(): Promise<any[]> {
  try {
    const { stdout } = await execAsync('tasklist /v');
    const processes = stdout
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(1) // Skip header
      .slice(0, 10)
      .map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          name: parts[0],
          timestamp: new Date(),
        };
      });
    return processes.filter(p => p.name && p.name !== '=' && p.name.length > 0);
  } catch {
    return [];
  }
}

// Setup IPC handlers for system monitoring
export function setupSystemMonitoring() {
  ipcMain.handle('get-system-stats', async () => {
    const [cpu, ram, disk, temp] = await Promise.all([
      getCPUUsage(),
      getRAMUsage(),
      getDiskUsage(),
      getSystemTemperature(),
    ]);

    return { cpu, ram, disk, temp };
  });

  ipcMain.handle('get-running-processes', getRunningProcesses);
}
