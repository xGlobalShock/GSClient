import React, { useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import { loadSettings } from '../utils/settings';

const SESSION_KEY = 'gc-auto-cleanup-ran';

const WINDOWS_IDS = [
  'thumbnail-cache',
  'windows-logs',
  'crash-dumps',
  'temp-files',
  'update-cache',
  'dns-cache',
  'ram-cache',
  'recycle-bin',
] as const;

const CLEANER_MAP: Record<string, string> = {
  'thumbnail-cache': 'cleaner:clear-thumbnail-cache',
  'windows-logs': 'cleaner:clear-windows-logs',
  'crash-dumps': 'cleaner:clear-crash-dumps',
  'temp-files': 'cleaner:clear-temp-files',
  'update-cache': 'cleaner:clear-update-cache',
  'dns-cache': 'cleaner:clear-dns-cache',
  'ram-cache': 'cleaner:clear-ram-cache',
  'recycle-bin': 'cleaner:empty-recycle-bin',
};

interface CleanResult {
  success: boolean;
  message?: string;
  spaceSaved?: string;
}

const parseSizeToMB = (s?: string): number | null => {
  if (!s) return null;
  const regex = /([\d,]+(?:\.\d+)?)\s*(tb|gb|mb|kb|b)\b/gi;
  let m: RegExpExecArray | null;
  let total = 0;
  let found = false;
  while ((m = regex.exec(s)) !== null) {
    const num = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isNaN(num)) continue;
    found = true;
    const unit = m[2].toLowerCase();
    if (unit === 'tb') total += num * 1024 * 1024;
    else if (unit === 'gb') total += num * 1024;
    else if (unit === 'kb') total += num / 1024;
    else if (unit === 'b') total += num / (1024 * 1024);
    else total += num;
  }
  return found ? total : null;
};

interface Props {
  /** Pass true once the app has finished its initial loading phase. */
  ready: boolean;
}

const AutoCleanupRunner: React.FC<Props> = ({ ready }) => {
  const { addToast } = useToast();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (hasRun.current) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const settings = loadSettings();
    if (!settings.autoCleanupOnStartup) return;
    if (!window.electron?.ipcRenderer) return;

    // Mark as run immediately to prevent any concurrent invocations.
    hasRun.current = true;
    sessionStorage.setItem(SESSION_KEY, '1');

    const runCleanup = async () => {
      addToast(
        <span>Auto Cleanup Toolkit is running in the background…</span>,
        'info'
      );

      // Fire all cleaners in parallel — avoids holding the renderer's
      // microtask queue hostage for the full sequential duration.
      const entries = WINDOWS_IDS.map(id => ({ id, channel: CLEANER_MAP[id] })).filter(e => e.channel);
      const results = await Promise.allSettled(
        entries.map(({ channel }) =>
          (window as any).electron.ipcRenderer.invoke(channel) as Promise<CleanResult>
        )
      );

      let succeeded = 0;
      let totalSavedMB = 0;

      for (const res of results) {
        if (res.status === 'fulfilled' && res.value?.success) {
          succeeded++;
          const mb = parseSizeToMB(res.value.spaceSaved);
          if (mb !== null) totalSavedMB += mb;
        }
      }

      if (succeeded > 0) {
        const sizeStr =
          totalSavedMB >= 1024
            ? `${(totalSavedMB / 1024).toFixed(2)} GB`
            : `${totalSavedMB.toFixed(2)} MB`;
        addToast(
          <span>
            Auto Cleanup complete — freed{' '}
            <strong className="toast-highlight">{sizeStr}</strong>
          </span>,
          'success'
        );
      }
    };

    // Delay slightly so the UI finishes rendering before background I/O starts.
    const timer = setTimeout(runCleanup, 3000);
    return () => {
      clearTimeout(timer);
      // Reset guards so React StrictMode's simulate-unmount/remount cycle
      // doesn't permanently block the timer on the real mount.
      hasRun.current = false;
      sessionStorage.removeItem(SESSION_KEY);
    };
  }, [ready, addToast]);

  return null;
};

export default AutoCleanupRunner;
