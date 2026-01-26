// Optimization utilities for Phase 4 implementation

export interface OptimizationProfile {
  name: string;
  description: string;
  processes: string[];
  settings: {
    disableVisualEffects: boolean;
    closeBackgroundApps: boolean;
    optimizeNetwork: boolean;
    boostProcessPriority: boolean;
  };
}

// Common game optimization profiles
export const gameProfiles: Record<string, OptimizationProfile> = {
  'League of Legends': {
    name: 'League of Legends',
    description: 'Optimized for LoL competitive play',
    processes: [
      'Discord.exe',
      'Chrome.exe',
      'Firefox.exe',
      'Telegram.exe',
      'Skype.exe',
    ],
    settings: {
      disableVisualEffects: true,
      closeBackgroundApps: true,
      optimizeNetwork: true,
      boostProcessPriority: true,
    },
  },
  'Valorant': {
    name: 'Valorant',
    description: 'Optimized for Valorant competitive play',
    processes: [
      'Discord.exe',
      'Chrome.exe',
      'Firefox.exe',
      'Telegram.exe',
      'OneDrive.exe',
    ],
    settings: {
      disableVisualEffects: true,
      closeBackgroundApps: true,
      optimizeNetwork: true,
      boostProcessPriority: true,
    },
  },
};

// Generic game optimization settings
export function applyGenericOptimization() {
  return {
    cpu_affinity: 'all_cores',
    ram_priority: 'high',
    disk_cache: 'minimal',
    network_optimization: 'enabled',
  };
}

// Cleanup optimization - find and report junk files
export interface JunkFile {
  path: string;
  size: number;
  type: 'temp' | 'cache' | 'log' | 'duplicate';
}

export const junkFilePatterns = {
  temp: ['%temp%', '%windir%\\temp'],
  cache: [
    '%appdata%\\Local\\Temp',
    '%appdata%\\Local\\Google\\Chrome\\User Data\\Default\\Cache',
    '%appdata%\\Local\\Microsoft\\Windows\\INetCache',
  ],
  log: ['%windir%\\Logs', '%appdata%\\Local\\Packages'],
};

// Calculate potential disk space recovery
export function calculateCleanupSize(items: any[]): number {
  return items.reduce((total, item) => {
    const sizeMatch = item.size.match(/(\d+\.?\d*)\s*(GB|MB|KB)?/i);
    if (!sizeMatch) return total;

    let bytes = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2]?.toUpperCase();

    switch (unit) {
      case 'GB':
        bytes *= 1024 * 1024 * 1024;
        break;
      case 'MB':
        bytes *= 1024 * 1024;
        break;
      case 'KB':
        bytes *= 1024;
        break;
    }

    return total + bytes;
  }, 0);
}

// Format bytes to readable size
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
