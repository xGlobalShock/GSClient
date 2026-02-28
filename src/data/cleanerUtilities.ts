// phospor-react icons (only used for windows cache)
import {
  Cpu,
  Trash,
  FileText,
  ArrowCounterClockwise,
  DownloadSimple,
  GlobeHemisphereEast,
  FolderSimple
} from 'phosphor-react';

// bring back game & nvidia asset logos
import PrefetchLogo from '../assets/Prefetch.png';
import ForzaLogo from '../assets/Forza.png';
import ApexLogo from '../assets/Apex legends.png';
import NvidiaLogo from '../assets/nvidia.png';
import CODLogo from '../assets/COD Banner.jpg';
import CS2Logo from '../assets/CS2 Banner.jpg';
import FortniteLogo from '../assets/Fortnite Banner.jpg';
import LoLLogo from '../assets/LoL Banner.jpg';
import OverwatchLogo from '../assets/Overwatch Banner.jpg';
import R6Logo from '../assets/R6 Banner.jpg';
import RocketLeagueLogo from '../assets/Rocket League Banner.jpg';
import ValorantLogo from '../assets/Valorant.jpg';

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
      icon: ForzaLogo,
      cacheType: 'Forza Shader Cache',
      description: 'Removes temporary graphics data to help the game run smoother.',
      buttonText: 'Clear Cache',
      color: '#0074D9',
      buttonColor: '#27ae60',
    },
  {
    id: 'nvidia-cache',
    title: 'Clear NVIDIA Cache',
    icon: NvidiaLogo,
    cacheType: 'DXCache/GLCache',
    description: 'Clears out stored game data that may impact performance.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#00FF00',
  },
  {
    id: 'apex-shaders',
    title: 'Clear Apex Shaders',
    icon: ApexLogo,
    cacheType: 'Shader Cache',
    description: 'Wipes old cached files to keep performance optimal.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#FF6B35',
  },
  {
    id: 'cod-shaders',
    title: 'Clear Call of Duty Shaders',
    icon: CODLogo,
    cacheType: 'Shader Cache',
    description: 'Removes cached files that can cause lag or glitches.',
    buttonText: 'Clear Cache',
    color: '#000000',
    buttonColor: '#27ae60',
  },
  {
    id: 'cs2-shaders',
    title: 'Clear CS2 Shaders',
    icon: CS2Logo,
    cacheType: 'Shader Cache',
    description: 'Erases temporary game data to maintain smooth gameplay.',
    buttonText: 'Clear Cache',
    color: '#1B1B1B',
    buttonColor: '#27ae60',
  },
  {
    id: 'fortnite-shaders',
    title: 'Clear Fortnite Shaders',
    icon: FortniteLogo,
    cacheType: 'Shader Cache',
    description: 'Purges cached files to help boost frame rates.',
    buttonText: 'Clear Cache',
    color: '#3B82F6',
    buttonColor: '#27ae60',
  },
  {
    id: 'lol-shaders',
    title: 'Clear LoL Shaders',
    icon: LoLLogo,
    cacheType: 'Shader Cache',
    description: 'Removes old resource files to improve responsiveness.',
    buttonText: 'Clear Cache',
    color: '#0A7EBB',
    buttonColor: '#27ae60',
  },
  {
    id: 'overwatch-shaders',
    title: 'Clear Overwatch 2 Shaders',
    icon: OverwatchLogo,
    cacheType: 'Shader Cache',
    description: 'Deletes temporary game files that may slow things down.',
    buttonText: 'Clear Cache',
    color: '#F4A300',
    buttonColor: '#27ae60',
  },
  {
    id: 'r6-shaders',
    title: 'Clear Rainbow Six Siege Shaders',
    icon: R6Logo,
    cacheType: 'Shader Cache',
    description: 'Clears stored game data to avoid hiccups or crashes.',
    buttonText: 'Clear Cache',
    color: '#FFA500',
    buttonColor: '#27ae60',
  },
  {
    id: 'rocket-league-shaders',
    title: 'Clear Rocket League Shaders',
    icon: RocketLeagueLogo,
    cacheType: 'Shader Cache',
    description: 'Wipes temporary graphics files for smoother play.',
    buttonText: 'Clear Cache',
    color: '#4169E1',
    buttonColor: '#27ae60',
  },
  {
    id: 'valorant-shaders',
    title: 'Clear Valorant Shaders',
    icon: ValorantLogo,
    cacheType: 'Shader Cache',
    description: 'Removes cached files to help maintain stable performance.',
    buttonText: 'Clear Cache',
    color: '#FF4655',
    buttonColor: '#27ae60',
  },
  {
    id: 'temp-files',
    title: 'Clear Temp Files',
    icon: FileText,
    cacheType: 'Temporary Files',
    description: 'Removes temporary system files to quickly recover storage space.',
    buttonText: 'Clear Files',
    color: '#0074D9',
    buttonColor: '#9D4EDD',
  },
  {
    id: 'prefetch',
    title: 'Clear Prefetch',
    icon: ArrowCounterClockwise,
    cacheType: 'Startup Cache',
    description: 'Clears prefetch cache to optimize system startup performance.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#00A3FF',
  },
  {
    id: 'update-cache',
    title: 'Clear Update Cache',
    icon: DownloadSimple,
    cacheType: 'Windows Updates',
    description: 'Removes cached Windows update files to save disk space.',
    buttonText: 'Clear Cache',
    color: '#0074D9',
    buttonColor: '#00D4FF',
  },
  {
    id: 'dns-cache',
    title: 'Clear DNS Cache',
    icon: GlobeHemisphereEast,
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
  {
    id: 'recycle-bin',
    title: 'Empty Recycle Bin',
    icon: Trash, // Trash icon for recycle bin
    cacheType: 'Recycle Bin',
    description: 'Permanently empties the recycle bin to free up disk space.',
    buttonText: 'Empty Bin',
    color: '#0074D9',
    buttonColor: '#E74C3C',
  },
];
