import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, RotateCcw, Play, Search, Info, AlertTriangle, XCircle, Loader2, Check, X, ChevronRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useToast } from '../contexts/ToastContext';
import '../styles/ServiceOptimizer.css';

/* ───────────────── Types ───────────────── */
interface ServiceDef {
  name: string;
  target: string;
  risk: 'low' | 'medium' | 'high';
  category: string;
  description: string;
}

interface ServiceState {
  Exists: boolean;
  Status: string | null;
  StartType: string | null;
}

type Mode = 'safe' | 'balanced' | 'aggressive';

interface ProgressLogEntry {
  name: string;
  status: 'success' | 'skipped' | 'failed';
  reason?: string;
  prev: string | null;
  target: string;
}

interface ProgressSummary {
  total: number;
  success: number;
  skipped: number;
  failed: number;
}

/* ── Mode card definitions ── */
const MODE_CARDS: { id: Mode; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { id: 'safe',       label: 'Safe',       icon: <Shield size={20} />,      desc: 'Low-risk services only',    color: '#00F2FF' },
  { id: 'balanced',   label: 'Balanced',   icon: <ShieldCheck size={20} />, desc: 'Low + Medium risk',         color: '#FFD600' },
  { id: 'aggressive', label: 'Aggressive', icon: <ShieldAlert size={20} />, desc: 'Full Chris Titus config',   color: '#FF2D55' },
];

/* ── Normalise WMI StartMode → readable string ── */
function normStartType(raw: string | null): string {
  if (!raw) return 'Unknown';
  const m: Record<string, string> = { Auto: 'Automatic', Manual: 'Manual', Disabled: 'Disabled' };
  return m[raw] ?? raw;
}

