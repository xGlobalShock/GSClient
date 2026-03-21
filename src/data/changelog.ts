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
    version: '1.4.2',
    date: '2026-03-21',
    highlights: 'System Details Improvements',
    changes: [
      { type: 'improved', text: 'Added a progress bar to the memory statistics panel.' },
    ],
  },
];

export default changelog;
