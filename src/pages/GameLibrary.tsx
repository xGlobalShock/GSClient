import React, { useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Monitor, Cpu, ArrowLeft, Copy, Info, Shield, Gamepad2, Download, Check, FileVideo, HardDrive, CheckCircle, XCircle, Zap } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import type { HardwareInfo } from '../App';
import { GAME_REQUIREMENTS } from '../data/gameRequirements';
import { compareHardware, quickVerdict, predictFps, type ComparisonResult, type OverallVerdict } from '../utils/hardwareCompare';
import '../styles/GameLibrary.css';
import valorantImg from '../assets/Valorant.jpg';
import rocketLeagueImg from '../assets/Rocket League Banner.jpg';
import overwatchImg from '../assets/Overwatch Banner.jpg';
import lolImg from '../assets/LoL Banner.jpg';
import fortniteImg from '../assets/Fortnite Banner.jpg';
import cs2Img from '../assets/CS2 Banner.jpg';
import codImg from '../assets/COD Banner.jpg';
import apexImg from '../assets/Apex Banner.jpg';

interface OptimizationSettings {
  graphics: {
    title: string;
    settings: { name: string; value: string; description: string }[];
  };
  launch: {
    title: string;
    options: { flag: string; description: string; impact: string }[];
  };
  performance: {
    title: string;
    tweaks: { name: string; value: string; benefit: string }[];
  };
}

/* ── Video Settings Presets ── */
interface VideoPreset {
  id: string;
  label: string;
  description: string;
  filename: string;
  content: string;
}

const VIDEO_PRESETS: Record<string, VideoPreset[]> = {
  'valorant': [
    { id: 'val-comp', label: 'Competitive (Low)', description: 'Max FPS, minimum visuals for ranked play', filename: 'valorant-competitive.cfg',
      content: 'EDisplayMode=Fullscreen\nResolution=1920x1080\nTextureQuality=med\nDetailQuality=low\nUIQuality=low\nAnisotropicFiltering=2x\nAntiAliasing=MSAA-2x\nVSync=Off\nFPSLimit=0\nMaterialQuality=low\nBloom=Off\nDistortion=Off\nShadows=Off' },
    { id: 'val-bal', label: 'Balanced (Medium)', description: 'Good visuals with solid FPS', filename: 'valorant-balanced.cfg',
      content: 'EDisplayMode=Fullscreen\nResolution=1920x1080\nTextureQuality=high\nDetailQuality=med\nUIQuality=med\nAnisotropicFiltering=4x\nAntiAliasing=MSAA-4x\nVSync=Off\nFPSLimit=0\nMaterialQuality=med\nBloom=On\nDistortion=On\nShadows=Medium' },
  ],
  'cs2': [
    { id: 'cs2-comp', label: 'Competitive (Stretched)', description: '4:3 stretched, all low for max FPS', filename: 'cs2-competitive.cfg',
      content: 'setting.gpu_level "0"\nsetting.gpu_mem_level "0"\nsetting.cpu_level "0"\nsetting.mat_vsync "0"\nsetting.mat_queue_mode "-1"\nsetting.r_fullscreen_gamma "2.2"\nresolution 1280x960\nfullscreen 1\nr_drawtracers_firstperson 1\nfps_max 0' },
    { id: 'cs2-vis', label: 'Visibility (Medium)', description: 'Balanced settings for clarity', filename: 'cs2-visibility.cfg',
      content: 'setting.gpu_level "1"\nsetting.gpu_mem_level "1"\nsetting.cpu_level "1"\nsetting.mat_vsync "0"\nresolution 1920x1080\nfullscreen 1\nsetting.csm_quality_level "1"\nsetting.r_player_visibility_mode "1"\nfps_max 0' },
  ],
  'apex-legends': [
    { id: 'apex-perf', label: 'Performance (Low)', description: 'All low, stretched res for max FPS', filename: 'apex-performance.cfg',
      content: 'setting.cl_gib_allow "0"\nsetting.cl_particle_fallback_multiplier "0"\nsetting.mat_depthfeather_enable "0"\nsetting.mat_forceaniso "1"\nsetting.csm_enabled "0"\nsetting.mat_postprocess_enable "0"\nsetting.r_visambient "0"\nsetting.volumetric_lighting "0"\nsetting.r_lod_switch_scale "0.5"\nfps_max 0' },
    { id: 'apex-bal', label: 'Balanced (Medium)', description: 'Good visuals with competitive performance', filename: 'apex-balanced.cfg',
      content: 'setting.cl_gib_allow "1"\nsetting.cl_particle_fallback_multiplier "1"\nsetting.mat_forceaniso "4"\nsetting.csm_enabled "1"\nsetting.csm_quality_level "1"\nsetting.mat_postprocess_enable "1"\nsetting.volumetric_lighting "0"\nfps_max 0' },
  ],
  'fortnite': [
    { id: 'fn-comp', label: 'Competitive (Performance)', description: 'Performance mode, low meshes', filename: 'fortnite-competitive.ini',
      content: '[/Script/FortniteGame.FortGameUserSettings]\nsg.ViewDistanceQuality=0\nsg.AntiAliasingQuality=0\nsg.ShadowQuality=0\nsg.PostProcessQuality=0\nsg.TextureQuality=0\nsg.EffectsQuality=0\nsg.FoliageQuality=0\nFrameRateLimit=0\nFullscreenMode=0' },
    { id: 'fn-bal', label: 'Balanced (Medium)', description: 'DirectX 11, medium settings', filename: 'fortnite-balanced.ini',
      content: '[/Script/FortniteGame.FortGameUserSettings]\nsg.ViewDistanceQuality=2\nsg.AntiAliasingQuality=2\nsg.ShadowQuality=1\nsg.PostProcessQuality=1\nsg.TextureQuality=2\nsg.EffectsQuality=1\nsg.FoliageQuality=1\nFrameRateLimit=0\nFullscreenMode=0' },
  ],
  'overwatch': [
    { id: 'ow-comp', label: 'Competitive (Low)', description: 'All low for maximum FPS', filename: 'overwatch-competitive.cfg',
      content: 'RenderScale=75\nTextureQuality=Low\nTextureFilteringQuality=Low-1x\nLocalFogDetail=Low\nDynamicReflections=Off\nShadowDetail=Off\nModelDetail=Low\nEffectsDetail=Low\nLightingQuality=Low\nAntialias=Off\nRefractionQuality=Low\nScreenshotQuality=1x\nTripleBuffering=Off\nVSync=Off\nFrameRateLimit=0' },
  ],
  'league-of-legends': [
    { id: 'lol-perf', label: 'Performance (Low)', description: 'Smoothest gameplay, all low', filename: 'lol-performance.cfg',
      content: '[Performance]\nGraphicsSlider=1\nShadowsEnabled=0\nCharacterQuality=1\nEnvironmentQuality=1\nEffectsQuality=1\nFrameCapType=0\nEnableHUDAnimations=0\nWaitForVerticalSync=0\nEnableGrassSwaying=0' },
  ],
  'rocket-league': [
    { id: 'rl-comp', label: 'Competitive (Performance)', description: 'Max FPS, minimal visual effects', filename: 'rocketleague-competitive.cfg',
      content: 'TextureDetail=Performance\nWorldDetail=Performance\nParticleDetail=Performance\nHighQualityShaders=False\nAmbientOcclusion=False\nDepthOfField=False\nBloom=False\nLightShafts=False\nLensFlares=False\nDynamicShadows=False\nMotionBlur=False\nWeatherFX=False\nTransparentGoalpost=True' },
  ],
  'cod': [
    { id: 'cod-comp', label: 'Competitive (Low)', description: 'Minimum settings for max FPS', filename: 'cod-competitive.cfg',
      content: 'TextureResolution=Low\nTextureFilter=Normal\nShadowMapResolution=Low\nCacheSunShadow=On\nParticleQuality=Low\nTessellation=Off\nWeatherGrid=Off\nSSAO=Off\nReflectionQuality=Off\nAntiAliasing=Off\nDepthOfField=Off\nMotionBlur=Off\nFilmGrain=0\nVSync=Off' },
  ],
};

