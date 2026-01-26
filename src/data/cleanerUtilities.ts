import { LucideIcon, Cpu, Triangle, Trash2, RotateCcw, HelpCircle, Monitor, Cloud } from 'lucide-react';

export interface CleanerUtility {
  id: string;
  title: string;
  icon: LucideIcon;
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
    icon: Cpu,
    cacheType: 'DXCache/GLCache',
    description: 'Clears shader cache to fix stuttering after game updates.',
    buttonText: 'Clear Cache',
    color: '#00FF00',
    buttonColor: '#00FF00',
  },
  {
    id: 'apex-shaders',
    title: 'Clear Apex Shaders',
    icon: Triangle,
    cacheType: 'Shader Cache',
    description: 'Clears psCache.pso to fix stuttering and improve performance.',
    buttonText: 'Clear Cache',
    color: '#FF6B35',
    buttonColor: '#FF6B35',
  },
  {
    id: 'temp-files',
    title: 'Clear Temp Files',
    icon: Trash2,
    cacheType: 'Temporary Files',
    description: 'Clears %temp% folder to free up disk space instantly.',
    buttonText: 'Clear Files',
    color: '#9D4EDD',
    buttonColor: '#9D4EDD',
  },
  {
    id: 'prefetch',
    title: 'Clear Prefetch',
    icon: RotateCcw,
    cacheType: 'Startup Cache',
    description: 'Clears prefetch cache to optimize system startup performance.',
    buttonText: 'Clear Cache',
    color: '#00A3FF',
    buttonColor: '#00A3FF',
  },
  {
    id: 'memory-dumps',
    title: 'Clear Memory Dumps',
    icon: HelpCircle,
    cacheType: 'Crash Dumps',
    description: 'Removes crash dump files to free up significant disk space.',
    buttonText: 'Clear Files',
    color: '#FF9500',
    buttonColor: '#FF9500',
  },
  {
    id: 'update-cache',
    title: 'Clear Update Cache',
    icon: Monitor,
    cacheType: 'Windows Updates',
    description: 'Removes cached Windows update files to save disk space.',
    buttonText: 'Clear Cache',
    color: '#00D4FF',
    buttonColor: '#00D4FF',
  },
  {
    id: 'dns-cache',
    title: 'Clear DNS Cache',
    icon: Cloud,
    cacheType: 'Network Resolver',
    description: 'Clears cached DNS records to refresh network connectivity.',
    buttonText: 'Clear Cache',
    color: '#00A3FF',
    buttonColor: '#00A3FF',
  },
];
