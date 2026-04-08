import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ProLock.css';

/* ─── Hook: check if features should be locked ──────────────────────── */
export function useProLock(): { isLocked: boolean } {
  const { isPro } = useAuth();
  return { isLocked: !isPro };
}

/* ─── ProLockedWrapper ───────────────────────────────────────────────── */
interface ProLockedWrapperProps {
  children: React.ReactNode;
  /** @deprecated No longer used — kept for API compatibility */
  compact?: boolean;
  /** @deprecated No longer used — kept for API compatibility */
  message?: string;
  /** @deprecated No longer used — kept for API compatibility */
  featureName?: string;
  /** @deprecated No longer used — kept for API compatibility */
  disabled?: boolean;
}

const ProLockedWrapper: React.FC<ProLockedWrapperProps> = ({ children }) => {
  const { isPro } = useAuth();

  const isLocked = !isPro;

  // Not locked — render children normally
  if (!isLocked) return <>{children}</>;

  return (
    <div className="pro-disabled-region">
      {children}
    </div>
  );
};

/* ─── ProLockedSection — same clean disabled approach ────────────────── */
interface ProLockedSectionProps {
  children: React.ReactNode;
  /** @deprecated No longer used — kept for API compatibility */
  title?: string;
  /** @deprecated No longer used — kept for API compatibility */
  featureName?: string;
}

export const ProLockedSection: React.FC<ProLockedSectionProps> = ({ children }) => {
  const { isPro } = useAuth();

  const isLocked = !isPro;

  if (!isLocked) return <>{children}</>;

  return (
    <div className="pro-disabled-region">
      {children}
    </div>
  );
};

export default ProLockedWrapper;
