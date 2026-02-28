import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Monitor, Cpu, ArrowLeft, Copy, Info, Shield, Gamepad2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
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

const GameLibrary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const [selectedResPreset, setSelectedResPreset] = useState('Native');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9');
  const [activeTab, setActiveTab] = useState<'graphics' | 'launch' | 'system'>('graphics');

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
    if (!selectedGame) return { graphics: 0, launch: 0, system: 0 };
    return {
      graphics: selectedGame.recommended.graphics.settings.length,
      launch: selectedGame.recommended.launch.options.length,
      system: selectedGame.recommended.performance.tweaks.length,
    };
  }, [selectedGame]);

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
            {/* Dash Header */}
            <div className="gl-dash__header">
              <button className="gl-dash__back" onClick={() => setSelectedGame(null)}>
                <ArrowLeft size={18} />
              </button>
              <div className="gl-dash__hero-img-wrap">
                <img src={selectedGame.image} alt={selectedGame.title} className="gl-dash__hero-img" />
              </div>
              <div className="gl-dash__info">
                <span className="gl-dash__category">{selectedGame.category}</span>
                <h2 className="gl-dash__title">{selectedGame.title}</h2>
                <p className="gl-dash__desc">{selectedGame.description}</p>
              </div>
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
                  <span className="gl-dash__stat-val">{settingsCounts.system}</span>
                  <span className="gl-dash__stat-label">System</span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="gl-tabs">
              <button className={`gl-tab ${activeTab === 'graphics' ? 'gl-tab--active' : ''}`} onClick={() => setActiveTab('graphics')}>
                <Monitor size={15} />
                Graphics
              </button>
              <button className={`gl-tab ${activeTab === 'launch' ? 'gl-tab--active' : ''}`} onClick={() => setActiveTab('launch')}>
                <Cpu size={15} />
                Launch Options
              </button>
              <button className={`gl-tab ${activeTab === 'system' ? 'gl-tab--active' : ''}`} onClick={() => setActiveTab('system')}>
                <Shield size={15} />
                System
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

                {/* System Tab */}
                {activeTab === 'system' && (
                  <motion.div key="sys" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                    <div className="gl-sys-grid">
                      {selectedGame.recommended.performance.tweaks.map((t, i) => (
                        <div key={`${t.name}-${i}`} className="gl-sys-card">
                          <div className="gl-sys-card__head">
                            <span className="gl-sys-card__name">{t.name}</span>
                            <span className="gl-sys-card__val">{t.value}</span>
                          </div>
                          <p className="gl-sys-card__benefit">{t.benefit}</p>
                          <div className="gl-sys-card__bar" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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

export default GameLibrary;