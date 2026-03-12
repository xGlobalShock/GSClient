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
    version: '1.4.0',
    date: '2026-03-12',
    highlights: 'System Details & Updater Improvements',
    changes: [
      { type: 'fixed', text: 'Fixed an issue where realtime update tracking would briefly disappear when a new version was detected.' },
      { type: 'improved', text: 'Added a progress bar to the memory statistics panel.' },
    ],
  },
  {
    version: '1.3.9',
    date: '2026-03-12',
    highlights: 'OBS Presets UI Refinement & Network Monitoring Fixes',
    changes: [
      { type: 'improved', text: 'Redesigned OBS Preset feature tags with refined spacing and visual hierarchy.' },
      { type: 'improved', text: 'System monitoring components typography and sizing refinements.' },
      { type: 'improved', text: 'Network stats calculation efficiency improved for consistent speed updates.' },
    ],
  },
];

export default changelog;
