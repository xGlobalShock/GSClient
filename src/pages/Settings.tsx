import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Settings.css';
import { loadSettings, saveSettings } from '../utils/settings';
import {
  Zap, Palette, Layers, Monitor, AlertTriangle, Info,
  RefreshCw, CheckCircle, ArrowUpCircle, ChevronRight,
} from 'lucide-react';

type Section = 'startup' | 'appearance' | 'overlay' | 'rendering' | 'about';

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'startup',    label: 'Startup',    icon: <Zap size={15} />,     desc: 'Boot behavior'       },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={15} />, desc: 'Theme & display'     },
  { id: 'overlay',    label: 'Overlay',    icon: <Layers size={15} />,  desc: 'FPS HUD'             },
  { id: 'rendering',  label: 'Rendering',  icon: <Monitor size={15} />, desc: 'GPU acceleration'    },
  { id: 'about',      label: 'About',      icon: <Info size={15} />,    desc: 'Version & updates'   },
];

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('startup');
  const [settings, setSettings] = useState(() => {
    const saved = loadSettings();
    return {
      autoCleanupOnStartup: saved.autoCleanupOnStartup ?? false,
      theme: saved.theme ?? 'dark',
    };
  });
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [gpuStatus, setGpuStatus] = useState<{ status: string; renderer: string; detail: string } | null>(null);
  const [checkState, setCheckState] = useState<'idle' | 'checking' | 'up-to-date' | 'available'>('idle');
  const [checkVersion, setCheckVersion] = useState('');

  // Overlay state
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');
  const ipc = (window as any).electron?.ipcRenderer;

  useEffect(() => {
    window.electron?.updater?.getVersion().then((v: string) => {
      if (v) setAppVersion(v);
    }).catch(() => {});

    // Fetch GPU rendering status
    (window as any).electron?.gpu?.getStatus().then((s: any) => {
      if (s) setGpuStatus(s);
    }).catch(() => {});

    const unsub = (window as any).electron?.gpu?.onStatusChanged((s: any) => {
      if (s) setGpuStatus(s);
    });

    // Load overlay state
    ipc?.invoke('overlay:get-state').then((state: any) => {
      if (state) {
        setOverlayVisible(state.visible);
        if (state.config?.position) setOverlayPosition(state.config.position);
      }
    }).catch(() => {});

    // Keep toggle in sync when the hotkey is used
    const unsubOverlay = ipc?.on?.('overlay:state-changed', (visible: boolean) => {
      setOverlayVisible(!!visible);
    });

    return () => {
      unsub?.();
      if (typeof unsubOverlay === 'function') unsubOverlay();
    };
  }, []);

  useEffect(() => {
    const s = loadSettings();
    setSettings(prev => ({ ...prev, ...s }));

    const onUpdated = (e: Event) => {
      try {
        // @ts-ignore
        const detail = (e as CustomEvent)?.detail || {};
        setSettings(prev => ({ ...prev, ...detail }));
      } catch {}
    };

    window.addEventListener('settings:updated', onUpdated as EventListener);
    return () => window.removeEventListener('settings:updated', onUpdated as EventListener);
  }, []);

  const handleToggle = (key: keyof typeof settings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveSettings(updated as any);
  };

  const handleCheckUpdate = async () => {
    const updater = window.electron?.updater;
    if (!updater || checkState === 'checking') return;

    setCheckState('checking');

    let resolved = false;
    let unsubFn: (() => void) | null = null;

    const resolve = (state: 'up-to-date' | 'available' | 'idle', version = '') => {
      if (resolved) return;
      resolved = true;
      setCheckState(state);
      if (version) setCheckVersion(version);
      unsubFn?.();
    };

    unsubFn = updater.onStatus((data: any) => {
      if (data.event === 'not-available') resolve('up-to-date');
      else if (data.event === 'available') resolve('available', data.version || '');
      else if (data.event === 'error') resolve('idle');
    });

    // Safety net: never stay stuck longer than 10 seconds
    const timer = setTimeout(() => resolve('idle'), 10000);

    try {
      const result = await updater.checkForUpdates();
      clearTimeout(timer);
      // Fallback for dev mode where status events are never fired
      if (!resolved) {
        if (result?.dev || result?.event === 'not-available') resolve('up-to-date');
        else resolve('idle');
      }
    } catch {
      clearTimeout(timer);
      resolve('idle');
    }
  };

  const handleOverlayToggle = async () => {
    try {
      const res = await ipc?.invoke('overlay:toggle');
      if (res) setOverlayVisible(res.visible);
    } catch {}
  };

  const handleOverlayPosition = async (pos: typeof overlayPosition) => {
    setOverlayPosition(pos);
    try {
      await ipc?.invoke('overlay:set-config', { position: pos });
    } catch {}
  };

  return (
    <motion.div
      className="settings-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <div className="settings-layout">

        {/* ── Left Navigation ── */}
        <nav className="settings-nav">
          <div className="settings-nav-header">
            <span className="settings-nav-title">SETTINGS</span>
          </div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`settings-nav-item${activeSection === item.id ? ' settings-nav-item--active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="settings-nav-icon">{item.icon}</span>
              <span className="settings-nav-text">
                <span className="settings-nav-label">{item.label}</span>
                <span className="settings-nav-desc">{item.desc}</span>
              </span>
              <ChevronRight size={11} className="settings-nav-arrow" />
            </button>
          ))}
        </nav>

        {/* ── Content Area ── */}
        <div className="settings-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              className="settings-panel"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.12 }}
            >

              {/* STARTUP */}
              {activeSection === 'startup' && (
                <>
                  <div className="panel-header">
                    <span className="panel-header-icon"><Zap size={18} /></span>
                    <div>
                      <h2 className="panel-title">Startup</h2>
                      <p className="panel-subtitle">Configure app launch behavior</p>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="setting-row">
                      <div className="setting-row-info">
                        <span className="setting-row-title">Auto Cleanup Toolkit</span>
                        <span className="setting-row-desc">Automatically run Windows cache cleanup each time the app launches</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={!!settings.autoCleanupOnStartup}
                          onChange={() => handleToggle('autoCleanupOnStartup')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* APPEARANCE */}
              {activeSection === 'appearance' && (
                <>
                  <div className="panel-header">
                    <span className="panel-header-icon"><Palette size={18} /></span>
                    <div>
                      <h2 className="panel-title">Appearance</h2>
                      <p className="panel-subtitle">Customize the visual style</p>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="setting-row">
                      <div className="setting-row-info">
                        <span className="setting-row-title">Theme</span>
                        <span className="setting-row-desc">Choose your preferred color theme</span>
                      </div>
                      <select
                        className="theme-select"
                        value={settings.theme}
                        onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' }))}
                      >
                        <option value="dark">Dark (Default)</option>
                        <option value="light">Light</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* OVERLAY */}
              {activeSection === 'overlay' && (
                <>
                  <div className="panel-header">
                    <span className="panel-header-icon"><Layers size={18} /></span>
                    <div>
                      <h2 className="panel-title">Overlay</h2>
                      <p className="panel-subtitle">Real-time in-game FPS HUD</p>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="setting-row">
                      <div className="setting-row-info">
                        <span className="setting-row-title">Enable FPS Overlay</span>
                        <span className="setting-row-desc">
                          Show real-time stats in-game · <kbd className="overlay-hotkey">Ctrl+Shift+F</kbd>
                        </span>
                      </div>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={overlayVisible} onChange={handleOverlayToggle} />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="setting-row setting-row--block">
                      <div className="setting-row-info">
                        <span className="setting-row-title">Overlay Position</span>
                        <span className="setting-row-desc">Where to anchor the HUD on screen</span>
                      </div>
                      <div className="overlay-pos-grid">
                        {([
                          ['top-left',     '↖', 'Top Left'    ],
                          ['top-right',    '↗', 'Top Right'   ],
                          ['bottom-left',  '↙', 'Bottom Left' ],
                          ['bottom-right', '↘', 'Bottom Right'],
                        ] as const).map(([pos, arrow, label]) => (
                          <button
                            key={pos}
                            className={`overlay-pos-btn${overlayPosition === pos ? ' overlay-pos-btn--active' : ''}`}
                            onClick={() => handleOverlayPosition(pos)}
                          >
                            <span className="overlay-pos-arrow">{arrow}</span>
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="overlay-note">
                      Works in <strong>Borderless Windowed</strong> mode. Exclusive fullscreen bypasses the compositor.
                    </div>
                  </div>
                </>
              )}

              {/* RENDERING */}
              {activeSection === 'rendering' && (
                <>
                  <div className="panel-header">
                    <span className="panel-header-icon"><Monitor size={18} /></span>
                    <div>
                      <h2 className="panel-title">Rendering</h2>
                      <p className="panel-subtitle">GPU acceleration & renderer status</p>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className={`gpu-card ${gpuStatus?.status === 'crashed' ? 'gpu-card--crashed' : 'gpu-card--active'}`}>

                      {/* Scan-line accent */}
                      <div className="gpu-card-scanline" />

                      {/* Top row: icon + title + badge */}
                      <div className="gpu-card-top">
                        <div className="gpu-card-icon">
                          {gpuStatus?.status === 'crashed'
                            ? <AlertTriangle size={24} />
                            : <Monitor size={24} />
                          }
                        </div>
                        <div className="gpu-card-title-group">
                          <span className="gpu-card-title">Hardware Acceleration</span>
                          <span className="gpu-card-sub">Electron Chromium Renderer</span>
                        </div>
                        <div className="gpu-card-status-pill">
                          <span className="gpu-card-status-dot" />
                          {gpuStatus?.status === 'crashed' ? 'CRASHED' : 'ACTIVE'}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="gpu-card-divider" />

                      {/* Info rows */}
                      <div className="gpu-card-rows">
                        <div className="gpu-card-row">
                          <span className="gpu-card-row-key">Acceleration</span>
                          <span className="gpu-card-row-val">
                            {gpuStatus?.status === 'crashed' ? 'Disabled — GPU process crashed' : 'Hardware-accelerated'}
                          </span>
                        </div>
                        <div className="gpu-card-row">
                          <span className="gpu-card-row-key">Compositing</span>
                          <span className="gpu-card-row-val">
                            {gpuStatus?.status === 'crashed' ? 'Software fallback' : 'GPU compositing'}
                          </span>
                        </div>
                        <div className="gpu-card-row">
                          <span className="gpu-card-row-key">Status</span>
                          <span className={`gpu-card-row-val ${gpuStatus?.status === 'crashed' ? 'gpu-val--error' : 'gpu-val--ok'}`}>
                            {gpuStatus?.status === 'crashed' ? 'Requires restart to recover' : 'Running normally'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ABOUT */}
              {activeSection === 'about' && (
                <>
                  <div className="panel-header">
                    <span className="panel-header-icon"><Info size={18} /></span>
                    <div>
                      <h2 className="panel-title">About</h2>
                      <p className="panel-subtitle">Version info & updates</p>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="about-card">
                      <div className="about-card-logo">GS</div>
                      <div className="about-card-info">
                        <span className="about-card-name">GS Center</span>
                        <span className="about-card-desc">Advanced system optimization tool with gaming focus</span>
                      </div>
                      <div className="about-card-version">
                        <span className="about-version-label">VERSION</span>
                        <span className="about-version-value">{appVersion}</span>
                      </div>
                    </div>

                    <div className="update-section">
                      <div className="update-section-label">Software Updates</div>
                      <div className="update-action-row">
                        <button
                          className={`update-check-btn${checkState === 'checking' ? ' update-check-btn--checking' : checkState === 'up-to-date' ? ' update-check-btn--ok' : checkState === 'available' ? ' update-check-btn--available' : ''}`}
                          onClick={handleCheckUpdate}
                          disabled={checkState === 'checking'}
                        >
                          {checkState === 'checking'  && <><RefreshCw size={13} className="spin" /> Checking...</>}
                          {checkState === 'up-to-date' && <><CheckCircle size={13} /> Up to Date</>}
                          {checkState === 'available'  && <><ArrowUpCircle size={13} /> v{checkVersion} Available</>}
                          {checkState === 'idle'       && 'Check for Updates'}
                        </button>
                        {checkState === 'available' && (
                          <span className="update-hint">See the toolbar notification to download</span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
};

export default React.memo(Settings);
