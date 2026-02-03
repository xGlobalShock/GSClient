import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Settings, Zap, Monitor, Cpu, HardDrive, ArrowLeft, Copy, Download, Play, Sparkles, Info } from 'lucide-react';
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

  const categories = useMemo(() => ['All', ...Array.from(new Set(games.map(game => game.category)))], []);

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           game.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || game.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const handleGameClick = useCallback((game: Game) => {
    setSelectedGame(game);
  }, []);

  const handleCopySettings = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <div className="game-library-container">
      <AnimatePresence mode="wait">
        {!selectedGame ? (
          <motion.div
            key="library"
            className="library-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="library-header">
              <div className="header-content">
                <Sparkles className="header-icon" size={32} />
                <div>
                  <h1 className="library-title">
                    <span className="title-gradient">Games Optimization Hub</span>
                  </h1>
                  <p className="library-description">
                    Optimization Hub - Select a game to unlock peak performance
                  </p>
                </div>
              </div>
            </div>

            <div className="library-controls">
              <div className="search-box">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search your arsenal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="category-filters">
                {categories.map(category => (
                  <motion.button
                    key={category}
                    className={`filter-button ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="filter-glow"></span>
                    {category}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="games-grid">
              {filteredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  className="game-card"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleGameClick(game)}
                >
                  <div className="card-glow"></div>
                  <div className="game-card-image-container">
                    <img src={game.image} alt={game.title} className="game-card-image" />
                    <div className="image-overlay">
                      <Play className="play-icon" size={48} />
                      <span className="overlay-text">OPTIMIZE</span>
                    </div>
                  </div>
                  <div className="game-card-content">
                    <h3 className="game-card-title">{game.title}</h3>
                    <p className="game-card-description">{game.description}</p>
                    <div className="game-card-footer">
                      <span className="game-category">{game.category}</span>
                      <Zap className="optimize-indicator" size={16} />
                    </div>
                  </div>
                  <div className="card-border"></div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            className="game-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="dashboard-header">
              <button className="back-button" onClick={() => setSelectedGame(null)}>
                <ArrowLeft size={20} />
                <span>Back to Library</span>
              </button>
              <div className="game-header-info">
                <img src={selectedGame.image} alt={selectedGame.title} className="header-game-image" />
                <div className="header-text">
                  <h2 className="dashboard-title">{selectedGame.title}</h2>
                  <p className="dashboard-subtitle">{selectedGame.description}</p>
                </div>
              </div>
            </div>

            <div className="dashboard-content">
              {/* Graphics Settings Module */}
              <motion.div
                className="optimization-module"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="module-header">
                  <Monitor className="module-icon" size={24} />
                  <h3>{selectedGame.recommended.graphics.title}</h3>
                </div>
                <div className="settings-grid">
                  {selectedGame.recommended.graphics.settings.map((setting, index) => (
                    <div
                      key={`${setting.name}-${index}`}
                      className="setting-card"
                    >
                      <div className="setting-header">
                        <span className="setting-name">{setting.name}</span>
                        <span className="setting-value">{setting.value}</span>
                      </div>
                      <p className="setting-description">{setting.description}</p>
                      <div className="setting-indicator"></div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Launch Options Module */}
              <motion.div
                className="optimization-module"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="module-header">
                  <Cpu className="module-icon" size={24} />
                  <h3>{selectedGame.recommended.launch.title}</h3>
                </div>
                <div className="launch-options">
                  <div className="launch-combined">
                    <div className="combined-header">
                      <span>Combined Launch Options</span>
                      <div className="header-buttons">
                        {selectedGame.id === 'apex-legends' && (
                          <button 
                            className="show-commands-button"
                            onClick={() => setShowCommandsModal(true)}
                          >
                            <Info size={16} />
                            Show Commands
                          </button>
                        )}
                        <button 
                          className="copy-all-button"
                          onClick={() => handleCopySettings(
                            selectedGame.recommended.launch.options.map(o => o.flag).join(' ')
                          )}
                        >
                          <Copy size={16} />
                          Copy All
                        </button>
                      </div>
                    </div>
                    <code className="combined-code">
                      {selectedGame.recommended.launch.options.map(o => o.flag).join(' ')}
                    </code>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Commands Modal */}
      <AnimatePresence>
        {showCommandsModal && selectedGame?.id === 'apex-legends' && (
          <motion.div
            className="commands-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCommandsModal(false)}
          >
            <motion.div
              className="commands-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="commands-modal-header">
                <div className="modal-title-section">
                  <Info size={24} />
                  <h3>Available Apex Legends Commands</h3>
                </div>
                <button 
                  className="modal-close-button"
                  onClick={() => setShowCommandsModal(false)}
                >
                  <X size={24} />
                </button>
              </div>
              <div className="commands-modal-content">
                <p className="modal-description">
                  These are all the working launch options for Apex Legends. Copy individual commands or use the "Copy All" button for optimal performance.
                </p>
                <div className="commands-list">
                  {(selectedGame.id === 'apex-legends' ? apexAllCommands : selectedGame.recommended.launch.options).map((option, index) => (
                    <div
                      key={`${option.flag}-${index}`}
                      className="command-item"
                    >
                      <div className="command-header">
                        <code className="command-flag">{option.flag}</code>
                        <button
                          className="copy-command-button"
                          onClick={() => handleCopySettings(option.flag)}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      <p className="command-description">{option.description}</p>
                      <span className={`command-impact impact-${option.impact.toLowerCase()}`}>
                        Impact: {option.impact}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="modal-footer">
                  <button
                    className="modal-copy-all-button"
                    onClick={() => {
                      handleCopySettings(
                        selectedGame.recommended.launch.options.map(o => o.flag).join(' ')
                      );
                      setShowCommandsModal(false);
                    }}
                  >
                    <Copy size={16} />
                    Copy All Commands
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameLibrary;