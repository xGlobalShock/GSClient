export interface ChangelogEntry {
  version: string;
  date: string;
  highlights?: string;
  changes: {
    type: 'new' | 'improved' | 'fixed' | 'removed';
    text: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: '1.7.3',
    date: '2026-04-03',
    highlights: 'UI polish: network and advisor visuals; plotting improvements',
    changes: [
      {
        type: 'improved',
        text: 'System Advisor accent colors updated to match System Health (cyan) — consolidated compact pill styling in src/styles/AdvisorPanel.css',
      },
      {
        type: 'improved',
        text: 'Network chart visuals: increased vertical space for the Network card sparkline and adjusted chart container behavior to improve separation between Ping and Packet Loss (DashboardHero layout/CSS).',
      },
      {
        type: 'improved',
        text: 'Ping sparkline scaling: Y-axis adjusted to use a 0 baseline for more consistent visual scaling across sparklines (src/components/DashboardHero.tsx).',
      },
      {
        type: 'improved',
        text: 'Packet-loss history handling: recommended and tested increasing the packet-loss history buffer (example change from 60 → 180 samples) so short spikes remain visible longer; change can be applied in src/pages/LiveMetrics.tsx.',
      },
      {
        type: 'improved',
        text: 'UX polish: iterated on the Dashboard "More Info" button and compact card visuals (multiple CSS variants applied during design iterations in src/styles/DashboardHero.css).',
      },
    ],
  },
];

export default changelog;