interface Game {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  platform: string[];
  recommended: OptimizationSettings;
}

// Comprehensive Apex Legends command list for "Show Commands" modal
const apexAllCommands = [
  { flag: '-novid', description: 'Disables EA/Apex intro videos for faster startup', impact: 'High' },
  { flag: '+fps_max 0', description: 'Uncaps FPS for unlimited frame rates (may stutter above 200 FPS)', impact: 'High' },
  { flag: '+fps_max 144', description: 'Caps FPS to 144 to reduce GPU load and prevent stuttering', impact: 'High' },
  { flag: '+fps_max 200', description: 'Caps FPS to 200 for optimal balance of performance and smoothness', impact: 'High' },
  { flag: '-high', description: 'Starts game with high CPU priority (may cause issues on some systems)', impact: 'High' },
  { flag: '+cl_showpos 1', description: 'Displays position and velocity in top-left corner', impact: 'Low' },
  { flag: '+cl_showfps 4', description: 'Shows FPS and frame timing/latency information', impact: 'Low' },
  { flag: '-fullscreen', description: 'Forces exclusive fullscreen mode for better performance', impact: 'Medium' },
  { flag: '-no_render_on_input_thread', description: 'Essential for high-polling mice (2K/4K/8K Hz) to prevent stuttering', impact: 'High' },
  { flag: '+exec autoexec', description: 'Executes custom autoexec.cfg file from cfg folder', impact: 'Medium' },
  { flag: '-dxlevel 95', description: 'Forces DirectX 9 rendering (better for older hardware)', impact: 'Medium' },
  { flag: '+mat_letterbox_aspect_goal 0', description: 'Prevents black bars with custom resolutions (use with threshold)', impact: 'Low' },
  { flag: '+mat_letterbox_aspect_threshold 0', description: 'Prevents black bars with custom/stretched resolutions', impact: 'Low' },
  { flag: '+mat_minimize_on_alt_tab 1', description: 'Allows game to minimize when Alt-Tabbing', impact: 'Low' },
  { flag: '+cl_is_softened_locale 1', description: 'Reduces visual clutter for cleaner gameplay', impact: 'Low' }
];

