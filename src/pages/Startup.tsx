import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Loader2,
  Power,
  FolderOpen,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  Zap,
  Activity,
  CheckCircle,
  XCircle,
  Copy,
  ClipboardCheck,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import '../styles/Startup.css';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface StartupItem {
  name: string;
  command: string;
  path: string;
  publisher: string;
  source: string;
  scope: string;
  isRunning: boolean;
  isEnabled: boolean;
  isProtected: boolean;
  regPath: string;
  type: 'registry' | 'folder';
}

type SortField = 'name' | 'path' | 'publisher' | 'source' | 'status';
type SortDir = 'asc' | 'desc';
type FilterTab = 'all' | 'enabled' | 'disabled' | 'running';

/* ─── Component ──────────────────────────────────────────────────────────── */
const Startup: React.FC<{ refreshSignal?: number }> = ({ refreshSignal = 0 }) => {
  const { addToast } = useToast();

  const [items, setItems] = useState<StartupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState<FilterTab>('all');

  /* ── Fetch ─────────────────────────────────────────────────────────── */
  const fetchItems = useCallback(async () => {
    if (!window.electron?.ipcRenderer) return;
    setLoading(true);
    try {
      const result: any = await window.electron.ipcRenderer.invoke('startup:list');
      if (result.success) {
        setItems(result.items || []);
      } else {
        addToast(result.error || 'Failed to load startup items', 'error');
      }
    } catch (err: any) {
      addToast(err?.message || 'Unexpected error', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  /* ── Refresh signal from parent ── */
  useEffect(() => {
    if (refreshSignal > 0) fetchItems();
  }, [refreshSignal, fetchItems]);

  /* ── Toggle enable / disable ───────────────────────────────────────── */
  const handleToggle = useCallback(async (item: StartupItem) => {
    if (item.isProtected) {
      addToast(`${item.name} is a protected system entry and cannot be modified.`, 'error');
      return;
    }
    const key = item.name + '|' + item.source;
    setTogglingIds(prev => new Set(prev).add(key));
    try {
      const result: any = await window.electron!.ipcRenderer.invoke('startup:toggle', {
        name: item.name,
        type: item.type,
        scope: item.scope,
        regPath: item.regPath,
        enable: !item.isEnabled,
        command: item.command,
      });
      if (result.success) {
        setItems(prev =>
          prev.map(i =>
            i.name === item.name && i.source === item.source
              ? { ...i, isEnabled: !i.isEnabled }
              : i
          )
        );
        addToast(`${item.name} ${!item.isEnabled ? 'enabled' : 'disabled'} for startup`, 'success');
      } else {
        addToast(result.error || 'Toggle failed', 'error');
      }
    } catch (err: any) {
      addToast(err?.message || 'Unexpected error', 'error');
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [addToast]);

  /* ── Copy path to clipboard ───────────────────────────────────────── */
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const handleCopyPath = useCallback((text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedPath(text);
      setTimeout(() => setCopiedPath(null), 1800);
    });
  }, []);

  /* ── Open file location ────────────────────────────────────────────── */
  const handleOpenLocation = useCallback(async (filePath: string) => {
    if (!filePath) { addToast('No file path available', 'error'); return; }
    try {
      await window.electron!.ipcRenderer.invoke('startup:open-location', filePath);
    } catch (err: any) {
      addToast(err?.message || 'Could not open location', 'error');
    }
  }, [addToast]);

  /* ── Sort via table header click ───────────────────────────────────── */
  const handleSort = useCallback((field: SortField) => {
    setSortDir(prev => (sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortField(field);
  }, [sortField]);

  /* ── Filter + search + sort pipeline ───────────────────────────────── */
  const filteredItems = useMemo(() => {
    let list = items;

    // Tab filter
    if (filter === 'enabled') list = list.filter(i => i.isEnabled);
    else if (filter === 'disabled') list = list.filter(i => !i.isEnabled);
    else if (filter === 'running') list = list.filter(i => i.isRunning);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.publisher.toLowerCase().includes(q) ||
          i.path.toLowerCase().includes(q) ||
          i.source.toLowerCase().includes(q)
      );
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'path':
          cmp = (a.path || a.command).localeCompare(b.path || b.command);
          break;
        case 'publisher':
          cmp = (a.publisher || 'zzz').localeCompare(b.publisher || 'zzz');
          break;
        case 'source':
          cmp = a.source.localeCompare(b.source);
          break;
        case 'status':
          cmp = Number(b.isEnabled) - Number(a.isEnabled);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [items, searchQuery, sortField, sortDir, filter]);

  /* ── Stats ─────────────────────────────────────────────────────────── */
  const totalCount = items.length;
  const enabledCount = items.filter(i => i.isEnabled).length;
  const disabledCount = items.filter(i => !i.isEnabled).length;
  const runningCount = items.filter(i => i.isRunning).length;

  /* ── Sort indicator helper ─────────────────────────────────────────── */
  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={11} className="st-sort-idle" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="st-sort-active" />
      : <ChevronDown size={11} className="st-sort-active" />;
  };

  const filters: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'enabled', label: 'Enabled', count: enabledCount },
    { key: 'disabled', label: 'Disabled', count: disabledCount },
    { key: 'running', label: 'Running', count: runningCount },
  ];

  return (
    <motion.div
      className="st"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* ── Toolbar: filters + search ─────────────────────────────────── */}
      <div className="st-toolbar">
        <div className="st-search-wrap">
          <Search size={13} className="st-search-icon" />
          <input
            type="text"
            className="st-search"
            placeholder="Search apps, publishers…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="st-search-clear" onClick={() => setSearchQuery('')}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="st-filters">
          {filters.map(f => (
            <button
              key={f.key}
              className={`st-filter${filter === f.key ? ' st-filter--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              <span className="st-filter-count">{f.count}</span>
              <span className="st-filter-label">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading state ────────────────────────────────────────────── */}
      {loading && items.length === 0 && (
        <div className="st-loading">
          <Loader2 size={32} className="st-spin" />
          <p>Scanning startup entries…</p>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {!loading && filteredItems.length === 0 && (
        <motion.div className="st-empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Zap size={48} />
          <h3>{searchQuery || filter !== 'all' ? 'No Matches' : 'No Startup Entries'}</h3>
          <p>{searchQuery ? 'Try a different search term.' : filter !== 'all' ? 'No entries match this filter.' : 'No startup entries were found on this system.'}</p>
        </motion.div>
      )}

      {/* ── Table ────────────────────────────────────────────────────── */}
      {!loading && filteredItems.length > 0 && (
        <motion.div className="st-table-wrap" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="st-table">
            {/* ── Sortable header ── */}
            <div className="st-row st-row--header">
              <div className="st-cell st-cell--name st-cell--sortable" onClick={() => handleSort('name')}>
                Application <SortIcon field="name" />
              </div>
              <div className="st-cell st-cell--path st-cell--sortable" onClick={() => handleSort('path')}>
                Path <SortIcon field="path" />
              </div>
              <div className="st-cell st-cell--publisher st-cell--sortable" onClick={() => handleSort('publisher')}>
                Publisher <SortIcon field="publisher" />
              </div>
              <div className="st-cell st-cell--status st-cell--sortable" onClick={() => handleSort('status')}>
                Status <SortIcon field="status" />
              </div>
              <div className="st-cell st-cell--actions">
                Actions
              </div>
            </div>

            {/* ── Data rows ── */}
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, i) => {
                const key = item.name + '|' + item.source;
                const toggling = togglingIds.has(key);
                return (
                  <motion.div
                    key={key}
                    className={`st-row${!item.isEnabled ? ' st-row--disabled' : ''}${item.isRunning ? ' st-row--running' : ''}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    {/* Name */}
                    <div className="st-cell st-cell--name">
                      <span className="st-app-name">{item.name}</span>
                    </div>

                    {/* Path */}
                    <div className="st-cell st-cell--path">
                      <button
                        className={`st-path-copy${copiedPath === (item.path || item.command) ? ' st-path-copy--copied' : ''}`}
                        title="Click to copy path"
                        onClick={() => handleCopyPath(item.path || item.command)}
                      >
                        <span className="st-app-path">{item.path || item.command}</span>
                        <span className="st-path-copy-icon">
                          {copiedPath === (item.path || item.command)
                            ? <ClipboardCheck size={12} />
                            : <Copy size={12} />}
                        </span>
                      </button>
                    </div>

                    {/* Publisher */}
                    <div className="st-cell st-cell--publisher">
                      {item.publisher || <span className="st-muted">Unknown</span>}
                    </div>

                    {/* Status */}
                    <div className="st-cell st-cell--status">
                      <div className="st-status-group">
                        {item.isEnabled ? (
                          <span className="st-badge st-badge--enabled"><CheckCircle size={12} /> Enabled</span>
                        ) : (
                          <span className="st-badge st-badge--disabled"><XCircle size={12} /> Disabled</span>
                        )}
                        {item.isRunning && (
                          <span className="st-badge st-badge--running"><Activity size={11} /> Running</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="st-cell st-cell--actions">
                      <button
                        className={`st-toggle${item.isEnabled ? ' st-toggle--on' : ' st-toggle--off'}${item.isProtected ? ' st-toggle--protected' : ''}`}
                        onClick={() => handleToggle(item)}
                        disabled={toggling || item.isProtected}
                        title={
                          item.isProtected
                            ? 'Protected system entry'
                            : item.isEnabled
                            ? 'Disable startup'
                            : 'Enable startup'
                        }
                      >
                        {toggling ? (
                          <Loader2 size={13} className="st-spin" />
                        ) : item.isProtected ? (
                          <ShieldAlert size={13} />
                        ) : (
                          <Power size={13} />
                        )}
                      </button>
                      <button
                        className="st-action-btn"
                        onClick={() => handleOpenLocation(item.path || item.command)}
                        title="Open file location"
                        disabled={!item.path && !item.command}
                      >
                        <FolderOpen size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default React.memo(Startup);