function alreadyMatches(current: string | null, target: string): boolean {
  const c = normStartType(current);
  if (target === 'AutomaticDelayedStart') return c === 'Automatic';
  return c === target;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
const ServiceOptimizer: React.FC = () => {
  const { addToast } = useToast();

  /* ── State ── */
  const [mode, setMode] = useState<Mode>('safe');
  const [allDefs, setAllDefs] = useState<ServiceDef[]>([]);
  const [states, setStates] = useState<Record<string, ServiceState>>({});
  const [scanning, setScanning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [isElevated, setIsElevated] = useState(false);
  const [hasBackup, setHasBackup] = useState<{ exists: boolean; timestamp?: string; count?: number }>({ exists: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const scannedOnce = useRef(false);

  /* ── Progress state ── */
  const [progressPhase, setProgressPhase] = useState<'idle' | 'start' | 'working' | 'done'>('idle');
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressService, setProgressService] = useState('');
  const [progressLog, setProgressLog] = useState<ProgressLogEntry[]>([]);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  /* ── Fetch definitions + elevation once ── */
  useEffect(() => {
    const load = async () => {
      if (!window.electron?.ipcRenderer) return;
      try {
        const [defs, elev, backup] = await Promise.all([
          window.electron.ipcRenderer.invoke('svc:get-all-definitions'),
          window.electron.ipcRenderer.invoke('svc:is-elevated'),
          window.electron.ipcRenderer.invoke('svc:has-backup'),
        ]);
        setAllDefs(defs);
        setIsElevated(!!elev?.elevated);
        setHasBackup(backup || { exists: false });
      } catch (e) {
        console.error('[ServiceOptimizer] init error:', e);
      }
    };
    load();
  }, []);

  /* ── Listen for svc:progress events ── */
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;
    const unsub = window.electron.ipcRenderer.on('svc:progress', (data: any) => {
      if (!data) return;
      if (data.phase === 'start') {
        setProgressPhase('start');
        setProgressTotal(data.total);
        setProgressCurrent(0);
        setProgressLog([]);
        setProgressSummary(null);
        setProgressService('');
      } else if (data.phase === 'working') {
        setProgressPhase('working');
        setProgressCurrent(data.current);
        setProgressService(data.service || '');
        if (data.entry) {
          setProgressLog(prev => [...prev, data.entry]);
        }
      } else if (data.phase === 'done') {
        setProgressPhase('done');
        setProgressCurrent(data.total);
        setProgressSummary(data.summary || null);
      }
    });
    return () => { if (unsub) unsub(); };
  }, []);

  /* ── Auto-scroll log to bottom ── */
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progressLog]);

  /* ── Scan ── */
  const scan = useCallback(async () => {
    if (!window.electron?.ipcRenderer) return;
    setScanning(true);
    try {
      const result: any = await window.electron.ipcRenderer.invoke('svc:scan');
      if (result?.success) {
        setStates(result.states);
        scannedOnce.current = true;
      } else {
        addToast(result?.message || 'Scan failed', 'error');
      }
    } catch (e) {
      addToast('Failed to scan services', 'error');
    } finally {
      setScanning(false);
    }
  }, [addToast]);

  /* ── Auto-scan on mount ── */
  useEffect(() => {
    if (!scannedOnce.current && allDefs.length > 0) scan();
  }, [allDefs, scan]);

  /* ── Apply ── */
  const handleApply = useCallback(async () => {
    if (!window.electron?.ipcRenderer) return;
    if (!isElevated) {
      addToast('Administrator privileges required. Restart GS Center as admin.', 'error');
      return;
    }
    setApplying(true);
    setProgressPhase('start');
    setProgressLog([]);
    setProgressSummary(null);
    setProgressCurrent(0);
    setProgressService('');
    try {
      const payload = selected.size > 0
        ? { mode, selectedNames: Array.from(selected) }
        : { mode, selectedNames: null };
      const result: any = await window.electron.ipcRenderer.invoke('svc:apply', payload);
      if (result?.success) {
        addToast(result.message, 'success');
        await scan();
        const backup = await window.electron.ipcRenderer.invoke('svc:has-backup');
        setHasBackup(backup || { exists: false });
      } else {
        addToast(result?.message || 'Apply failed', 'error');
      }
    } catch (e) {
      addToast('Apply failed', 'error');
      setProgressPhase('idle');
    } finally {
      setApplying(false);
    }
  }, [mode, selected, isElevated, addToast, scan]);

  /* ── Restore ── */
  const handleRestore = useCallback(async () => {
    if (!window.electron?.ipcRenderer) return;
    if (!isElevated) {
      addToast('Administrator privileges required.', 'error');
      return;
    }
    setRestoring(true);
    try {
      const result: any = await window.electron.ipcRenderer.invoke('svc:restore');
      if (result?.success) {
        addToast(result.message, 'success');
        await scan();
      } else {
        addToast(result?.message || 'Restore failed', 'error');
      }
    } catch (e) {
      addToast('Restore failed', 'error');
    } finally {
      setRestoring(false);
    }
  }, [isElevated, addToast, scan]);

  /* ── Filtered services by mode (flat list) ── */
  const filteredServices = useMemo(() => {
    const modeRisks: Record<Mode, Set<string>> = {
      safe: new Set(['low']),
      balanced: new Set(['low', 'medium']),
      aggressive: new Set(['low', 'medium', 'high']),
    };
    const allowed = modeRisks[mode];
    let list = allDefs.filter(s => allowed.has(s.risk));

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    }

    // Sort alphabetically by name
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [allDefs, mode, searchTerm]);

  const totalListCount = filteredServices.length;

  const matchingCount = useMemo(() => {
    let count = 0;
    for (const s of filteredServices) {
      const st = states[s.name];
      if (st?.Exists && alreadyMatches(st.StartType, s.target)) count++;
    }
    return count;
  }, [filteredServices, states]);

  /* ── Are all (or all selected) services already optimized? ── */
  const allOptimized = useMemo(() => {
    if (!scannedOnce.current || totalListCount === 0) return false;
    if (selected.size > 0) {
      // Check only selected services
      return Array.from(selected).every(name => {
        const def = filteredServices.find(s => s.name === name);
        if (!def) return true;
        const st = states[name];
        return st?.Exists && alreadyMatches(st.StartType, def.target);
      });
    }
    // Check all services in current mode
    const existingServices = filteredServices.filter(s => states[s.name]?.Exists);
    return existingServices.length > 0 && existingServices.every(s => alreadyMatches(states[s.name].StartType, s.target));
  }, [filteredServices, states, selected, totalListCount]);

  /* ── Toggle individual service selection ── */
  const toggleService = (name: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  };

  /* ── Select All / None for visible services ── */
  const selectAll = () => {
    const s = new Set(selected);
    for (const svc of filteredServices) s.add(svc.name);
    setSelected(s);
  };
  const selectNone = () => setSelected(new Set());

  /* ── Dismiss progress overlay ── */
  const dismissProgress = () => {
    setProgressPhase('idle');
    setProgressLog([]);
    setProgressSummary(null);
  };

  /* ── Progress percentage ── */
  const progressPct = progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : 0;

  /* ═══════ RENDER ═══════ */
  return (
    <div className="svc-page">
      <PageHeader
        icon={<Shield size={20} />}
        title="Services"
        stat={
          scannedOnce.current
            ? <span className="svc-header-stat">{matchingCount} / {totalListCount} optimized</span>
            : undefined
        }
      />

      {/* ── Admin warning ── */}
      {!isElevated && (
        <motion.div className="svc-admin-warn" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <AlertTriangle size={16} />
          <span>GS Center is <b>not</b> running as Administrator. Service changes require elevation.</span>
        </motion.div>
      )}

      {/* ── Mode selector ── */}
      <div className="svc-mode-row">
        {MODE_CARDS.map(m => (
          <button
            key={m.id}
            className={`svc-mode-card${mode === m.id ? ' svc-mode-card--active' : ''}`}
            style={{ '--mode-color': m.color } as React.CSSProperties}
            onClick={() => { setMode(m.id); setSelected(new Set()); }}
          >
            <span className="svc-mode-icon">{m.icon}</span>
            <span className="svc-mode-label">{m.label}</span>
            <span className="svc-mode-desc">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* ── Aggressive warning ── */}
      <AnimatePresence>
        {mode === 'aggressive' && (
          <motion.div
            className="svc-aggro-warn"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AlertTriangle size={15} />
            <span><b>Aggressive mode</b> modifies all services including high-risk system components. A backup is always created before applying.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions bar ── */}
      <div className="svc-actions-bar">
        <div className="svc-actions-left">
          <button className="svc-btn svc-btn--scan" onClick={scan} disabled={scanning}>
            {scanning ? <Loader2 size={14} className="svc-spin" /> : <Search size={14} />}
            {scanning ? 'Scanning…' : 'Scan Services'}
          </button>
          <button className="svc-btn svc-btn--apply" onClick={handleApply} disabled={applying || !scannedOnce.current || allOptimized}>
            {applying ? <Loader2 size={14} className="svc-spin" /> : allOptimized ? <Check size={14} /> : <Play size={14} />}
            {applying ? 'Applying…' : allOptimized ? 'All Optimized' : selected.size > 0 ? `Apply ${selected.size} Selected` : `Apply ${MODE_CARDS.find(c => c.id === mode)!.label} Mode`}
          </button>
        </div>

        <div className="svc-actions-right">
          {hasBackup.exists && (
            <button className="svc-btn svc-btn--restore" onClick={handleRestore} disabled={restoring}>
              {restoring ? <Loader2 size={14} className="svc-spin" /> : <RotateCcw size={14} />}
              {restoring ? 'Restoring…' : 'Restore Backup'}
            </button>
          )}
        </div>
      </div>

      {/* ── Selection helpers ── */}
      <div className="svc-selection-row">
        <button className="svc-link-btn" onClick={selectAll}>Select All</button>
        <span className="svc-selection-sep">|</span>
        <button className="svc-link-btn" onClick={selectNone}>Select None</button>
        {selected.size > 0 && <span className="svc-selection-count">{selected.size} selected</span>}

        {/* Search */}
        <div className="svc-search-wrap">
          <Search size={13} className="svc-search-icon" />
          <input
            className="svc-search"
            placeholder="Filter services…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ── Backup info ── */}
      {hasBackup.exists && progressPhase === 'idle' && (
        <div className="svc-backup-info">
          <Info size={13} />
          <span>Backup: {hasBackup.count} services saved on {new Date(hasBackup.timestamp!).toLocaleString()}</span>
        </div>
      )}

      {/* ── Progress overlay ── */}
      <AnimatePresence>
        {progressPhase !== 'idle' && (
          <motion.div
            className="svc-progress"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="svc-progress-header">
              <div className="svc-progress-title">
                {progressPhase === 'done'
                  ? <Check size={14} />
                  : <Loader2 size={14} className="svc-spin" />
                }
                <span>
                  {progressPhase === 'done'
                    ? 'Optimization Complete'
                    : `Applying tweaks… (${progressCurrent}/${progressTotal})`
                  }
                </span>
              </div>
              {progressPhase === 'done' && (
                <button className="svc-progress-close" onClick={dismissProgress}>
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="svc-progress-bar-track">
              <motion.div
                className="svc-progress-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>

            {/* Current service */}
            {progressPhase === 'working' && progressService && (
              <div className="svc-progress-current">
                <ChevronRight size={11} />
                <span>Setting <b>{progressService}</b> → Manual</span>
              </div>
            )}

            {/* Summary (when done) */}
            {progressPhase === 'done' && progressSummary && (
              <div className="svc-progress-summary">
                <span className="svc-ps svc-ps--success">{progressSummary.success} changed</span>
                <span className="svc-ps svc-ps--skipped">{progressSummary.skipped} skipped</span>
                {progressSummary.failed > 0 && (
                  <span className="svc-ps svc-ps--failed">{progressSummary.failed} failed</span>
                )}
              </div>
            )}

            {/* Log panel */}
            {progressLog.length > 0 && (
              <div className="svc-progress-log">
                {progressLog.map((entry, i) => (
                  <div key={i} className={`svc-log-entry svc-log-entry--${entry.status}`}>
                    <span className="svc-log-icon">
                      {entry.status === 'success' ? '✔' : entry.status === 'skipped' ? '→' : '✖'}
                    </span>
                    <span className="svc-log-name">{entry.name}</span>
                    <span className="svc-log-detail">
                      {entry.status === 'success'
                        ? `${entry.prev || '?'} → ${entry.target}`
                        : entry.status === 'skipped'
                          ? entry.reason || 'Skipped'
                          : entry.reason || 'Failed'
                      }
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Service grid ── */}
      <div className="svc-list">
        <div className="svc-grid">
          {filteredServices.map(svc => {
            const st = states[svc.name];
            const exists = st?.Exists ?? false;
            const matches = exists && alreadyMatches(st?.StartType ?? null, svc.target);
            const isSelected = selected.has(svc.name);

            const cardClass = [
              'svc-card',
              isSelected ? 'svc-card--selected' : '',
              !exists ? 'svc-card--missing' : '',
              matches ? 'svc-card--match' : '',
            ].filter(Boolean).join(' ');

            /* Dot colour: green = already optimized, amber = needs change, grey = not found */
            const dotClass = !exists
              ? 'svc-dot svc-dot--off'
              : matches
                ? 'svc-dot svc-dot--good'
                : 'svc-dot svc-dot--pending';

            /* Right-side badge icon */
            const badgeClass = !exists
              ? 'svc-card-badge svc-card-badge--missing'
              : matches
                ? 'svc-card-badge svc-card-badge--match'
                : 'svc-card-badge svc-card-badge--pending';

            return (
              <div
                key={svc.name}
                className={cardClass}
                onClick={() => exists && toggleService(svc.name)}
                title={`${svc.description}\n${svc.category} · ${svc.risk} risk`}
              >
                <div className="svc-card-cb" />
                <span className={dotClass} />
                <div className="svc-card-info">
                  <span className="svc-card-name">{svc.name}</span>
                </div>
                <div className={badgeClass}>
                  {!exists
                    ? <XCircle size={10} />
                    : matches
                      ? <Check size={10} strokeWidth={3} />
                      : <AlertTriangle size={10} />
                  }
                </div>
              </div>
            );
          })}
        </div>

        {filteredServices.length === 0 && (
          <div className="svc-empty">No services match your filter.</div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ServiceOptimizer);
