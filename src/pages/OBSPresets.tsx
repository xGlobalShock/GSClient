import React, { useState } from 'react';
import { OBS_PRESETS } from '../data/obsPresets';
import { applyObsPreset, launchObs } from '../services/obsPresetsService';
import { useToast } from '../contexts/ToastContext';
import '../styles/OBSPresets.css';

const OBSPresets: React.FC = () => {
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  const { addToast } = useToast();

  const handleApplyPreset = async (presetId: string) => {
    setApplyingPreset(presetId);
    try {
      const result = await applyObsPreset(presetId);

      if (result.success) {
        addToast(
          `Preset applied successfully! Launching OBS with the new configuration...`,
          'success'
        );

        // Automatically launch OBS after a short delay
        setTimeout(async () => {
          setLoadingPreset(presetId);
          try {
            const launchResult = await launchObs();
            if (launchResult.success) {
              addToast('OBS Studio launched successfully!', 'success');
            } else {
              addToast(launchResult.message || 'Failed to launch OBS', 'error');
            }
          } catch (launchError) {
            console.error('Error launching OBS:', launchError);
            addToast('Failed to launch OBS', 'error');
          } finally {
            setTimeout(() => setLoadingPreset(null), 2000);
          }
        }, 500);
      } else {
        addToast(result.message, 'error');
      }
    } catch (error) {
      console.error('Error applying preset:', error);
      addToast('Failed to apply preset', 'error');
    } finally {
      setApplyingPreset(null);
    }
  };

  return (
    <div className="obs-presets-container">
      <div className="obs-presets-header">
        <h1>OBS Presets</h1>
        <p className="subtitle">
          Select a preset to apply to your OBS Studio setup
        </p>
      </div>

      <div className="obs-presets-grid">
        {OBS_PRESETS.map((preset) => (
          <div
            key={preset.id}
            className={`preset-card ${preset.difficulty.toLowerCase()}`}
            style={{ borderColor: preset.color + '40' }}
          >
            <div className="preset-icon">{preset.icon}</div>
            <h2 className="preset-name">{preset.name}</h2>
            <p className="preset-description">{preset.description}</p>

            <div className="preset-difficulty">
              <span className={`difficulty-badge ${preset.difficulty.toLowerCase()}`}>
                {preset.difficulty}
              </span>
            </div>

            <div className="preset-features">
              <h3>Features:</h3>
              <ul>
                {preset.features.map((feature, index) => (
                  <li key={index}>✓ {feature}</li>
                ))}
              </ul>
            </div>

            <button
              className={`apply-preset-btn ${
                applyingPreset === preset.id ? 'loading' : ''
              }`}
              onClick={() => handleApplyPreset(preset.id)}
              disabled={applyingPreset === preset.id || loadingPreset === preset.id}
              style={{ borderColor: preset.color }}
            >
              {applyingPreset === preset.id ? (
                <>
                  <span className="spinner"></span>
                  Applying...
                </>
              ) : loadingPreset === preset.id ? (
                <>
                  <span className="spinner"></span>
                  Launching OBS...
                </>
              ) : (
                <>Apply Preset</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OBSPresets;

