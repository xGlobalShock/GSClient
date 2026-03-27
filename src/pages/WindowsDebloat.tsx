import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackageX,
  Search,
  X,
  RefreshCw,
  Loader2,
  Download,
  Trash2,
  AlertTriangle,
  Lock,
  Check,
  AlertOctagon,
  LayoutGrid,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useToast } from '../contexts/ToastContext';
import '../styles/WindowsDebloat.css';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type DebloatSource = 'apps' | 'capabilities' | 'features';

interface DebloatItem {
  id: string;
  name: string;
  description?: string;
  source: DebloatSource;
  rawName?: string;
  packageFamilyName?: string;
  version?: string;
  installed: boolean;
  nonRemovable?: boolean;
  isCatalog?: boolean;
  canBeReinstalled?: boolean;
  state?: string;
}

// no longer using tabs replacement


type AppTab = 'install' | 'uninstall' | 'debloat';

interface WindowsDebloatProps {
  isActive?: boolean;
  activeTab?: AppTab;
  onTabChange?: (tab: AppTab) => void;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
const WindowsDebloat: React.FC<WindowsDebloatProps> = ({ isActive = false, activeTab = 'debloat', onTabChange }) => {
  const { addToast } = useToast();

  const IS_COMING_SOON = false; // LOCK / UNLOCK PAGE

  /* ── State ────────────────────────────────────────────────────────────── */
  const [items, setItems] = useState<DebloatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isElevated, setIsElevated] = useState(true); // assume elevated; update if IPC says otherwise

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const hasLoaded = React.useRef<Record<DebloatSource, boolean>>({ apps: false, capabilities: false, features: false });

  /* ── IPC channel map ── */
  const LIST_CHANNEL: Record<DebloatSource, string> = {
    apps: 'wdebloat:list-apps',
    capabilities: 'wdebloat:list-capabilities',
    features: 'wdebloat:list-features',
  };
  const REMOVE_BULK_CHANNEL: Record<DebloatSource, string> = {
    apps: 'wdebloat:remove-apps',
    capabilities: 'wdebloat:remove-capabilities',
    features: 'wdebloat:remove-features',
  };
  const INSTALL_BULK_CHANNEL: Record<DebloatSource, string> = {
    apps: 'wdebloat:install-apps',
    capabilities: 'wdebloat:add-capabilities',
    features: 'wdebloat:add-features',
  };

  /* ── Fetch all sections in one view ── */
  const fetchItems = useCallback(async () => {
    if (IS_COMING_SOON) return;
    if (!window.electron?.ipcRenderer) return;
    setLoading(true);
    setSelected(new Set());
    try {
      const [apps, caps, feats] = await Promise.all([
        window.electron.ipcRenderer.invoke(LIST_CHANNEL.apps),
        window.electron.ipcRenderer.invoke(LIST_CHANNEL.capabilities),
        window.electron.ipcRenderer.invoke(LIST_CHANNEL.features),
      ]);

      const merged: DebloatItem[] = [];
      if (apps.success) {
        merged.push(...(apps.items || []).map((i: any) => ({ ...i, source: 'apps' as DebloatSource })));
      } else {
        if (apps.error?.includes('privilege') || apps.error?.includes('elevation')) setIsElevated(false);
        addToast(apps.error || 'Failed to load apps list', 'error');
      }
      if (caps.success) {
        merged.push(...(caps.items || []).map((i: any) => ({ ...i, source: 'capabilities' as DebloatSource })));
      }
      if (feats.success) {
        merged.push(...(feats.items || []).map((i: any) => ({ ...i, source: 'features' as DebloatSource })));
      }

      setItems(merged);
      hasLoaded.current.apps = true;
      hasLoaded.current.capabilities = true;
      hasLoaded.current.features = true;
    } catch (err: any) {
      addToast('Failed to load: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const hydrateFromPreloaded = useCallback((data: any) => {
    if (!data) return;
    const { apps, caps, feats } = data;
    const merged: DebloatItem[] = [];

    if (apps?.success) {
      merged.push(...(apps.items || []).map((i: any) => ({ ...i, source: 'apps' as DebloatSource })));
    } else if (apps?.error && (apps.error.includes('privilege') || apps.error.includes('elevation'))) {
      setIsElevated(false);
    }
    if (caps?.success) {
      merged.push(...(caps.items || []).map((i: any) => ({ ...i, source: 'capabilities' as DebloatSource })));
    }
    if (feats?.success) {
      merged.push(...(feats.items || []).map((i: any) => ({ ...i, source: 'features' as DebloatSource })));
    }

    if (merged.length > 0) setItems(prev => merged);
    
    if (apps?.success) hasLoaded.current.apps = true;
    if (caps?.success) hasLoaded.current.capabilities = true;
    if (feats?.success) hasLoaded.current.features = true;
  }, []);

  /* ── Load on activate only ── */
  useEffect(() => {
    if (!isActive) return;
    if (!hasLoaded.current.apps || !hasLoaded.current.capabilities || !hasLoaded.current.features) {
      const preloaded = (window as any).__WDEBLOAT_PRELOADED__;
      if (preloaded) {
        hydrateFromPreloaded(preloaded);
        (window as any).__WDEBLOAT_PRELOADED__ = null; // Consume the global payload
      } else {
        fetchItems();
      }
    }
  }, [isActive, fetchItems, hydrateFromPreloaded]);

  /* ── Listen for events ── */
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;
    
    const unsubProgress = window.electron.ipcRenderer.on('wdebloat:progress', (data: any) => {
      setProgressMsg(data?.msg || '');
      setProgressCurrent(data?.current || 0);
      setProgressTotal(data?.total || 0);
    });

    const unsubPreloaded = window.electron.ipcRenderer.on('wdebloat:preloaded', (data: any) => {
      hydrateFromPreloaded(data);
    });

    return () => { 
      if (unsubProgress) unsubProgress();
      if (unsubPreloaded) unsubPreloaded();
    };
  }, [hydrateFromPreloaded]);

