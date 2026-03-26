export interface ChangelogEntry {
  version: string;
  date: string;
  highlights?: string;
  changes: {
    type: 'new' | 'improved' | 'fixed';
    text: string;
  }[];
}

const changelog: ChangelogEntry[] = [{
    version: '1.4.5',
    date: '2026-03-26',
    highlights: 'Minor updater fix',
    changes: [
      { type: 'fixed', text: 'Resolved a minor issue with the updater.' },
    ],
  },
    {
      version: '1.4.4',
      date: '2026-03-26',
      highlights: 'Improved updater UX with splash progress',
      changes: [
      { type: 'new', text: 'Enabled manual download + install flow via electron-updater.' },
      { type: 'improved', text: 'Show downloader status/percentage on splash screen.' },
      { type: 'fixed', text: 'Prevented main window stays open during update install step.' },
    ],
  },
];

export default changelog;
