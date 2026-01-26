import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PerformanceTweakCard from '../components/PerformanceTweakCard';
import { performanceTweaks } from '../data/performanceTweaks';
import { useToast } from '../contexts/ToastContext';
import '../styles/Performance.css';

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
      };
    };
  }
}

const Performance: React.FC = () => {
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [enabledTweaks, setEnabledTweaks] = useState<{ [key: string]: boolean }>({});
  const { addToast } = useToast();

  const tweakMap: { [key: string]: string } = {
    'irq-priority': 'tweak:apply-irq-priority',
    'network-interrupts': 'tweak:apply-network-interrupts',
    'gpu-scheduling': 'tweak:apply-gpu-scheduling',
    'fullscreen-optimization': 'tweak:apply-fullscreen-optimization',
    'usb-suspend': 'tweak:apply-usb-suspend',
    'game-dvr': 'tweak:apply-game-dvr',
    'win32-priority': 'tweak:apply-win32-priority',
  };

  const resetMap: { [key: string]: string } = {
    'irq-priority': 'tweak:reset-irq-priority',
    'network-interrupts': 'tweak:reset-network-interrupts',
    'gpu-scheduling': 'tweak:reset-gpu-scheduling',
    'fullscreen-optimization': 'tweak:reset-fullscreen-optimization',
    'usb-suspend': 'tweak:reset-usb-suspend',
    'game-dvr': 'tweak:reset-game-dvr',
    'win32-priority': 'tweak:reset-win32-priority',
  };

  const checkMap: { [key: string]: string } = {
    'irq-priority': 'tweak:check-irq-priority',
    'network-interrupts': 'tweak:check-network-interrupts',
    'gpu-scheduling': 'tweak:check-gpu-scheduling',
    'fullscreen-optimization': 'tweak:check-fullscreen-optimization',
    'usb-suspend': 'tweak:check-usb-suspend',
    'game-dvr': 'tweak:check-game-dvr',
    'win32-priority': 'tweak:check-win32-priority',
  };

  // Check tweak status on mount
  useEffect(() => {
    const checkAllTweaks = async () => {
      const results: { [key: string]: boolean } = {};

      for (const [tweakId, channel] of Object.entries(checkMap)) {
        try {
          if (window.electron?.ipcRenderer) {
            const result = await window.electron.ipcRenderer.invoke(channel);
            // For Win32 Priority, treat value 2 (default) as not applied
            if (tweakId === 'win32-priority') {
              results[tweakId] = false;
            } else {
              results[tweakId] = result.applied || false;
            }
          }
        } catch (error) {
          results[tweakId] = false;
        }
      }

      setEnabledTweaks(results);
    };

    checkAllTweaks();
  }, []);

  const handleApplyTweak = async (id: string) => {
    setApplyingId(id);
    try {
      // Create restore point first
      if (window.electron?.ipcRenderer) {
        const tweak = performanceTweaks.find(t => t.id === id);
        const restoreDesc = `PC Optimizer - Before ${tweak?.title || 'Tweak'}`;
        const restoreResult: any = await window.electron.ipcRenderer.invoke('system:create-restore-point', restoreDesc);
        if (restoreResult.success) {
          addToast('✓ System restore point created', 'info');
        }
      }

      // Apply tweak
      const channel = tweakMap[id];
      if (window.electron?.ipcRenderer && channel) {
        const result: any = await window.electron.ipcRenderer.invoke(channel);
        if (result.success) {
          addToast(result.message, 'success');
          // Check status after applying
          const checkChannel = checkMap[id];
          if (checkChannel) {
            const checkResult = await window.electron.ipcRenderer.invoke(checkChannel);
            setEnabledTweaks({ ...enabledTweaks, [id]: checkResult.applied });
          }
        } else {
          addToast(result.message || 'Failed to apply tweak', 'error');
        }
      } else {
        addToast('IPC not available', 'error');
      }
    } catch (error) {
      addToast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setTimeout(() => {
        setApplyingId(null);
      }, 2000);
    }
  };

  const handleResetTweak = async (id: string) => {
    setApplyingId(id);
    try {
      const channel = resetMap[id];
      if (window.electron?.ipcRenderer && channel) {
        const result: any = await window.electron.ipcRenderer.invoke(channel);
        if (result.success) {
          addToast(result.message, 'success');
          await new Promise(resolve => setTimeout(resolve, 500));
          // Force Win32 Priority to not applied after reset
          if (id === 'win32-priority') {
            setEnabledTweaks(prev => ({ ...prev, [id]: false }));
          } else {
            const checkChannel = checkMap[id];
            if (checkChannel) {
              const checkResult = await window.electron.ipcRenderer.invoke(checkChannel);
              setEnabledTweaks(prev => ({ ...prev, [id]: checkResult.applied || false }));
            }
          }
        } else {
          addToast(result.message || 'Failed to reset tweak', 'error');
        }
      } else {
        addToast('IPC not available', 'error');
      }
    } catch (error) {
      addToast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setTimeout(() => {
        setApplyingId(null);
      }, 2000);
    }
  };

  return (
    <motion.div
      className="performance-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="section-title">System Tweaks</h2>
      <p className="section-subtitle">
        Kernel and registry optimizations for minimal latency and maximum performance
      </p>

      <div className="tweaks-grid">
        {performanceTweaks.map((tweak, index) => (
          <motion.div
            key={tweak.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <PerformanceTweakCard
              id={tweak.id}
              title={tweak.title}
              icon={tweak.icon}
              category={tweak.category}
              description={tweak.description}
              buttonText={tweak.buttonText}
              color={tweak.color}
              onApply={handleApplyTweak}
              onReset={handleResetTweak}
              isLoading={applyingId === tweak.id}
              isEnabled={enabledTweaks[tweak.id] || false}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Performance;