const gameOptimizations: { [key: string]: OptimizationSettings } = {
  'valorant': {
    graphics: {
      title: 'Optimal Graphics Settings',
      settings: [
        { name: 'Display Mode', value: 'Fullscreen', description: 'Reduces input lag and maximizes FPS' },
        { name: 'Resolution', value: 'Native (1920x1080)', description: 'Best clarity without performance loss' },
        { name: 'Texture Quality', value: 'High', description: 'Minimal FPS impact, better visuals' },
        { name: 'Material Quality', value: 'Medium', description: 'Balanced performance and quality' },
        { name: 'Detail Quality', value: 'Low', description: 'Maximizes FPS, reduces visual clutter' },
        { name: 'UI Quality', value: 'Low', description: 'No gameplay impact' },
        { name: 'Anisotropic Filtering', value: '2x', description: 'Slight quality boost, minimal cost' },
        { name: 'Anti-Aliasing', value: 'MSAA 2x', description: 'Smooth edges without heavy FPS drop' },
        { name: 'V-Sync', value: 'Off', description: 'Eliminates input lag' },
        { name: 'FPS Limit', value: 'Uncapped', description: 'Maximum responsiveness' }
      ]
    },
    launch: {
      title: 'Launch Options',
      options: [
        { flag: '-novid', description: 'Skip intro videos for faster startup', impact: 'High' },
        { flag: '-high', description: 'Set process priority to high', impact: 'Medium' },
        { flag: '-threads [CPU_CORES]', description: 'Optimize for multi-core CPUs', impact: 'Medium' }
      ]
    },
    performance: {
      title: 'System Optimizations',
      tweaks: [
        { name: 'Game Mode', value: 'Enabled', benefit: 'Windows prioritizes game resources' },
        { name: 'Hardware Acceleration', value: 'Disabled in Discord', benefit: 'Frees up GPU resources' },
        { name: 'Background Apps', value: 'Minimized', benefit: 'More CPU/RAM for game' },
        { name: 'NVIDIA Reflex', value: 'Enabled + Boost', benefit: 'Lowest possible input lag' }
      ]
    }
  },
  'cs2': {
    graphics: {
      title: 'Optimal Graphics Settings',
      settings: [
        { name: 'Display Mode', value: 'Fullscreen', description: 'Lowest input lag' },
        { name: 'Resolution', value: '1280x960 (4:3 Stretched)', description: 'Competitive advantage, bigger targets' },
        { name: 'Global Shadow Quality', value: 'Low', description: 'See enemies in shadows better' },
        { name: 'Model / Texture Detail', value: 'Low', description: 'Maximum FPS' },
        { name: 'Effect Detail', value: 'Low', description: 'Less visual clutter' },
        { name: 'Shader Detail', value: 'Low', description: 'Performance boost' },
        { name: 'Multisampling Anti-Aliasing', value: '2x MSAA', description: 'Balance between clarity and FPS' },
        { name: 'FXAA Anti-Aliasing', value: 'Disabled', description: 'Can blur visuals' },
        { name: 'Vertical Sync', value: 'Disabled', description: 'No input lag' },
        { name: 'FPS Max', value: '0 (Unlimited)', description: 'Maximum performance' }
      ]
    },
    launch: {
      title: 'Launch Options',
      options: [
        { flag: '-novid -nojoy', description: 'Skip intro, disable joystick support', impact: 'High' },
        { flag: '-high', description: 'CPU priority boost', impact: 'High' },
        { flag: '+fps_max 0', description: 'Uncapped framerate', impact: 'High' },
        { flag: '-freq 240', description: 'Force 240Hz refresh rate', impact: 'Medium' },
        { flag: '+cl_forcepreload 1', description: 'Preload map assets', impact: 'Medium' }
      ]
    },
    performance: {
      title: 'System Optimizations',
      tweaks: [
        { name: 'NVIDIA Low Latency', value: 'Ultra', benefit: 'Minimizes render lag' },
        { name: 'Shader Cache', value: 'Enabled', benefit: 'Faster asset loading' },
        { name: 'Power Plan', value: 'High Performance', benefit: 'No CPU throttling' },
        { name: 'GPU Scaling', value: 'Disabled', benefit: 'Lower latency' }
      ]
    }
  },
  'apex-legends': {
    graphics: {
      title: 'Optimal Graphics Settings',
      settings: [
        { name: 'Display Mode', value: 'Fullscreen', description: 'Best performance' },
        { name: 'Aspect Ratio', value: '16:10', description: 'Optimal visibility' },
        { name: 'Resolution', value: '1728x1080 (Stretched)', description: 'Custom Nvidia resolution' },
        { name: 'FOV', value: '110', description: 'Maximum field of view' },
        { name: 'V-Sync', value: 'Disabled', description: 'Eliminates input lag' },
        { name: 'Adaptive Resolution FPS Target', value: '0', description: 'Prevents dynamic resolution' },
        { name: 'Anti-Aliasing', value: 'None', description: 'Maximum FPS' },
        { name: 'Texture Streaming Budget', value: 'Low', description: 'Adjust based on VRAM' },
        { name: 'Texture Filtering', value: 'Bilinear', description: 'Performance optimization' },
        { name: 'Ambient Occlusion Quality', value: 'Disabled', description: 'FPS boost' },
        { name: 'Sun Shadow Coverage', value: 'Low', description: 'See enemies better' },
        { name: 'Sun Shadow Detail', value: 'Low', description: 'Performance gain' },
        { name: 'Spot Shadow Detail', value: 'Disabled', description: 'Significant FPS boost' },
        { name: 'Volumetric Lighting', value: 'Disabled', description: 'Heavy FPS cost' },
        { name: 'Dynamic Spot Shadows', value: 'Disabled', description: 'Performance gain' },
        { name: 'Model Detail', value: 'Low', description: 'Maximum performance' },
        { name: 'Map Detail', value: 'Low', description: 'Performance boost' },
        { name: 'Effects Detail', value: 'Low', description: 'Less distracting effects' },
        { name: 'Impact Marks', value: 'Disabled', description: 'Additional performance' }
      ]
    },
    launch: {
      title: 'Launch Options',
      options: [
        { flag: '+lobby_max_fps 0', description: 'Uncaps FPS in lobby for smoother experience', impact: 'High' },
        { flag: '+fps_max 0', description: 'Uncaps FPS for unlimited frame rates', impact: 'High' },
        { flag: '-dev', description: 'Skips intro videos and enables developer startup mode', impact: 'High' },
        { flag: '-no_render_on_input_thread', description: 'Essential for high-polling mice to prevent stuttering', impact: 'High' }
      ]
    },
    performance: {
      title: 'System Optimizations',
      tweaks: [
        { name: 'Adaptive Resolution FPS Target', value: '0 (Disabled)', benefit: 'Prevents dynamic resolution' },
        { name: 'NVIDIA Reflex', value: 'Enabled', benefit: 'Lower system latency' },
        { name: 'Spot Shadow Detail', value: 'Off', benefit: 'Significant FPS boost' },
        { name: 'Ragdolls', value: 'Low', benefit: 'Performance improvement' }
      ]
    }
  }
};

