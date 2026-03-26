import { LucideIcon } from 'lucide-react';
import regeditIcon from '../assets/Regedit.png';

export interface PerformanceTweak {
  id: string;
  title: string;
  icon: LucideIcon | string;
  category: string;
  description: string;
  buttonText: string;
  color: string;
  registryPath: string;
  registryKey: string;
  registryValue: number;
  toggleableKey?: string;
}

export const performanceTweaks: PerformanceTweak[] = [
  {
    id: 'irq-priority',
    title: 'IRQ Priority',
    icon: regeditIcon,
    category: 'System Timer',
    description: 'Boosts interrupt handling priority to reduce input latency in CPU-heavy games. Good for responsive gameplay.',
    buttonText: 'Apply Tweak',
    color: '#0074D9',
    registryPath: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl',
    registryKey: 'IRQ8Priority',
    registryValue: 1,
  },
    {
    id: 'win32-priority',
    title: 'Win32 Priority',
    icon: regeditIcon,
    category: 'Prioritization',
    description: 'Gives foreground apps higher scheduling priority to improve game responsiveness under CPU load.',
    buttonText: 'Apply Tweak',
    color: '#0074D9',
    registryPath: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl',
    registryKey: 'Win32PrioritySeparation',
    registryValue: 38,
  },
  {
    id: 'gpu-scheduling',
    title: 'GPU Scheduling',
    icon: regeditIcon,
    category: 'GPU Management',
    description: 'Enables hardware GPU scheduling to reduce CPU bottleneck on frame rendering and smooth out frame times in modern titles.',
    buttonText: 'Apply Tweak',
    color: '#0074D9',
    registryPath: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers',
    registryKey: 'HwSchMode',
    registryValue: 2,
  },
  {
    id: 'memory-compression',
    title: 'Disable Memory Compression',
    icon: regeditIcon,
    category: 'Memory',
    description: 'Disables RAM compression so game memory is used directly and CPU cycles are not used for compress/decompress overhead. Best for systems with ample RAM (16GB+).',
    buttonText: 'Apply Tweak',
    color: '#FF851B',
    registryPath: '',
    registryKey: '',
    registryValue: 0,
  },
  {
    id: 'network-interrupts',
    title: 'Network Interrupts',
    icon: regeditIcon,
    category: 'Connectivity',
    description: 'Prioritizes network processing in Windows for reduced ping variance in online games. Valuable for competitive multiplayer.',
    buttonText: 'Apply Tweak',
    color: '#0074D9',
    registryPath: 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NDIS\\Parameters',
    registryKey: 'ProcessorThrottleMode',
    registryValue: 1,
  },
  {
    id: 'fullscreen-optimization',
    title: 'Fullscreen Opt.',
    icon: regeditIcon,
    category: 'Performance',
    description: 'Disables Windows fullscreen optimization behavior to reduce input lag and compositing overhead in fullscreen games.',
    buttonText: 'Apply Tweak',
    color: '#0074D9',
    registryPath: 'HKCU:\\System\\GameConfigStore',
    registryKey: 'GameDVR_FSEBehaviorMonitorEnabled',
    registryValue: 0,
  },
  {
    id: 'usb-suspend',
    title: 'USB Suspend',
    icon: regeditIcon,
    category: 'Input Devices',
    description: 'Disables USB device sleep to prevent mouse/keyboard latency or dropouts during fast-paced gaming.',
    buttonText: 'Apply Tweak',
    color: '#0074D9',
    registryPath: 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB',
    registryKey: 'DisableSelectiveSuspend',
    registryValue: 1,
  },
  {
    id: 'game-dvr',
    title: 'Game DVR',
    icon: regeditIcon,
    category: 'Recording',
    description: 'Turns off background Game DVR recording to reduce CPU and disk overhead while playing games.',
    buttonText: 'Apply Tweak',
    color: '#0074D9',
    registryPath: 'HKCU:\\System\\GameConfigStore',
    registryKey: 'GameDVR_Enabled',
    registryValue: 0,
  },
];