  /* ── Filtered items ── */
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  /* ── Selection helpers ── */
  const toggleItem = (id: string, nonRemovable?: boolean) => {
    if (nonRemovable) return;
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    setSelected(new Set(filtered.filter(i => !i.nonRemovable).map(i => i.id)));
  };

  const selectInstalled = () => {
    setSelected(new Set(filtered.filter(i => i.installed && !i.nonRemovable).map(i => i.id)));
  };

  const selectNotInstalled = () => {
    setSelected(new Set(filtered.filter(i => !i.installed && !i.nonRemovable).map(i => i.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const allFilteredSelected =
    filtered.filter(i => !i.nonRemovable).length > 0 &&
    filtered.filter(i => !i.nonRemovable).every(i => selected.has(i.id));

  const executeRemoval = async (ids: string[]) => {
    const appIds: string[] = [];
    const capIds: string[] = [];
    const featIds: string[] = [];
    for (const id of ids) {
      const item = items.find(i => i.id === id);
      if (!item || item.nonRemovable) continue;
      if (item.source === 'apps') appIds.push(id);
      if (item.source === 'capabilities') capIds.push(id);
      if (item.source === 'features') featIds.push(id);
    }

    setBusy(true);
    setProgressMsg('Starting removal…');
    setProgressCurrent(0);
    setProgressTotal(ids.length);
    try {
      const allResults: any[] = [];
      if (appIds.length > 0) {
        const r = await window.electron.ipcRenderer.invoke(REMOVE_BULK_CHANNEL.apps, appIds);
        if (r.success) allResults.push(...r.results);
      }
      if (capIds.length > 0) {
        const r = await window.electron.ipcRenderer.invoke(REMOVE_BULK_CHANNEL.capabilities, capIds);
        if (r.success) allResults.push(...r.results);
      }
      if (featIds.length > 0) {
        const r = await window.electron.ipcRenderer.invoke(REMOVE_BULK_CHANNEL.features, featIds);
        if (r.success) allResults.push(...r.results);
      }

      const failed = allResults.filter((r: any) => !r.success);
      if (failed.length === 0) {
        addToast(`Removed ${ids.length} item${ids.length !== 1 ? 's' : ''} successfully`, 'success');
      } else {
        const firstErr = failed[0]?.error ? `: ${failed[0].error}` : '';
        addToast(`Removed ${ids.length - failed.length}/${ids.length}. ${failed.length} failed${firstErr}`, 'error');
      }
      await fetchItems();
    } catch (err: any) {
      addToast('Error: ' + err.message, 'error');
    } finally {
      setBusy(false);
      setProgressMsg('');
      setProgressCurrent(0);
      setProgressTotal(0);
    }
  };

  /* ── Uninstall selected ── */
  const handleRemoveSelected = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);

    const nonReinstallable = ids
      .map(id => items.find(i => i.id === id))
      .filter((i) => i && i.canBeReinstalled === false);
    
    if (nonReinstallable.length > 0) {
      const names = nonReinstallable.map(i => i!.name).join(', ');
      setConfirmModal({
        isOpen: true,
        title: 'Permanent Removal Warning',
        message: `The following items cannot be reinstalled once removed:\n\n${names}\n\nAre you sure you want to permanently remove them?`,
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          executeRemoval(ids);
        },
        onCancel: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    executeRemoval(ids);
  };

  /* ── Install selected ── */
  const handleInstallSelected = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const appIds: string[] = [];
    const capIds: string[] = [];
    const featIds: string[] = [];
    for (const id of ids) {
      const item = items.find(i => i.id === id);
      if (!item) continue;
      if (item.source === 'apps') appIds.push(id);
      if (item.source === 'capabilities') capIds.push(id);
      if (item.source === 'features') featIds.push(id);
    }

    setBusy(true);
    setProgressMsg('Starting installation…');
    setProgressCurrent(0);
    setProgressTotal(ids.length);
    try {
      const allResults: any[] = [];
      if (appIds.length > 0) {
        const r = await window.electron.ipcRenderer.invoke(INSTALL_BULK_CHANNEL.apps, appIds);
        if (r.success) allResults.push(...r.results);
      }
      if (capIds.length > 0) {
        const r = await window.electron.ipcRenderer.invoke(INSTALL_BULK_CHANNEL.capabilities, capIds);
        if (r.success) allResults.push(...r.results);
      }
      if (featIds.length > 0) {
        const r = await window.electron.ipcRenderer.invoke(INSTALL_BULK_CHANNEL.features, featIds);
        if (r.success) allResults.push(...r.results);
      }

      const failed = allResults.filter((r: any) => !r.success);
      if (failed.length === 0) {
        addToast(`Installed ${ids.length} item${ids.length !== 1 ? 's' : ''} successfully`, 'success');
      } else {
        const firstErr = failed[0]?.error ? `: ${failed[0].error}` : '';
        addToast(`Installed ${ids.length - failed.length}/${ids.length}. ${failed.length} failed${firstErr}`, 'error');
      }
      await fetchItems();
    } catch (err: any) {
      addToast('Error: ' + err.message, 'error');
    } finally {
      setBusy(false);
      setProgressMsg('');
      setProgressCurrent(0);
      setProgressTotal(0);
    }
  };

  /* ── Stats ── */
  const installedCount = items.filter(i => i.installed).length;
  const notInstalledCount = items.filter(i => !i.installed).length;

  /* ── Selected item breakdown ── */
  const selectedInstalled = Array.from(selected).filter(id => items.find(i => i.id === id)?.installed).length;
  const selectedNotInstalled = selected.size - selectedInstalled;

  /* ── Section grouping (layout) ── */
  const apps = filtered.filter(i => i.source === 'apps');
  const capabilities = filtered.filter(i => i.source === 'capabilities');
  const features = filtered.filter(i => i.source === 'features');

  const renderItemCard = (item: DebloatItem) => {
    const isSelected = selected.has(item.id);
    const warnNoReinstall = item.installed && item.canBeReinstalled === false;
    const dotClass = item.installed
      ? (warnNoReinstall ? 'wd-dot wd-dot--warn' : 'wd-dot wd-dot--on')
      : 'wd-dot wd-dot--off';
    const cardClass = ['wd-card', isSelected ? 'wd-card--selected' : '', item.nonRemovable ? 'wd-card--non-removable' : ''].filter(Boolean).join(' ');

    const isNoReinstall = !item.installed && item.canBeReinstalled === false;
    const badgeClass = item.installed ? 'wd-card-badge wd-card-badge--enabled' : isNoReinstall ? 'wd-card-badge wd-card-badge--danger' : 'wd-card-badge wd-card-badge--disabled';

    const installedText = item.source === 'features' ? 'Enabled' : 'Installed';
    const notInstalledText = item.source === 'features' ? 'Disabled' : 'Not Installed';
    const removeWarnText = item.source === 'features' ? 'disabled' : 'removed';
    const permText = item.source === 'features' ? 'Permanently Disabled (Cannot re-enable)' : 'Permanently Removed (Cannot reinstall)';

    const badgeTooltip = item.installed
      ? (warnNoReinstall ? `⚠ Cannot be reinstalled once ${removeWarnText}` : installedText)
      : (isNoReinstall ? permText : notInstalledText);

    const badgeIcon = item.installed
      ? <Check size={10} strokeWidth={3} />
      : isNoReinstall
        ? <AlertOctagon size={10} />
        : <Download size={10} strokeWidth={2.5} />;

    return (
      <div
        key={item.id}
        className={cardClass}
        onClick={() => toggleItem(item.id, item.nonRemovable)}
        title={item.nonRemovable ? 'This component cannot be removed' : warnNoReinstall ? `⚠ Cannot be reinstalled once ${item.source === 'features' ? 'disabled' : 'removed'}` : undefined}
      >
        <div className="wd-card-cb" />
        <span className={dotClass} />
        <div className="wd-card-info">
          <span className="wd-card-name" title={item.name}>{item.name}</span>
        </div>
        <div className={badgeClass} title={badgeTooltip}>
          {badgeIcon}
        </div>
      </div>
    );
  };

  const renderSection = (title: string, sectionItems: DebloatItem[]) => (
    <div className="wd-section" key={title}>
      <div className="wd-section-header">
        <span>{title}</span>
        <span className="wd-section-count">{sectionItems.length}</span>
      </div>
      {sectionItems.length === 0 ? (
        <div className="wd-section-empty">No items in this section.</div>
      ) : (
        <div className="wd-grid">{sectionItems.map(renderItemCard)}</div>
      )}
    </div>
  );

  return (
    <motion.div
      className="wd"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      {/* ── Page Header ── */}
      <PageHeader icon={<LayoutGrid size={16} />} title="Apps Manager" />

      {IS_COMING_SOON && (
        <div className="wd-lock-overlay">
          <Lock size={36} strokeWidth={1.5} />
          <span className="wd-lock-caption">Coming Soon</span>
          <span className="wd-lock-sub">Windows Debloat is currently in development</span>
        </div>
      )}

      {/* ── Page Content (Locked) ── */}
      <div className={`wd-content ${IS_COMING_SOON ? 'wd-content--locked' : ''}`}>
        {/* ── Not-elevated warning ── */}
        {!isElevated && (
          <div className="wd-elevate-warn">
            <AlertTriangle size={15} />
            <span>
              Some actions require <strong>Administrator</strong> privileges. Restart the app as admin to enable debloat operations.
            </span>
          </div>
        )}

        {/* ── Toolbar with tab switcher ── */}
        <div className="wd-toolbar">
          <div className="wd-toolbar-l">
            {/* Search */}
            <div className="wd-search-wrap">
              <Search size={12} className="wd-search-icon" />
              <input
                className="wd-search"
                placeholder="Search apps, capabilities, features…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                disabled={loading || busy}
              />
              {searchQuery && (
                <button className="wd-search-x" onClick={() => setSearchQuery('')}>
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Progress msg during bulk ops */}
            {busy && progressMsg && (
              <span className="wd-progress-msg">{progressMsg}</span>
            )}
          </div>

          <div className="wd-toolbar-c">
            <div className="apps-hdr-sw">
              <button
                className={`apps-hdr-sw-btn apps-hdr-sw-btn--install${activeTab === 'install' ? ' apps-hdr-sw-btn--on' : ''}`}
                onClick={() => onTabChange?.('install')}
              >
                <span className="apps-hdr-sw-btn-icon"><Download size={15} strokeWidth={2} /></span>
                <span className="apps-hdr-sw-btn-body">
                  <span className="apps-hdr-sw-btn-title">Install Apps</span>
                  <span className="apps-hdr-sw-btn-sub">Deploy software</span>
                </span>
              </button>
              <div className="apps-hdr-sw-sep" />
              <button
                className={`apps-hdr-sw-btn apps-hdr-sw-btn--uninstall${activeTab === 'uninstall' ? ' apps-hdr-sw-btn--on' : ''}`}
                onClick={() => onTabChange?.('uninstall')}
              >
                <span className="apps-hdr-sw-btn-icon"><Trash2 size={15} strokeWidth={2} /></span>
                <span className="apps-hdr-sw-btn-body">
                  <span className="apps-hdr-sw-btn-title">Uninstall Apps</span>
                  <span className="apps-hdr-sw-btn-sub">Remove &amp; clean up</span>
                </span>
              </button>
              <div className="apps-hdr-sw-sep" />
              <button
                className={`apps-hdr-sw-btn apps-hdr-sw-btn--debloat${activeTab === 'debloat' ? ' apps-hdr-sw-btn--on' : ''}`}
                onClick={() => onTabChange?.('debloat')}
              >
                <span className="apps-hdr-sw-btn-icon"><PackageX size={15} strokeWidth={2} /></span>
                <span className="apps-hdr-sw-btn-body">
                  <span className="apps-hdr-sw-btn-title">Windows Debloat</span>
                  <span className="apps-hdr-sw-btn-sub">System cleanup</span>
                </span>
              </button>
            </div>
          </div>

          <div className="wd-toolbar-r">
            {/* Install selected */}
            <button
              className="wd-btn wd-btn--install"
              onClick={handleInstallSelected}
              disabled={loading || busy || selectedNotInstalled === 0}
              title={`Install ${selectedNotInstalled} selected item${selectedNotInstalled !== 1 ? 's' : ''}`}
            >
              {busy && selectedNotInstalled > 0
                ? <Loader2 size={12} className="wd-spin" />
                : <Download size={12} />
              }
              Install Selected
              {selectedNotInstalled > 0 && <span style={{ opacity: 0.7 }}>({selectedNotInstalled})</span>}
            </button>

            {/* Uninstall selected */}
            <button
              className="wd-btn wd-btn--remove"
              onClick={handleRemoveSelected}
              disabled={loading || busy || selectedInstalled === 0}
              title={`Remove ${selectedInstalled} selected item${selectedInstalled !== 1 ? 's' : ''}`}
            >
              {busy && selectedInstalled > 0
                ? <Loader2 size={12} className="wd-spin" />
                : <Trash2 size={12} />
              }
              Uninstall Selected
              {selectedInstalled > 0 && <span style={{ opacity: 0.7 }}>({selectedInstalled})</span>}
            </button>

            {/* Refresh */}
            <button
              className="wd-icon-btn"
              onClick={() => fetchItems()}
              disabled={loading || busy}
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'wd-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── Progress Overlay ── */}
        {busy && (
          <div className="wd-progress-overlay">
            <div className="wd-progress-bar-track">
              <div
                className="wd-progress-bar-fill"
                style={{ width: progressTotal > 0 ? `${(progressCurrent / progressTotal) * 100}%` : '0%' }}
              />
            </div>
            <div className="wd-progress-detail">
              <Loader2 size={12} className="wd-spin" />
              <span className="wd-progress-text">{progressMsg}</span>
              {progressTotal > 0 && (
                <span className="wd-progress-count">{progressCurrent} / {progressTotal}</span>
              )}
            </div>
          </div>
        )}

        {/* ── Selection Bar ── */}
        <div className="wd-sel-bar">
          <label className="wd-check-label">
            <input
              type="checkbox"
              className="wd-check"
              checked={allFilteredSelected}
              onChange={allFilteredSelected ? clearSelection : selectAll}
              disabled={loading || busy}
            />
            Select All
          </label>
          <label className="wd-check-label">
            <input
              type="checkbox"
              className="wd-check"
              checked={filtered.filter(i => i.installed && !i.nonRemovable).length > 0 &&
                filtered.filter(i => i.installed && !i.nonRemovable).every(i => selected.has(i.id))}
              onChange={e => e.target.checked ? selectInstalled() : clearSelection()}
              disabled={loading || busy}
            />
            Select All Installed
          </label>
          <label className="wd-check-label">
            <input
              type="checkbox"
              className="wd-check"
              checked={filtered.filter(i => !i.installed && !i.nonRemovable).length > 0 &&
                filtered.filter(i => !i.installed && !i.nonRemovable).every(i => selected.has(i.id))}
              onChange={e => e.target.checked ? selectNotInstalled() : clearSelection()}
              disabled={loading || busy}
            />
            Select All Not Installed
          </label>

          {selected.size > 0 && (
            <span className="wd-sel-count">{selected.size} selected</span>
          )}
        </div>

        {/* ── Body ── */}
        <div className="wd-body">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                className="wd-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 size={28} className="wd-spin" />
                <span>Loading Windows apps and features…</span>
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div
                key="empty"
                className="wd-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <PackageX size={32} className="wd-empty-icon" />
                <span>{searchQuery ? 'No items match your search' : 'No items found'}</span>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                className="wd-grid-sections"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {renderSection('Windows Apps', apps)}
                {renderSection('Windows Capabilities', capabilities)}
                {renderSection('Windows Optional Features', features)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Confirm Modal ── */}
        <AnimatePresence>
          {confirmModal.isOpen && (
            <div className="wd-modal-overlay">
              <motion.div
                className="wd-modal"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="wd-modal-header">
                  <AlertTriangle size={18} className="wd-modal-icon" />
                  <span>{confirmModal.title}</span>
                </div>
                <div className="wd-modal-body">
                  {confirmModal.message.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </div>
                <div className="wd-modal-footer">
                  <button className="wd-btn wd-btn--cancel" onClick={confirmModal.onCancel}>
                    Cancel
                  </button>
                  <button className="wd-btn wd-btn--danger" onClick={confirmModal.onConfirm}>
                    Permanently Remove
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default WindowsDebloat;