const games: Game[] = [
  {
    id: 'apex-legends',
    title: 'Apex Legends',
    description: 'Fast-paced battle royale',
    category: 'Shooter',
    image: apexImg,
    platform: ['Windows', 'Cross-platform'],
    recommended: gameOptimizations['apex-legends']
  },
  {
    id: 'valorant',
    title: 'Valorant',
    description: 'Tactical 5v5 character-based FPS',
    category: 'Shooter',
    image: valorantImg,
    platform: ['Windows'],
    recommended: gameOptimizations['valorant']
  },
  {
    id: 'rocket-league',
    title: 'Rocket League',
    description: 'Competitive vehicular soccer',
    category: 'Sports',
    image: rocketLeagueImg,
    platform: ['Windows', 'Cross-platform'],
    recommended: gameOptimizations['valorant'] // Placeholder
  },
  {
    id: 'overwatch',
    title: 'Overwatch 2',
    description: 'Team-based hero shooter',
    category: 'Shooter',
    image: overwatchImg,
    platform: ['Windows'],
    recommended: gameOptimizations['valorant'] // Placeholder
  },
  {
    id: 'league-of-legends',
    title: 'League of Legends',
    description: 'Competitive MOBA arena',
    category: 'MOBA',
    image: lolImg,
    platform: ['Windows'],
    recommended: gameOptimizations['valorant'] // Placeholder
  },
  {
    id: 'fortnite',
    title: 'Fortnite',
    description: 'Battle royale with building',
    category: 'Battle Royale',
    image: fortniteImg,
    platform: ['Windows', 'Cross-platform'],
    recommended: gameOptimizations['valorant'] // Placeholder
  },
  {
    id: 'cs2',
    title: 'Counter-Strike 2',
    description: 'Legendary tactical FPS',
    category: 'Shooter',
    image: cs2Img,
    platform: ['Windows'],
    recommended: gameOptimizations['cs2']
  },
  {
    id: 'cod',
    title: 'Call of Duty',
    description: 'Modern warfare action FPS',
    category: 'Shooter',
    image: codImg,
    platform: ['Windows'],
    recommended: gameOptimizations['valorant'] // Placeholder
  }
];

interface GameLibraryProps {
  hardwareInfo?: HardwareInfo;
}

