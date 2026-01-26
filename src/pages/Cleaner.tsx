import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CleanerCard from '../components/CleanerCard';
import { cleanerUtilities } from '../data/cleanerUtilities';
import { useToast } from '../contexts/ToastContext';
import '../styles/Cleaner.css';

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
      };
    };
  }
}

interface CleanResult {
  success: boolean;
  message: string;
  spaceSaved: string;
  filesDeleted?: number;
  filesBefore?: number;
  filesAfter?: number;
  details?: string;
}

const Cleaner: React.FC = () => {
  const [cleaningId, setCleaningId] = useState<string | null>(null);
  const { addToast } = useToast();

  const cleanerMap: { [key: string]: string } = {
    'nvidia-cache': 'cleaner:clear-nvidia-cache',
    'apex-shaders': 'cleaner:clear-apex-shaders',
    'forza-shaders': 'cleaner:clear-forza-shaders',
    'temp-files': 'cleaner:clear-temp-files',
    'prefetch': 'cleaner:clear-prefetch',
    'memory-dumps': 'cleaner:clear-memory-dumps',
    'update-cache': 'cleaner:clear-update-cache',
    'dns-cache': 'cleaner:clear-dns-cache',
  };

  const handleClean = async (id: string) => {
    setCleaningId(id);
    try {
      const channel = cleanerMap[id];
      if (window.electron?.ipcRenderer && channel) {
        // If clearing the Windows Update cache, warn user it may take a while
        if (id === 'update-cache') {
          addToast('Clearing update cache — this can take a minute or more', 'info');
        }

        const result: CleanResult = await window.electron.ipcRenderer.invoke(channel);
        let message = result.message;
        
        if (result.success) {
          // Build detailed message with file and size info
          if (result.filesDeleted !== undefined && result.filesBefore !== undefined) {
            message = `${result.message}\n${result.filesDeleted}/${result.filesBefore} files deleted (${result.filesAfter} remaining)\n${result.spaceSaved} freed`;
          } else {
            message = `${result.message}\n${result.spaceSaved} freed`;
          }
        }
        
        addToast(message, result.success ? 'success' : 'error');
      } else {
        addToast('IPC not available', 'error');
      }
    } catch (error) {
      addToast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      // Keep the loading state for 2 seconds to show feedback
      setTimeout(() => {
        setCleaningId(null);
      }, 2000);
    }
  };

  return (
    <motion.div
      className="cleaner-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="section-title">System Cleaner</h2>
      <p className="section-subtitle">
        Optimize your system by clearing unnecessary cache and temporary files
      </p>

      <div className="cleaner-grid">
        {cleanerUtilities.map((utility, index) => (
          <motion.div
            key={utility.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <CleanerCard
              id={utility.id}
              title={utility.title}
              icon={utility.icon}
              cacheType={utility.cacheType}
              description={utility.description}
              buttonText={utility.buttonText}
              color={utility.color}
              onClean={handleClean}
              isLoading={cleaningId === utility.id}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Cleaner;
