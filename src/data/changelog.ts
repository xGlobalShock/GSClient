export interface ChangelogEntry {
  version: string;
  date: string;
  highlights?: string;
  changes: {
    type: 'new' | 'improved' | 'fixed';
    text: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: '1.4.9',
    date: '2026-03-28',
    highlights: 'Global UI Standardization & Layout Refinement',
    changes: [
      { type: 'improved', text: 'Standardized vertical header alignment across all application modules.' },
      { type: 'improved', text: 'Compacted Performance Tweak cards for high-density information display.' },
      { type: 'fixed', text: 'Normalized Windows Debloat UI and search bar to match the Apps Manager ecosystem.' },
      { type: 'new', text: 'Added dynamic application version display to the main header.' },
    ],
  },
  {
    version: '1.4.8',
    date: '2026-03-27',
    highlights: 'New Splash Screen and Minor Bug Fixes',
    changes: [ 
      { type: 'new', text: 'Added a new splash screen with detailed startup steps and progress indicators.' },
      { type: 'fixed', text: 'Resolved minor UI glitches in the new splash screen implementation.' },
      { type: 'fixed', text: 'Addressed a rare issue where the splash screen could get stuck on certain hardware configurations.' },
      { type: 'improved', text: 'Optimized splash screen performance to ensure smooth loading on all supported systems.' },
    ],
  },
  {
    version: '1.4.7',
    date: '2026-03-27',
    highlights: 'Windows Debloat System Overhaul & Startup Optimizations',
    changes: [
      { type: 'improved', text: 'Completely overhauled the Windows Debloat system with pre-warmed background loading to eliminate UI freezing and loading spinners.' },
      { type: 'improved', text: 'Merged the Windows Debloat page into the Apps Manager to create a unified ecosystem (Install, Uninstall, Debloat) with seamless tab switching.' },
      { type: 'improved', text: 'Consolidated PowerShell status checks into a single, highly optimized execution context to drastically reduce CPU overhead during application boot.' },
      { type: 'new', text: 'Replaced reactive loading statuses with a professional, granular splash screen sequence detailing exact startup steps.' },
      { type: 'new', text: 'Redesigned Windows Debloat badges with clean, color-coded neon indicators and added safety tooltips for non-reinstallable system apps.' },
      { type: 'new', text: 'Introduced an interactive confirmation modal with strict warnings when attempting to remove non-reinstallable Windows capabilities.' },
      { type: 'new', text: 'Added a new Games registry tweak to optimize the Multimedia/SystemProfile/Tasks/Games priority value for improved performance.' },
      { type: 'improved', text: 'Refined Game Library functionality with a new toggle for the video settings page and resolved unhandled TypeScript errors.' },
    ],
  },
  {
    version: '1.4.6',
    date: '2026-03-27',
    highlights: 'Cleanup toolkit and PC tweak support improvements',
    changes: [
      { type: 'new', text: 'Added PC tweak support for Disable-MMAgent memory compression toggle and full status checks.' },
      { type: 'new', text: 'Enhanced Cleanup Toolkit descriptions and card layout for clarity and usability.' },
      { type: 'new', text: 'Compact cleanup toolkit cards with tuned grid sizing and spacing.' },
      { type: 'fixed', text: 'Removed legacy automationItems registry from code path and resolved title/description alignment on cleaner cards.' },
      { type: 'fixed', text: 'Fixed Win32 priority registry check path and UI status detection that previously failed.' },
      { type: 'fixed', text: 'Resolved UI text layout issues in cleanup cards.' },
      { type: 'improved', text: 'Adjusted cleaner card grid sizing, spacing, and responsive behavior.' },
      { type: 'improved', text: 'Polished performance tweak wording, category mapping, and status indicator flows.' },
      { type: 'improved', text: 'Refined cleanup card descriptions and accent styling.' },
    ],
  },
];

export default changelog;