const GameLibrary: React.FC<GameLibraryProps> = ({ hardwareInfo }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [selectedResPreset, setSelectedResPreset] = useState('Native');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9');
  const [activeTab, setActiveTab] = useState<'graphics' | 'launch' | 'presets'>('graphics');
  const [downloadedPresets, setDownloadedPresets] = useState<Record<string, boolean>>({});
  const [downloadingPreset, setDownloadingPreset] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!tabsRef.current) return;
    const activeBtn = tabsRef.current.querySelector('.gl-tab--active') as HTMLElement;
    if (activeBtn) {
      setSliderStyle({ left: activeBtn.offsetLeft, width: activeBtn.offsetWidth });
    }
  }, [activeTab, selectedGame]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(games.map(game => game.category)))], []);

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           game.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || game.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const getResolutionForAspectRatio = useCallback((aspectRatio: string, preset: string) => {
    const resolutions: { [key: string]: { [key: string]: string } } = {
      '16:9': { 'Native': '1920x1080', '2K': '2560x1440', '3K': '3200x1800', '4K': '3840x2160' },
      '16:10': { 'Native': '1728x1080', '2K': '2304x1440', '3K': '2592x1620', '4K': '3456x2160' },
      '4:3': { 'Native': '1920x1440', '2K': '2560x1920', '3K': '2880x2160', '4K': '3840x2880' }
    };
    const resolution = resolutions[aspectRatio]?.[preset] || '1920x1080';
    return aspectRatio === '16:10' || aspectRatio === '4:3' ? `${resolution} (Stretched)` : resolution;
  }, []);

  const displayedGraphicsSettings = useMemo(() => {
    if (selectedGame?.id === 'apex-legends') {
      return selectedGame.recommended.graphics.settings.map(setting => {
        if (setting.name === 'Resolution') {
          return { ...setting, value: getResolutionForAspectRatio(selectedAspectRatio, selectedResPreset), description: selectedResPreset === 'Native' ? 'Optimal competitive resolution' : `${selectedResPreset} resolution` };
        }
        if (setting.name === 'Aspect Ratio') {
          return { ...setting, value: selectedAspectRatio, description: selectedAspectRatio === '16:10' ? 'Optimal visibility (stretched)' : selectedAspectRatio === '4:3' ? 'Maximum vertical FOV (stretched)' : 'Standard aspect ratio' };
        }
        return setting;
      });
    }
    return selectedGame?.recommended.graphics.settings || [];
  }, [selectedGame, selectedAspectRatio, selectedResPreset, getResolutionForAspectRatio]);

  const handleGameClick = useCallback((game: Game) => {
    setSelectedGame(game);
    setActiveTab('graphics');
  }, []);

  const handleCopySettings = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // Count settings for the selected game
  const settingsCounts = useMemo(() => {
    if (!selectedGame) return { graphics: 0, launch: 0, presets: 0 };
    const presets = VIDEO_PRESETS[selectedGame.id] || [];
    return {
      graphics: selectedGame.recommended.graphics.settings.length,
      launch: selectedGame.recommended.launch.options.length,
      presets: presets.length,
    };
  }, [selectedGame]);

  // Hardware comparison for selected game
  const comparisonResult: ComparisonResult | null = useMemo(() => {
    if (!selectedGame || !hardwareInfo) return null;
    const req = GAME_REQUIREMENTS[selectedGame.id];
    if (!req) return null;
    return compareHardware(hardwareInfo, req);
  }, [selectedGame, hardwareInfo]);

  // Quick verdicts for all games (card rings)
  const gameVerdicts = useMemo(() => {
    const map: Record<string, OverallVerdict | 'unknown'> = {};
    for (const g of games) {
      map[g.id] = quickVerdict(hardwareInfo, GAME_REQUIREMENTS[g.id]);
    }
    return map;
  }, [hardwareInfo]);

  const handleDownloadPreset = useCallback(async (preset: VideoPreset) => {
    if (!window.electron?.ipcRenderer) return;
    setDownloadingPreset(preset.id);
    try {
      const res: any = await window.electron.ipcRenderer.invoke('preset:save-video-settings', preset.filename, preset.content);
      if (res?.success) {
        setDownloadedPresets(prev => ({ ...prev, [preset.id]: true }));
      }
    } catch { /* ignore */ }
    setDownloadingPreset(null);
  }, []);

  return (
    <div className="gl-container">
      <PageHeader icon={<Gamepad2 size={16} />} title="Game Presets" />
      <AnimatePresence mode="wait">
        {!selectedGame ? (
          <motion.div
            key="library"
            className="gl-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* ── Controls ── */}
            <div className="gl-controls">
              <div className="gl-search">
                <Search className="gl-search__icon" size={16} />
                <input
                  type="text"
                  className="gl-search__input"
                  placeholder="Search games..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="gl-search__clear" onClick={() => setSearchTerm('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="gl-filters">
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`gl-filter ${selectedCategory === cat ? 'gl-filter--active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Game Grid ── */}
            <div className="gl-grid">
              {filteredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  className="gl-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  onClick={() => handleGameClick(game)}
                >
                  <div className="gl-card__img-wrap">
                    <img src={game.image} alt={game.title} className="gl-card__img" loading="lazy" />
                    <div className="gl-card__hover-overlay" />
                    <div className="gl-card__corner gl-card__corner--tl" />
                    <div className="gl-card__corner gl-card__corner--tr" />
                    <div className="gl-card__corner gl-card__corner--bl" />
                    <div className="gl-card__corner gl-card__corner--br" />
                    {/* Compatibility ring */}
                    {gameVerdicts[game.id] !== 'unknown' && (
                      <span className={`gl-card__compat gl-card__compat--${gameVerdicts[game.id]}`} title={
                        gameVerdicts[game.id] === 'exceeds' ? 'Exceeds recommended specs' :
                        gameVerdicts[game.id] === 'meets-recommended' ? 'Meets recommended specs' :
                        gameVerdicts[game.id] === 'meets-minimum' ? 'Meets minimum specs' :
                        'Below minimum specs'
                      } />
                    )}
                  </div>

                  <div className="gl-card__body">
                    <h3 className="gl-card__title">{game.title}</h3>
                    <p className="gl-card__desc">{game.description}</p>
                    <div className="gl-card__meta">
                      <span className="gl-card__badge">{game.category}</span>
                      <span className="gl-card__count">{game.recommended.graphics.settings.length} tweaks</span>
                    </div>
                  </div>
                  <div className="gl-card__glow" />
                </motion.div>
              ))}
            </div>

            {filteredGames.length === 0 && (
              <div className="gl-empty">
                <Search size={40} />
                <p>No games matched your search</p>
              </div>
            )}
          </motion.div>
        ) : (
          /* ── Game Detail Dashboard ── */
          <motion.div
            key="dashboard"
            className="gl-dash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Hero Banner Header */}
            <div className="gl-dash__header">
              <div className="gl-dash__header-bg">
                <img src={selectedGame.image} alt="" className="gl-dash__header-bg-img" />
                <div className="gl-dash__header-gradient" />
                <div className="gl-dash__header-scanline" />
              </div>
              <button className="gl-dash__back" onClick={() => setSelectedGame(null)}>
                <ArrowLeft size={18} />
              </button>
              <div className="gl-dash__header-content">
                <div className="gl-dash__info">
                  <span className="gl-dash__category">{selectedGame.category}</span>
                  <h2 className="gl-dash__title">{selectedGame.title}</h2>
                  <p className="gl-dash__desc">{selectedGame.description}</p>
                </div>
                <div className="gl-dash__chips">
                  <button className="gl-test-specs-btn" onClick={() => setShowSpecsModal(true)}>
                    <div className="gl-btn__wrap">
                      <div className="gl-btn__reflex"></div>
                      <div className="gl-btn__content">
                        <span className="gl-btn__text">
                          {'GAME BENCHMARK'.split('').map((ch, i) => (
                            <span key={i} style={{ '--i': i + 1 } as React.CSSProperties} data-label={ch === ' ' ? '\u00A0' : ch}>
                              {ch === ' ' ? '\u00A0' : ch}
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                    <div className="gl-btn__gears-clip">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 635 523">
                        <defs>
                          <filter id="gearFilter">
                            <feGaussianBlur result="blur" stdDeviation="5" in="SourceGraphic" />
                            <feColorMatrix result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8" type="matrix" in="blur" />
                            <feBlend in2="goo" in="SourceGraphic" />
                          </filter>
                        </defs>
                        <g filter="url(#gearFilter)">
                          <path className="gl-gear-lg gl-gear-shadow" d="M635 192V171L606 167C605 157 603 148 600 139L625 125L617 106L589 113C584 105 579 97 573 89L592 66L577 51L554 68C547 62 539 57 530 52L537 24L518 16L504 41C495 38 486 36 476 35L472 8H451L447 37C437 38 428 40 419 43L405 18L386 26L393 54C385 59 377 64 369 70L346 53L331 66L348 89C342 96 337 104 332 113L304 106L296 125L321 139C318 148 316 157 315 167L286 171V192L315 196C316 206 318 215 321 224L296 238L304 257L332 250C337 258 342 266 348 274L331 297L346 312L369 295C376 301 384 306 393 311L386 339L405 347L419 322C428 325 437 327 447 328L451 357H472L476 328C486 327 495 325 504 322L518 347L537 339L530 311C538 306 546 301 554 295L577 312L592 297L575 274C581 267 586 259 591 250L619 257L627 238L602 224C605 215 607 206 608 196L635 192ZM461 292C400 292 351 243 351 182C351 121 401 72 461 72C521 72 571 121 571 182C571 243 522 292 461 292Z" />
                          <path className="gl-gear-md gl-gear-shadow" d="M392 398V377L364 373C363 363 360 354 357 345L380 328L369 310L342 321C336 313 329 307 322 301L333 275L315 264L298 287C289 283 280 281 270 280L266 252H245L241 280C231 281 222 284 213 287L196 264L178 275L189 301C181 307 175 314 169 321L143 310L132 328L155 345C151 354 149 363 148 373L120 377V398L148 402C149 412 152 421 155 430L132 447L143 465L169 454C175 462 182 468 189 474L178 500L196 511L213 488C222 492 231 494 241 495L245 523H266L270 495C280 494 289 491 298 488L315 511L333 500L322 474C330 468 336 461 342 454L368 465L379 447L356 430C360 421 362 412 363 402L392 398ZM255 461C214 461 181 428 181 387C181 346 214 313 255 313C296 313 329 346 329 387C328 428 295 461 255 461Z" />
                          <path className="gl-gear-sm gl-gear-shadow" d="M200 244V223L171 219C169 209 165 201 160 193L178 170L163 155L140 173C132 168 123 164 114 162L110 133H90L86 162C76 164 68 168 60 173L37 155L22 170L40 193C35 201 31 210 29 219L0 223V244L29 248C31 258 35 266 40 274L22 297L37 312L60 294C68 299 77 303 86 305L90 334H111L115 305C125 303 133 299 141 294L164 312L179 297L161 274C166 266 170 257 172 248L200 244ZM100 270C80 270 63 253 63 233C63 213 80 196 100 196C120 196 137 213 137 233C137 253 121 270 100 270Z" />
                          <path className="gl-gear-lg" d="M635 184V163L606 159C605 149 603 140 600 131L625 117L617 98L589 105C584 97 579 89 573 81L592 58L577 43L554 60C547 54 539 49 530 44L537 16L518 8L504 33C495 30 486 28 476 27L472 0H451L447 29C437 30 428 32 419 35L405 9L386 17L393 45C385 50 377 55 369 61L346 44L331 58L348 81C342 88 337 96 332 105L304 98L296 117L321 131C318 140 316 149 315 159L286 163V184L315 188C316 198 318 207 321 216L296 230L304 249L332 242C337 250 342 258 348 266L331 289L346 304L369 287C376 293 384 298 393 303L386 331L405 339L419 314C428 317 437 319 447 320L451 349H472L476 320C486 319 495 317 504 314L518 339L537 331L530 303C538 298 546 293 554 287L577 304L592 289L575 266C581 259 586 251 591 242L619 249L627 230L602 216C605 207 607 198 608 188L635 184ZM461 284C400 284 351 235 351 174C351 113 401 64 461 64C521 64 571 113 571 174C571 235 522 284 461 284Z" />
                          <path className="gl-gear-md" d="M392 390V369L364 365C363 355 360 346 357 337L380 320L369 302L342 313C336 305 329 299 322 293L333 267L315 256L298 279C289 275 280 273 270 272L266 244H245L241 272C231 273 222 276 213 279L196 256L178 267L189 293C181 299 175 306 169 313L143 302L132 320L155 337C151 346 149 355 148 365L120 369V390L148 394C149 404 152 413 155 422L132 439L143 457L169 446C175 454 182 460 189 466L178 492L196 503L213 480C222 484 231 486 241 487L245 515H266L270 487C280 486 289 483 298 480L315 503L333 492L322 466C330 460 336 453 342 446L368 457L379 439L356 422C360 413 362 404 363 394L392 390ZM255 453C214 453 181 420 181 379C181 338 214 305 255 305C296 305 329 338 329 379C328 420 295 453 255 453Z" />
                          <path className="gl-gear-sm" d="M200 236V215L171 211C169 201 165 193 160 185L178 162L163 147L140 165C132 160 123 156 114 154L110 125H90L86 154C76 156 68 160 60 165L37 147L22 162L40 185C35 193 31 202 29 211L0 215V236L29 240C31 250 35 258 40 266L22 289L37 304L60 286C68 291 77 295 86 297L90 326H111L115 297C125 295 133 291 141 286L164 304L179 289L161 266C166 258 170 249 172 240L200 236ZM100 262C80 262 63 245 63 225C63 205 80 188 100 188C120 188 137 205 137 225C137 245 121 262 100 262Z" />
                        </g>
                      </svg>
                    </div>
                  </button>
                  <div className="gl-dash__stats">
                    <div className="gl-dash__stat">
                      <span className="gl-dash__stat-val">{settingsCounts.graphics}</span>
                      <span className="gl-dash__stat-label">Graphics</span>
                    </div>
                    <div className="gl-dash__stat">
                      <span className="gl-dash__stat-val">{settingsCounts.launch}</span>
                      <span className="gl-dash__stat-label">Launch</span>
                    </div>
                    <div className="gl-dash__stat">
                      <span className="gl-dash__stat-val">{settingsCounts.presets}</span>
                      <span className="gl-dash__stat-label">Presets</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="gl-dash__header-border" />
            </div>

            {/* Tab Navigation */}
            <div className="gl-tabs" ref={tabsRef}>
              <div className="gl-tab-slider" style={{ left: sliderStyle.left, width: sliderStyle.width }} />
              <button className={`gl-tab ${activeTab === 'graphics' ? 'gl-tab--active' : ''}`} onClick={() => setActiveTab('graphics')}>
                <Monitor size={15} />
                Graphics
              </button>
              <button className={`gl-tab ${activeTab === 'launch' ? 'gl-tab--active' : ''}`} onClick={() => setActiveTab('launch')}>
                <Cpu size={15} />
                Launch Options
              </button>
              <button className={`gl-tab ${activeTab === 'presets' ? 'gl-tab--active' : ''}`} onClick={() => setActiveTab('presets')}>
                <FileVideo size={15} />
                Video Settings Presets
              </button>
            </div>

            {/* Tab Content */}
            <div className="gl-tab-content">
              <AnimatePresence mode="wait">
                {/* Graphics Tab */}
                {activeTab === 'graphics' && (
                  <motion.div key="gfx" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                    {selectedGame.id === 'apex-legends' && (
                      <div className="gl-presets-bar">
                        <div className="gl-preset-group">
                          <span className="gl-preset-label">Aspect Ratio</span>
                          {['16:9', '16:10', '4:3'].map(r => (
                            <button key={r} className={`gl-preset-btn ${selectedAspectRatio === r ? 'gl-preset-btn--active' : ''}`} onClick={() => setSelectedAspectRatio(r)}>{r}</button>
                          ))}
                        </div>
                        <div className="gl-preset-group">
                          <span className="gl-preset-label">Resolution</span>
                          {['Native', '2K', '3K', '4K'].map(p => (
                            <button key={p} className={`gl-preset-btn ${selectedResPreset === p ? 'gl-preset-btn--active' : ''}`} onClick={() => setSelectedResPreset(p)}>{p}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="gl-settings-grid">
                      {displayedGraphicsSettings.map((s, i) => (
                        <div key={`${s.name}-${i}`} className="gl-setting">
                          <span className="gl-setting__idx">{String(i + 1).padStart(2, '0')}</span>
                          <div className="gl-setting__top">
                            <span className="gl-setting__name">{s.name}</span>
                            <span className="gl-setting__val">{s.value}</span>
                          </div>
                          <p className="gl-setting__desc">{s.description}</p>
                          <div className="gl-setting__rail" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Launch Tab */}
                {activeTab === 'launch' && (
                  <motion.div key="launch" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                    <div className="gl-launch-combined">
                      <div className="gl-launch-combined__header">
                        <span>Combined Launch String</span>
                        <div className="gl-launch-combined__actions">
                          {selectedGame.id === 'apex-legends' && (
                            <button className="gl-cmd-btn gl-cmd-btn--info" onClick={() => setShowCommandsModal(true)}>
                              <Info size={14} /> All Commands
                            </button>
                          )}
                          <button className="gl-cmd-btn gl-cmd-btn--copy" onClick={() => handleCopySettings(selectedGame.recommended.launch.options.map(o => o.flag).join(' '))}>
                            <Copy size={14} /> Copy All
                          </button>
                        </div>
                      </div>
                      <code className="gl-launch-combined__code">
                        {selectedGame.recommended.launch.options.map(o => o.flag).join(' ')}
                      </code>
                    </div>

                    <div className="gl-launch-list">
                      {selectedGame.recommended.launch.options.map((opt, i) => (
                        <div key={`${opt.flag}-${i}`} className="gl-launch-item">
                          <div className="gl-launch-item__head">
                            <code className="gl-launch-item__flag">{opt.flag}</code>
                            <span className={`gl-impact gl-impact--${opt.impact.toLowerCase()}`}>{opt.impact}</span>
                            <button className="gl-launch-item__copy" onClick={() => handleCopySettings(opt.flag)}>
                              <Copy size={13} />
                            </button>
                          </div>
                          <p className="gl-launch-item__desc">{opt.description}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Video Settings Presets Tab */}
                {activeTab === 'presets' && (
                  <motion.div key="presets" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                    {(VIDEO_PRESETS[selectedGame.id] || []).length > 0 ? (
                      <div className="gl-presets-grid">
                        {(VIDEO_PRESETS[selectedGame.id] || []).map((preset, i) => (
                          <div key={preset.id} className="gl-preset-card">
                            <div className="gl-preset-card__head">
                              <FileVideo size={18} className="gl-preset-card__icon" />
                              <div className="gl-preset-card__info">
                                <span className="gl-preset-card__label">{preset.label}</span>
                                <span className="gl-preset-card__file">{preset.filename}</span>
                              </div>
                            </div>
                            <p className="gl-preset-card__desc">{preset.description}</p>
                            <button
                              className={`gl-preset-card__btn ${downloadedPresets[preset.id] ? 'gl-preset-card__btn--done' : ''}`}
                              onClick={() => handleDownloadPreset(preset)}
                              disabled={downloadingPreset === preset.id}
                            >
                              {downloadedPresets[preset.id] ? (<><Check size={14} /> Saved</>) : downloadingPreset === preset.id ? 'Saving...' : (<><Download size={14} /> Download</>)}
                            </button>
                            <div className="gl-preset-card__rail" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="gl-empty gl-empty--sm">
                        <FileVideo size={32} />
                        <p>No video presets available for this game yet</p>
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Specs Modal */}
      <AnimatePresence>
        {showSpecsModal && selectedGame && (
          <motion.div
            className="gl-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSpecsModal(false)}
          >
            <motion.div
              className="gl-modal gl-modal--bench"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header bar ── */}
              <div className="gl-bench__topbar">
                <div className="gl-bench__topbar-left">
                  <Zap size={16} />
                  <span className="gl-bench__topbar-title">Game Benchmark</span>
                  <span className="gl-bench__topbar-sep">—</span>
                  <span className="gl-bench__topbar-game">{selectedGame.title}</span>
                </div>
                <button className="gl-modal__close" onClick={() => setShowSpecsModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="gl-bench__body">
                {comparisonResult ? (() => {
                  const req = GAME_REQUIREMENTS[selectedGame.id];
                  const rows: { label: string; icon: React.ReactNode; result: import('../utils/hardwareCompare').ComponentResult; minSpec: string; recSpec: string }[] = [
                    { label: 'CPU', icon: <Cpu size={14} />, result: comparisonResult.cpu, minSpec: req.minimum.cpu, recSpec: req.recommended.cpu },
                    { label: 'GPU', icon: <Monitor size={14} />, result: comparisonResult.gpu, minSpec: req.minimum.gpu, recSpec: req.recommended.gpu },
                    { label: 'RAM', icon: <HardDrive size={14} />, result: comparisonResult.ram, minSpec: `${req.minimum.ramGB} GB`, recSpec: `${req.recommended.ramGB} GB` },
                    { label: 'Storage', icon: <HardDrive size={14} />, result: comparisonResult.storage, minSpec: `${req.minimum.storageGB} GB`, recSpec: `${req.recommended.storageGB} GB` },
                  ];
                  if (comparisonResult.vram) {
                    rows.splice(2, 0, {
                      label: 'VRAM', icon: <Monitor size={14} />, result: comparisonResult.vram!,
                      minSpec: `${req.minimum.vramGB || 0} GB`, recSpec: `${req.recommended.vramGB || 0} GB`,
                    });
                  }
                  const fps = predictFps(comparisonResult, req);
                  const verdict = comparisonResult.overall;
                  const cap = Math.max(fps.yours.low, 300);
                  const verdictLabel = verdict === 'exceeds' ? 'Exceeds' : verdict === 'meets-recommended' ? 'Recommended' : verdict === 'meets-minimum' ? 'Minimum' : 'Below';
                  const verdictSub = verdict === 'exceeds' ? 'Your PC exceeds all recommended specs.' : verdict === 'meets-recommended' ? 'Meets recommended requirements.' : verdict === 'meets-minimum' ? 'Meets minimum specs only.' : 'Does not meet minimum specs.';
                  const passCount = rows.filter(r => r.result.verdict === 'exceeds' || r.result.verdict === 'meets').length;
                  const ringPct = Math.round((passCount / rows.length) * 100);

                  return (
                    <>
                      {/* ── Score + FPS row ── */}
                      <div className="gl-bench__hero">
                        {/* Circular score */}
                        <div className={`gl-bench__ring gl-bench__ring--${verdict}`}>
                          <svg viewBox="0 0 120 120" className="gl-bench__ring-svg">
                            <circle cx="60" cy="60" r="52" className="gl-bench__ring-track" />
                            <circle cx="60" cy="60" r="52" className="gl-bench__ring-fill"
                              strokeDasharray={`${(ringPct / 100) * 327} 327`}
                              strokeDashoffset="0"
                            />
                          </svg>
                          <div className="gl-bench__ring-inner">
                            <span className="gl-bench__ring-pct">{ringPct}%</span>
                            <span className="gl-bench__ring-label">{verdictLabel}</span>
                          </div>
                        </div>

                        {/* FPS tiers */}
                        <div className="gl-bench__fps-col">
                          <span className="gl-bench__fps-heading">Estimated FPS <span className="gl-bench__fps-res">1080p</span></span>
                          <div className="gl-fps-tiers">
                            {(['low', 'medium', 'high'] as const).map((q) => {
                              const yours = fps.yours[q];
                              const pct = Math.min(100, Math.max(0, (yours / cap) * 100));
                              return (
                                <div key={q} className={`gl-fps-tier gl-fps-tier--${verdict}`}>
                                  <span className="gl-fps-tier__quality">{q}</span>
                                  <div className="gl-fps-tier__hero">
                                    <span className="gl-fps-tier__tilde">~</span>
                                    <span className="gl-fps-tier__value">{yours}</span>
                                  </div>
                                  <span className="gl-fps-tier__unit">FPS</span>
                                  <div className="gl-fps-tier__bar">
                                    <div className="gl-fps-tier__fill" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <span className="gl-bench__verdict-sub">{verdictSub}</span>
                        </div>
                      </div>

                      {/* ── Hardware rows ── */}
                      <div className="gl-bench__hw">
                        {rows.map(row => {
                          const passed = row.result.verdict === 'exceeds' || row.result.verdict === 'meets';
                          return (
                            <div key={row.label} className={`gl-bench__hw-row gl-bench__hw-row--${row.result.verdict}`}>
                              <div className="gl-bench__hw-header">
                                <div className="gl-bench__hw-label">
                                  {row.icon}
                                  <span>{row.label}</span>
                                </div>
                                <span className={`gl-bench__hw-badge gl-bench__hw-badge--${passed ? 'pass' : 'fail'}`}>
                                  {passed ? <><CheckCircle size={11} /> Pass</> : <><XCircle size={11} /> Fail</>}
                                </span>
                              </div>
                              <span className="gl-bench__hw-val" title={row.result.userValue}>{row.result.userValue}</span>
                              <div className="gl-bench__hw-bar-wrap">
                                <div className={`gl-bench__hw-bar gl-bench__hw-bar--${row.result.verdict}`} style={{ width: `${row.result.percent}%` }} />
                              </div>
                              <div className="gl-bench__hw-specs">
                                <span title={row.minSpec}><em>Minimum:</em> {row.minSpec}</span>
                                <span title={row.recSpec}><em>Recommended:</em> {row.recSpec}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <span className="gl-fps-disclaimer">* FPS estimates are approximate at 1080p. Actual performance may vary.</span>
                    </>
                  );
                })() : (
                  <div className="gl-empty gl-empty--sm">
                    <HardDrive size={32} />
                    <p>{!hardwareInfo ? 'Detecting hardware…' : 'No requirement data available for this game.'}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Commands Modal */}
      <AnimatePresence>
        {showCommandsModal && selectedGame?.id === 'apex-legends' && (
          <motion.div
            className="gl-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCommandsModal(false)}
          >
            <motion.div
              className="gl-modal"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="gl-modal__header">
                <div className="gl-modal__title-wrap">
                  <Info size={20} />
                  <h3>Apex Legends — All Commands</h3>
                </div>
                <button className="gl-modal__close" onClick={() => setShowCommandsModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="gl-modal__body">
                <p className="gl-modal__desc">All verified launch options. Copy individual flags or grab the full string.</p>
                <div className="gl-modal__list">
                  {apexAllCommands.map((opt, i) => (
                    <div key={`${opt.flag}-${i}`} className="gl-modal__item">
                      <div className="gl-modal__item-head">
                        <code className="gl-modal__item-flag">{opt.flag}</code>
                        <span className={`gl-impact gl-impact--${opt.impact.toLowerCase()}`}>{opt.impact}</span>
                        <button className="gl-modal__item-copy" onClick={() => handleCopySettings(opt.flag)}>
                          <Copy size={13} />
                        </button>
                      </div>
                      <p className="gl-modal__item-desc">{opt.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="gl-modal__footer">
                <button className="gl-cmd-btn gl-cmd-btn--copy" onClick={() => { handleCopySettings(selectedGame.recommended.launch.options.map(o => o.flag).join(' ')); setShowCommandsModal(false); }}>
                  <Copy size={15} /> Copy All Commands
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(GameLibrary);