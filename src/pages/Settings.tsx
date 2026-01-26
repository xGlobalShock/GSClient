import React, { useState } from 'react';
import { motion } from 'framer-motion';
import '../styles/Settings.css';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    autoClean: true,
    notifications: true,
    autoOptimize: false,
    theme: 'dark',
    startupLaunch: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <motion.div
      className="settings-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="section-title">Settings</h2>

      <div className="settings-sections">
        <div className="settings-section">
          <h3 className="section-header">General</h3>
          
          <div className="setting-item">
            <div className="setting-label">
              <span className="label-title">Auto Clean</span>
              <span className="label-description">Automatically clean junk files weekly</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.autoClean}
                onChange={() => handleToggle('autoClean')}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span className="label-title">Enable Notifications</span>
              <span className="label-description">Receive alerts for system issues</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={() => handleToggle('notifications')}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span className="label-title">Auto Optimize on Startup</span>
              <span className="label-description">Run optimization when launching games</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.autoOptimize}
                onChange={() => handleToggle('autoOptimize')}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span className="label-title">Launch on Startup</span>
              <span className="label-description">Start PC Optimizer Elite when Windows boots</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.startupLaunch}
                onChange={() => handleToggle('startupLaunch')}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="section-header">Appearance</h3>
          <div className="setting-item">
            <div className="setting-label">
              <span className="label-title">Theme</span>
              <span className="label-description">Choose your preferred theme</span>
            </div>
            <select
              className="theme-select"
              value={settings.theme}
              onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
            >
              <option value="dark">Dark (Default)</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="section-header">About</h3>
          <div className="about-info">
            <p><strong>PC Optimizer Elite</strong></p>
            <p>Version 1.0.0</p>
            <p>Advanced system optimization tool with gaming focus</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;
