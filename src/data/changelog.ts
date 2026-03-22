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
  version: '1.4.3',
  date: '2026-03-22',
  highlights: 'New Debloat Tool & Game Library Optimization',
  changes: [
    { type: 'new', text: 'Added a new Debloat page to manage Windows Apps, Capabilities, and Optional Features in bulk' },
    { type: 'new', text: 'Implemented a dedicated backend IPC module using DISM and PowerShell for safe system debloating.' },
    { type: 'improved', text: 'Added a developer toggle for testing Video Settings in the Game Library.' },
    { type: 'improved', text: 'Scrubbed and optimized unused variables from Game Library to ensure zero-warning TypeScript compilation.' },
  ],
},
];

export default changelog;
