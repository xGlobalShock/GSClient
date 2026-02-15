import PrefetchLogo from '../assets/Prefetch.png';
import { Cpu, Warning, Trash, ArrowCounterClockwise, Question, Monitor, Cloud } from 'phosphor-react';
import ForzaLogo from '../assets/Forza.png';
import ApexLogo from '../assets/Apex legends.png';
import NvidiaLogo from '../assets/nvidia.png';
import DNSLogo from '../assets/DNS.png';
import TempFilesLogo from '../assets/TempFiles.png';
import WinUpdatesLogo from '../assets/WinUpdates.png';

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
      id: 'forza-shaders',
      title: 'Clear Forza Horizon 5 Shaders',
      icon: ForzaLogo, // Use Forza logo asset
      cacheType: 'Forza Shader Cache',
      description: 'Clears Forza Horizon 5 shader cache to fix stuttering and graphics issues.',
      buttonText: 'Clear Cache',
      color: '#0074D9',
      buttonColor: '#27ae60',
    },
  {
    id: 'nvidia-cache',
    title: 'Clear NVIDIA Cache',
    icon: NvidiaLogo, // NVIDIA Cache: Nvidia logo (local)
    cacheType: 'DXCache/GLCache',
    description: 'Clears shader cache to fix stuttering after game updates.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#00FF00',
  },
  {
    id: 'apex-shaders',
    title: 'Clear Apex Shaders',
    icon: ApexLogo, // Use Apex logo asset
    cacheType: 'Shader Cache',
    description: 'Clears psCache.pso to fix stuttering and improve performance.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#FF6B35',
  },
  {
    id: 'temp-files',
    title: 'Clear Temp Files',
    icon: TempFilesLogo, // Temp Files: new icon
    cacheType: 'Temporary Files',
    description: 'Clears %temp% folder to free up disk space instantly.',
    buttonText: 'Clear Files',
    color: '#0074D9',
    buttonColor: '#9D4EDD',
  },
  {
    id: 'prefetch',
    title: 'Clear Prefetch',
    icon: PrefetchLogo, // Prefetch: new icon
    cacheType: 'Startup Cache',
    description: 'Clears prefetch cache to optimize system startup performance.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#00A3FF',
  },
  {
    id: 'update-cache',
    title: 'Clear Update Cache',
    icon: WinUpdatesLogo, // Update Cache: new icon
    cacheType: 'Windows Updates',
    description: 'Removes cached Windows update files to save disk space.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#00D4FF',
  },
  {
    id: 'dns-cache',
    title: 'Clear DNS Cache',
    icon: DNSLogo, // DNS Cache: new icon
    cacheType: 'Network Resolver',
    description: 'Clears cached DNS records to refresh network connectivity.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#00A3FF',
  },
  {
    id: 'ram-cache',
    title: 'Clear RAM Cache',
    icon: Cpu, // RAM Cache: CPU/memory icon
    cacheType: 'Memory Cache',
    description: 'Clears cached RAM to free up memory and improve performance.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#FF00FF',
  },
];
