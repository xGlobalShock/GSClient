export interface ObsPreset {
  id: string;
  name: string;
  description: string;
  features: string[];
  icon: string;
  color: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export const OBS_PRESETS: ObsPreset[] = [
  {
    id: 'basic',
    name: 'Basic OBS',
    description: 'Perfect for beginners. A simple, clean setup with one main scene and essential sources.',
    features: [
      '1 Main Scene',
      'Display/Game Capture',
      'Microphone Input',
      'Desktop Audio',
      'Basic Scene Transitions',
    ],
    icon: '📺',
    color: '#00D4FF',
    difficulty: 'Beginner',
  },
  {
    id: 'multiStreaming',
    name: 'Multi Streaming OBS',
    description: 'Integrated with StreamElements. Perfect for streaming to multiple platforms simultaneously.',
    features: [
      'StreamElements Integration',
      'Multi-Platform Setup',
      'Chat Overlay Ready',
      'Alert System',
      'Custom Overlays',
      'Scene Collection Setup',
    ],
    icon: '🌐',
    color: '#FF00FF',
    difficulty: 'Intermediate',
  },
  {
    id: 'full',
    name: 'Full OBS',
    description: 'Complete professional setup with advanced features, plugins, and optimizations.',
    features: [
      'Advanced Scene Management',
      'Multi-Source Setup',
      'Professional Overlays',
      'Advanced Filters',
      'Hotkeys Configuration',
      'Recording Profiles',
      'Stream Deck Integration',
    ],
    icon: '⭐',
    color: '#C89B3C',
    difficulty: 'Advanced',
  },
  {
    id: 'gaming',
    name: 'Gaming OBS',
    description: 'Optimized for game streaming with performance-focused settings and gaming overlays.',
    features: [
      'Game Capture Optimized',
      'Performance Profiles',
      'FPS Counter',
      'Gaming Overlay',
      'Multi-Camera Setup',
      'Stream Chat Integration',
      'Quick Switching Scenes',
    ],
    icon: '🎮',
    color: '#00FF88',
    difficulty: 'Intermediate',
  },
];
