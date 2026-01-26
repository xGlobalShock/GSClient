// Settings persistence utilities for Phase 5

interface AppSettings {
  autoClean: boolean;
  notifications: boolean;
  autoOptimize: boolean;
  theme: 'dark' | 'light';
  startupLaunch: boolean;
  cleanupSchedule?: 'daily' | 'weekly' | 'monthly';
  lastCleanup?: string;
}

const SETTINGS_KEY = 'pc-optimizer-settings';
const DEFAULT_SETTINGS: AppSettings = {
  autoClean: true,
  notifications: true,
  autoOptimize: false,
  theme: 'dark',
  startupLaunch: true,
  cleanupSchedule: 'weekly',
};

export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Emit a window event so UI can react to settings changes
    try {
      if (typeof window !== 'undefined' && typeof (window as any).dispatchEvent === 'function') {
        (window as any).dispatchEvent(new CustomEvent('settings:updated', { detail: settings }));
      }
    } catch (e) {
      // ignore
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

export function resetSettings(): void {
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch (error) {
    console.error('Failed to reset settings:', error);
  }
}

// Schedule management
export interface CleanupSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-28 for monthly
  time: string; // HH:mm format
}

export function shouldRunCleanup(schedule: CleanupSchedule): boolean {
  const now = new Date();
  const [hours, minutes] = schedule.time.split(':').map(Number);

  if (now.getHours() !== hours || now.getMinutes() !== minutes) {
    return false;
  }

  switch (schedule.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return now.getDay() === (schedule.dayOfWeek ?? 0);
    case 'monthly':
      return now.getDate() === (schedule.dayOfMonth ?? 1);
    default:
      return false;
  }
}

// Optimization profile management
export interface OptimizationProfile {
  name: string;
  autoStart: boolean;
  processes: string[];
  settings: Record<string, boolean>;
}

const PROFILES_KEY = 'pc-optimizer-profiles';

export function loadProfiles(): OptimizationProfile[] {
  try {
    const stored = localStorage.getItem(PROFILES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveProfile(profile: OptimizationProfile): void {
  try {
    const profiles = loadProfiles();
    const index = profiles.findIndex(p => p.name === profile.name);

    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }

    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error('Failed to save profile:', error);
  }
}

export function deleteProfile(name: string): void {
  try {
    const profiles = loadProfiles();
    const filtered = profiles.filter(p => p.name !== name);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete profile:', error);
  }
}
