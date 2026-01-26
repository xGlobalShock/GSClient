import { Cpu, Warning, Trash, ArrowCounterClockwise, Question, Monitor, Cloud } from 'phosphor-react';

export interface CleanerUtility {
  id: string;
  title: string;
  icon: any;
  cacheType: string;
  description: string;
  buttonText: string;
  color: string;
  buttonColor: string;
}

export const cleanerUtilities: CleanerUtility[] = [
  {
    id: 'nvidia-cache',
    title: 'Clear NVIDIA Cache',
    icon: Cpu, // NVIDIA Cache: CPU icon is fine
    cacheType: 'DXCache/GLCache',
    description: 'Clears shader cache to fix stuttering after game updates.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#00FF00',
  },
  {
    id: 'apex-shaders',
    title: 'Clear Apex Shaders',
    icon: Warning, // Apex Shaders: Warning icon for shader issues
    cacheType: 'Shader Cache',
    description: 'Clears psCache.pso to fix stuttering and improve performance.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#FF6B35',
  },
  {
    id: 'temp-files',
    title: 'Clear Temp Files',
    icon: Trash, // Temp Files: Trash icon
    cacheType: 'Temporary Files',
    description: 'Clears %temp% folder to free up disk space instantly.',
    buttonText: 'Clear Files',
    color: '#0074D9',
    buttonColor: '#9D4EDD',
  },
  {
    id: 'prefetch',
    title: 'Clear Prefetch',
    icon: ArrowCounterClockwise, // Prefetch: ArrowCounterClockwise for refresh
    cacheType: 'Startup Cache',
    description: 'Clears prefetch cache to optimize system startup performance.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#00A3FF',
  },
  {
    id: 'memory-dumps',
    title: 'Clear Memory Dumps',
    icon: Question, // Memory Dumps: Question icon for crash dumps
    cacheType: 'Crash Dumps',
    description: 'Removes crash dump files to free up significant disk space.',
    buttonText: 'Clear Files',
    color: '#0074D9',
    buttonColor: '#FF9500',
  },
  {
    id: 'update-cache',
    title: 'Clear Update Cache',
    icon: Monitor, // Update Cache: Monitor icon
    cacheType: 'Windows Updates',
    description: 'Removes cached Windows update files to save disk space.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#00D4FF',
  },
  {
    id: 'dns-cache',
    title: 'Clear DNS Cache',
    icon: Cloud, // DNS Cache: Cloud icon
    cacheType: 'Network Resolver',
    description: 'Clears cached DNS records to refresh network connectivity.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#00A3FF',
  },
];
