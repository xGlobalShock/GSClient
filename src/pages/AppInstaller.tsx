import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  CheckCircle,
  Search,
  Package,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useToast } from '../contexts/ToastContext';
import { APP_CATALOG, CatalogApp } from '../data/appCatalog';
import '../styles/AppInstaller.css';

interface InstallProgress {
  packageId: string;
  phase: 'preparing' | 'downloading' | 'verifying' | 'installing' | 'done' | 'error';
  status: string;
  percent: number;
}

interface AppInstallerProps {
  isActive?: boolean;
}

const AppInstaller: React.FC<AppInstallerProps> = ({ isActive = false }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingInstalled, setCheckingInstalled] = useState(false);
  const hasChecked = useRef(false);
  const { addToast } = useToast();

  // Listen for install progress events
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;
    const unsub = window.electron.ipcRenderer.on('appinstall:install-progress', (data: InstallProgress) => {
      setProgress(data);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  // Check which apps are already installed
  const checkInstalled = useCallback(async () => {
    if (!window.electron?.ipcRenderer) return;
    setCheckingInstalled(true);
    try {
      const allApps = APP_CATALOG.map(a => ({ id: a.id, name: a.name }));
      const result = await window.electron.ipcRenderer.invoke('appinstall:check-installed', allApps);
      if (result.success) {
        const installedSet = new Set<string>();
        for (const [id, isInstalled] of Object.entries(result.installed)) {
          if (isInstalled) installedSet.add(id);
        }
        setInstalled(installedSet);
      }
    } catch (err) {
      console.error('Failed to check installed apps:', err);
    } finally {
      setCheckingInstalled(false);
    }
  }, []);

  // Auto-check on first visit
  useEffect(() => {
    if (isActive && !hasChecked.current) {
      hasChecked.current = true;
      checkInstalled();
    }
  }, [isActive, checkInstalled]);

  // Manual refresh
  const refreshInstalled = useCallback(() => {
    hasChecked.current = false;
    setInstalled(new Set());
    checkInstalled();
  }, [checkInstalled]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      const availableApps = APP_CATALOG.filter(a => !installed.has(a.id));
      const allSelected = availableApps.every(a => next.has(a.id));
      if (allSelected) {
        availableApps.forEach(a => next.delete(a.id));
      } else {
        availableApps.forEach(a => next.add(a.id));
      }
      return next;
    });
  };

  const handleInstallSingle = async (app: CatalogApp) => {
    if (!window.electron?.ipcRenderer) return;
    setInstallingId(app.id);
    setProgress(null);
    try {
      const result = await window.electron.ipcRenderer.invoke('appinstall:install-app', app.id);
      if (result.success) {
        addToast(`${app.name} installed successfully!`, 'success');
        setInstalled(prev => new Set(prev).add(app.id));
        setSelected(prev => { const next = new Set(prev); next.delete(app.id); return next; });
      } else {
        addToast(result.message || `Failed to install ${app.name}`, 'error');
      }
    } catch (err) {
      addToast(`Error installing ${app.name}`, 'error');
    } finally {
      setTimeout(() => setProgress(null), 2500);
      setInstallingId(null);
    }
  };

  const handleInstallSelected = async () => {
    if (!window.electron?.ipcRenderer || selected.size === 0) return;
    const toInstall = Array.from(selected);
    const appNames = APP_CATALOG.reduce((acc, a) => { acc[a.id] = a.name; return acc; }, {} as Record<string, string>);

    addToast(`Installing ${toInstall.length} app${toInstall.length > 1 ? 's' : ''}…`, 'info');

    for (const id of toInstall) {
      setInstallingId(id);
      setProgress(null);
      try {
        const result = await window.electron.ipcRenderer.invoke('appinstall:install-app', id);
        if (result.success) {
          setInstalled(prev => new Set(prev).add(id));
          setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
        } else {
          addToast(`Failed: ${appNames[id] || id}`, 'error');
        }
      } catch {
        addToast(`Error installing ${appNames[id] || id}`, 'error');
      }
    }
    setInstallingId(null);
    setTimeout(() => setProgress(null), 2500);
    addToast('Batch installation complete!', 'success');
  };

  // Filter catalog by search
  const filteredApps = searchQuery.trim()
    ? APP_CATALOG.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : APP_CATALOG;

  const availableApps = APP_CATALOG.filter(a => !installed.has(a.id));
  const allSelected = availableApps.length > 0 && availableApps.every(a => selected.has(a.id));

  const showInstalled = (id: string) => installed.has(id);

  return (
    <motion.div
      className="ai"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <PageHeader
        icon={<Package size={16} />}
        title="App Installer"
        stat={
          checkingInstalled ? (
            <span className="ai-checking"><Loader2 size={12} className="ai-spin" /> Checking installed…</span>
          ) : installed.size > 0 ? (
            <span className="ai-installed-count">{installed.size} installed</span>
          ) : null
        }
        actions={
          <div className="ai-header-actions">
            <button
              className="ai-btn ai-btn--clear"
              onClick={refreshInstalled}
              disabled={checkingInstalled}
              title="Re-scan installed apps"
            >
              <RefreshCw size={14} className={checkingInstalled ? 'ai-spin' : ''} />
              {checkingInstalled ? 'Scanning…' : 'Refresh'}
            </button>
            {selected.size > 0 && (
              <>
                <button className="ai-btn ai-btn--clear" onClick={clearSelection}>
                  <X size={14} />
                  Clear ({selected.size})
                </button>
                <button
                  className="ai-btn ai-btn--install-selected"
                  onClick={handleInstallSelected}
                  disabled={installingId !== null}
                >
                  <Download size={14} />
                  {installingId ? 'Installing…' : `Install Selected (${selected.size})`}
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Search bar */}
      <div className="ai-search-wrap">
        <Search size={16} className="ai-search-icon" />
        <input
          type="text"
          className="ai-search"
          placeholder="Search apps…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="ai-search-clear" onClick={() => setSearchQuery('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Select All / App count bar */}
      <div className="ai-toolbar">
        <span className="ai-toolbar-count">{filteredApps.length} apps</span>
        <button className="ai-btn ai-btn--select-cat" onClick={selectAll}>
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* App grid */}
      <div className="ai-catalog">
        <div className="ai-app-grid">
          {filteredApps.map((app, i) => {
            const isInstalled = showInstalled(app.id);
            const isSelected = selected.has(app.id);
            const isInstalling = installingId === app.id;
            const appProgress = progress && progress.packageId === app.id ? progress : null;

            return (
              <motion.div
                key={app.id}
                className={`ai-app-chip ${isSelected ? 'ai-app-chip--selected' : ''} ${isInstalled ? 'ai-app-chip--installed' : ''} ${isInstalling ? 'ai-app-chip--installing' : ''}`}
                onClick={() => !isInstalled && !isInstalling && toggleSelect(app.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015 }}
              >
                <div className="ai-app-check">
                  {isInstalled ? (
                    <CheckCircle size={14} className="ai-app-check-icon ai-app-check-icon--installed" />
                  ) : isInstalling ? (
                    <Loader2 size={14} className="ai-spin ai-app-check-icon" />
                  ) : (
                    <div className={`ai-app-checkbox ${isSelected ? 'ai-app-checkbox--checked' : ''}`} />
                  )}
                </div>
                <span className="ai-app-name">{app.name}</span>
                {!isInstalled && !isInstalling && (
                  <button
                    className="ai-app-install-btn"
                    onClick={(e) => { e.stopPropagation(); handleInstallSingle(app); }}
                    title={`Install ${app.name}`}
                  >
                    <Download size={12} />
                  </button>
                )}
                {isInstalling && appProgress && (
                  <span className={`ai-app-status ai-app-status--${appProgress.phase}`}>
                    {appProgress.phase === 'downloading' && 'Downloading…'}
                    {appProgress.phase === 'installing' && 'Installing…'}
                    {appProgress.phase === 'verifying' && 'Verifying…'}
                    {appProgress.phase === 'done' && 'Done!'}
                    {appProgress.phase === 'error' && 'Failed'}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default AppInstaller;
