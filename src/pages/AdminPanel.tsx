import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Shield, Search, CheckCircle, XCircle, UserX, Crown, RefreshCw, X, CalendarPlus, Users, Zap, Lock, Activity } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';
import '../styles/AdminPanel.css';

/* ─── Helpers ─────────────────────────────────────────────────────── */
const ROLE_LABELS: Record<string, string> = {
  user: 'Free',
  pro: 'PRO',
  admin: 'Admin',
  owner: 'Owner',
};

const roleBadgeClass = (role: string) => {
  switch (role) {
    case 'owner': return 'adm-badge adm-badge--owner';
    case 'admin': return 'adm-badge adm-badge--admin';
    case 'pro':   return 'adm-badge adm-badge--pro';
    default:      return 'adm-badge adm-badge--user';
  }
};

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

type GrantPreset = '5m' | '3d' | '5d' | '1w' | '2w' | '1m' | '3m' | '6m' | '1y' | '2y' | 'lifetime' | 'free';

const PRESET_LABELS: Record<GrantPreset, string> = {
  '5m':       '5 Minutes (test)',
  '3d':       '3 Days',
  '5d':       '5 Days',
  '1w':       '1 Week',
  '2w':       '2 Weeks',
  '1m':       '1 Month',
  '3m':       '3 Months',
  '6m':       '6 Months',
  '1y':       '1 Year',
  '2y':       '2 Years',
  'lifetime': 'Lifetime',
  'free':     'Revoke (Free)',
};

/** Returns ISO string for timed presets, null for lifetime, 'free' sentinel for revoke */
const resolvePreset = (preset: GrantPreset): string | null | 'free' => {
  if (preset === 'free')     return 'free';
  if (preset === 'lifetime') return null;
  const d = new Date();
  switch (preset) {
    case '5m': d.setMinutes(d.getMinutes() + 5);    break;
    case '3d': d.setDate(d.getDate() + 3);          break;
    case '5d': d.setDate(d.getDate() + 5);          break;
    case '1w': d.setDate(d.getDate() + 7);          break;
    case '2w': d.setDate(d.getDate() + 14);         break;
    case '1m': d.setMonth(d.getMonth() + 1);        break;
    case '3m': d.setMonth(d.getMonth() + 3);        break;
    case '6m': d.setMonth(d.getMonth() + 6);        break;
    case '1y': d.setFullYear(d.getFullYear() + 1);  break;
    case '2y': d.setFullYear(d.getFullYear() + 2);  break;
  }
  return d.toISOString();
};

/* ─── User Row ─────────────────────────────────────────────────────── */
interface UserRowProps {
  user: UserProfile;
  currentUserId: string | undefined;
  onGrant: (id: string, expiresAt: string | null) => Promise<void>;
  onRevoke: (id: string) => Promise<void>;
  busy: string | null;
  feedback: { id: string; message: string; ok: boolean } | null;
}

