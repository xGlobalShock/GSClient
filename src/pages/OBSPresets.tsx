import React, { useState } from 'react';
import { OBS_PRESETS } from '../data/obsPresets';
import { applyObsPreset, launchObs } from '../services/obsPresetsService';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Broadcast, Monitor } from 'phosphor-react';
import PageHeader from '../components/PageHeader';
import { Video } from 'lucide-react';
import '../styles/OBSPresets.css';

// Icon mapping helper
const getIconComponent = (iconName: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    broadcast: <Broadcast size={32} weight="bold" />,
    gamepad: <Monitor size={32} weight="bold" />,
  };
  return iconMap[iconName] || null;
};

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

  const isLoading = (id: string) => applyingPreset === id || loadingPreset === id;

  return (
    <motion.div
      className="obs-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <PageHeader icon={<Video size={16} />} title="Streaming Presets" />

      {/* Cards grid */}
      <div className="obs-grid">
        {OBS_PRESETS.map((preset, i) => {
          const loading = isLoading(preset.id);
          const applying = applyingPreset === preset.id;
          const launching = loadingPreset === preset.id;
          const accentColor = preset.color;

          return (
            <motion.div
              key={preset.id}
              className={`obs-card ${loading ? 'obs-card--busy' : ''}`}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.12, type: 'spring', stiffness: 180, damping: 20 }}
              style={{ '--accent': accentColor } as React.CSSProperties}
            >
              {/* Top edge glow */}
              <div className="obs-card-edge" />

              {/* Corner brackets */}
              <div className="obs-card-corner obs-corner--tl" />
              <div className="obs-card-corner obs-corner--tr" />
              <div className="obs-card-corner obs-corner--bl" />
              <div className="obs-card-corner obs-corner--br" />

              {/* Loading sweep */}
              {loading && <div className="obs-card-sweep" />}

              <div className="obs-card-inner">
                {/* Icon + meta row */}
                <div className="obs-card-top">
                  <div className="obs-card-icon">{getIconComponent(preset.iconName)}</div>
                  <span className={`obs-diff-badge obs-diff--${preset.difficulty.toLowerCase()}`}>
                    {preset.difficulty}
                  </span>
                </div>

                {/* Title */}
                <h2 className="obs-card-title">{preset.name}</h2>

                {/* Description */}
                <p className="obs-card-desc">{preset.description}</p>

                {/* Divider */}
                <div className="obs-card-divider" />

                {/* Feature list */}
                <div className="obs-card-features">
                  {preset.features.map((feat, fi) => (
                    <div key={fi} className="obs-feat-row">
                      <div className="obs-feat-dot" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Action button */}
                <button
                  className="obs-card-btn"
                  onClick={() => handleApplyPreset(preset.id)}
                  disabled={loading}
                >
                  {applying ? (
                    <>
                      <span className="obs-spinner" />
                      <span>Applying...</span>
                    </>
                  ) : launching ? (
                    <>
                      <span className="obs-spinner" />
                      <span>Launching OBS...</span>
                    </>
                  ) : (
                    <span>Apply Preset</span>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default OBSPresets;