const UserRow: React.FC<UserRowProps> = ({ user, currentUserId, onGrant, onRevoke, busy, feedback }) => {
  const isBusy      = busy === user.id;
  const isSelf      = user.id === currentUserId;
  const isElevated  = user.role === 'admin' || user.role === 'owner';
  const isAlreadyPro = user.role === 'pro';
  const isLifetime  = user.role === 'pro' && !user.pro_expires_at;
  const rowFeedback = feedback?.id === user.id ? feedback : null;

  const [preset, setPreset] = useState<GrantPreset>('1m');

  const handleApply = () => {
    const resolved = resolvePreset(preset);
    if (resolved === 'free') onRevoke(user.id);
    else onGrant(user.id, resolved);
  };

  return (
    <div className={`adm-row${isSelf ? ' adm-row--self' : ''}${rowFeedback ? (rowFeedback.ok ? ' adm-row--ok' : ' adm-row--err') : ''}`}>

      {/* ── IDENTITY ── */}
      <div className="adm-col adm-col--identity">
        <div className="adm-avatar">
          {user.avatar_url
            ? <img src={user.avatar_url} alt={user.username} className="adm-avatar-img" />
            : <span className="adm-avatar-init">{(user.username || '?')[0].toUpperCase()}</span>
          }
          <span className={`adm-status-dot adm-status-dot--${user.role}`} />
        </div>
        <div className="adm-identity-text">
          <div className="adm-name-row">
            <span className="adm-name">{user.username || '(no name)'}</span>
            {isSelf && <span className="adm-self-tag">YOU</span>}
          </div>
          <span className="adm-email">{user.email || '—'}</span>
        </div>
      </div>

      {/* ── ROLE ── */}
      <div className="adm-col adm-col--role">
        <span className={roleBadgeClass(user.role)}>{ROLE_LABELS[user.role] ?? user.role}</span>
        {user.subscription_status === 'active' && user.role === 'pro' && (
          <span className="adm-sub-pill adm-sub-pill--active">ACTIVE</span>
        )}
        {user.subscription_status === 'cancelled' && (
          <span className="adm-sub-pill adm-sub-pill--cancelled">CANCELLED</span>
        )}
      </div>

      {/* ── SOURCE ── */}
      <div className="adm-col adm-col--source">
        {user.pro_source
          ? <span className="adm-source-chip">{user.pro_source}</span>
          : <span className="adm-null-val">—</span>
        }
      </div>

      {/* ── EXPIRES ── */}
      <div className="adm-col adm-col--expires">
        {isLifetime
          ? <span className="adm-expires--lifetime">∞ LIFETIME</span>
          : user.pro_expires_at
            ? <span className="adm-expires--timed">{formatDate(user.pro_expires_at)}</span>
            : <span className="adm-null-val">—</span>
        }
      </div>

      {/* ── CONTROL ── */}
      <div className="adm-col adm-col--control">
        {rowFeedback && (
          <span className={`adm-row-feedback${rowFeedback.ok ? ' adm-row-feedback--ok' : ' adm-row-feedback--err'}`}>
            {rowFeedback.ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
            {rowFeedback.message}
          </span>
        )}
        {isElevated ? (
          <span className="adm-protected"><Crown size={11} /> Protected</span>
        ) : (
          <div className="adm-control-group">
            <select
              className={`adm-preset-select${
                preset === 'free'     ? ' adm-preset-select--danger'
                : preset === 'lifetime' ? ' adm-preset-select--lifetime'
                : ''
              }`}
              value={preset}
              onChange={e => setPreset(e.target.value as GrantPreset)}
              disabled={isBusy}
            >
              {(Object.keys(PRESET_LABELS) as GrantPreset[]).map(p => (
                <option key={p} value={p}>{PRESET_LABELS[p]}</option>
              ))}
            </select>
            <button
              className={`adm-apply-btn${preset === 'free' ? ' adm-apply-btn--revoke' : ' adm-apply-btn--grant'}`}
              disabled={isBusy}
              onClick={handleApply}
            >
              {isBusy
                ? <RefreshCw size={12} className="adm-spin" />
                : preset === 'free' ? <XCircle size={12} /> : <CalendarPlus size={12} />
              }
              {preset === 'free' ? 'Revoke' : isAlreadyPro ? 'Extend' : 'Grant'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Admin Panel Page ─────────────────────────────────────────────── */
const AdminPanel: React.FC = () => {
  const { isAdmin, isOwner, loading: authLoading, user, grantPro, revokePro } = useAuth();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdmin && !isOwner) {
      window.dispatchEvent(new CustomEvent('navigate:page', { detail: { page: 'dashboard' } }));
    }
  }, [authLoading, isAdmin, isOwner]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; message: string; ok: boolean } | null>(null);

  /* ── All hooks must be declared before any early return ─────────── */
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setAllUsers(data as UserProfile[]);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin || isOwner) loadUsers();
  }, [isAdmin, isOwner, loadUsers]);

  const stats = useMemo(() => ({
    total:    allUsers.length,
    pro:      allUsers.filter(u => u.role === 'pro').length,
    free:     allUsers.filter(u => u.role === 'user').length,
    elevated: allUsers.filter(u => u.role === 'admin' || u.role === 'owner').length,
  }), [allUsers]);

  const displayedUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return allUsers;
    return allUsers.filter(u =>
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  }, [allUsers, query]);

  const handleGrant = useCallback(async (userId: string, expiresAt: string | null) => {
    setBusy(userId);
    const ok = await grantPro(userId, expiresAt);
    setBusy(null);
    if (ok) {
      setAllUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, role: 'pro', pro_source: 'manual', pro_expires_at: expiresAt, subscription_status: 'active' }
          : u
      ));
      const label = expiresAt === null ? 'Lifetime PRO granted.' : 'PRO access granted.';
      setFeedback({ id: userId, message: label, ok: true });
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({ id: userId, message: 'Failed to grant PRO.', ok: false });
      setTimeout(() => setFeedback(null), 3500);
    }
  }, [grantPro]);

  const handleRevoke = useCallback(async (userId: string) => {
    setBusy(userId);
    const ok = await revokePro(userId);
    setBusy(null);
    if (ok) {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'user', pro_source: null, pro_expires_at: null, subscription_status: null } : u));
      setFeedback({ id: userId, message: 'PRO access revoked.', ok: true });
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({ id: userId, message: 'Failed to revoke PRO.', ok: false });
      setTimeout(() => setFeedback(null), 3500);
    }
  }, [revokePro]);

  /* ── Guard (after all hooks) ────────────────────────────────────── */
  if (!isAdmin && !isOwner) return null;

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="admin-panel">
      <PageHeader
        icon={<Shield size={18} />}
        title="Admin Panel"
        stat={<span className="adm-role-tag">{isOwner ? 'Owner' : 'Admin'}</span>}
      />

      {/* ── Stats row ── */}
      {allUsers.length > 0 && (
        <div className="adm-stats-row">
          <div className="adm-stat-card adm-stat-card--default">
            <div className="adm-stat-icon"><Users size={15} /></div>
            <div className="adm-stat-body">
              <span className="adm-stat-value">{stats.total}</span>
              <span className="adm-stat-label">Total Users</span>
            </div>
          </div>
          <div className="adm-stat-card adm-stat-card--pro">
            <div className="adm-stat-icon"><Zap size={15} /></div>
            <div className="adm-stat-body">
              <span className="adm-stat-value">{stats.pro}</span>
              <span className="adm-stat-label">PRO Members</span>
            </div>
          </div>
          <div className="adm-stat-card adm-stat-card--free">
            <div className="adm-stat-icon"><Activity size={15} /></div>
            <div className="adm-stat-body">
              <span className="adm-stat-value">{stats.free}</span>
              <span className="adm-stat-label">Free Tier</span>
            </div>
          </div>
          <div className="adm-stat-card adm-stat-card--admin">
            <div className="adm-stat-icon"><Lock size={15} /></div>
            <div className="adm-stat-body">
              <span className="adm-stat-value">{stats.elevated}</span>
              <span className="adm-stat-label">Elevated</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="adm-toolbar">
        <div className="adm-search-wrap">
          <Search size={14} className="adm-search-icon" />
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search by name or email…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="adm-clear-btn" onClick={() => setQuery('')}>
              <X size={12} />
            </button>
          )}
        </div>
        <button
          className="adm-refresh-btn"
          onClick={loadUsers}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'adm-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {loadError && (
        <div className="adm-banner adm-banner--err">
          <XCircle size={14} /> {loadError}
        </div>
      )}

      {/* ── Table ── */}
      <div className="adm-table-wrap">
        <div className="adm-table-head">
          <div className="adm-th adm-th--identity">Identity</div>
          <div className="adm-th adm-th--role">Role</div>
          <div className="adm-th adm-th--source">Source</div>
          <div className="adm-th adm-th--expires">Expires</div>
          <div className="adm-th adm-th--control">Control</div>
        </div>

        <div className="adm-table-body">
          {loading ? (
            <div className="adm-loading">
              <RefreshCw size={22} className="adm-spin" />
              <span>Fetching users…</span>
            </div>
          ) : loadError ? null : displayedUsers.length === 0 ? (
            <div className="adm-empty">
              <UserX size={28} />
              <span>{query ? `No results for "${query}"` : 'No users found.'}</span>
            </div>
          ) : (
            <>
              <div className="adm-results-count">
                {displayedUsers.length} {displayedUsers.length === 1 ? 'user' : 'users'}
                {query && ` matching "${query}"`}
              </div>
              {displayedUsers.map(u => (
                <UserRow
                  key={u.id}
                  user={u}
                  currentUserId={user?.id}
                  onGrant={handleGrant}
                  onRevoke={handleRevoke}
                  busy={busy}
                  feedback={feedback}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
