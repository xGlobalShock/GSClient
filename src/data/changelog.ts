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
    version: '2.1.7',
    date: '2026-04-13',
    highlights: 'Hotfix for 2.1.6 - Fixed Win Tweaks bug.',
    changes: [
      {
        type: 'fixed',
        text: 'Fixed a bug in the Win Tweaks page where none of the tweaks were applying due to a missing IPC handler.',
      },
    ],
  },
  {
    version: '2.1.6',
    date: '2026-04-12',
    highlights: 'Anti-Cheat database expansion, Enhanced Trace Route & Bug Fixes.',
    changes: [
      {
        type: 'new',
        text: 'Expanded Anti-Cheat game database — EAC (5 → 52 games), BattlEye (5 → 35 games), Vanguard (2 → 4 games) now covering all major protected titles.',
      },
      {
        type: 'new',
        text: 'Added 62+ new risky application entries across all categories — debuggers, automation tools, DLL injectors, VM software, network tools, cheat trainers, kernel drivers, and HWID spoofers.',
      },
      {
        type: 'new',
        text: 'Added Category 11 — Peripheral Macro/Scripting Detection covering Bloody/A4Tech, Cronus Zen, XIM, Strike Pack, Titan Two, and more.',
      },
      {
        type: 'new',
        text: 'Added 20+ safe/commonly-asked-about apps (NVIDIA GFE, Steam, Discord, Overwolf, Medal.tv, peripheral brands, audio tools) so users know what is safe to run.',
      },
      {
        type: 'new',
        text: 'Added restart prompt after Network Reset completes, with Restart Now / Later options.',
      },
      {
        type: 'improved',
        text: 'Peripheral software entries (Razer Synapse, Logitech G Hub, Corsair iCUE, SteelSeries GG) now warn about macro/scripting risks on FACEIT and ESEA.',
      },
      {
        type: 'improved',
        text: 'Mouse / Polling Rate page now handles corrupt localStorage gracefully with NaN-safe reads and shows a retry button on load errors.',
      },
      {
        type: 'fixed',
        text: 'Fixed auto-updater polling from every 30 seconds to every 4 hours — eliminated 960+ unnecessary network requests per 8-hour session.',
      },
      {
        type: 'fixed',
        text: 'Fixed toast notification timer leak — timers are now tracked per-toast and properly cleared on dismiss and unmount.',
      },
      {
        type: 'fixed',
        text: 'Removed duplicate CSS blocks in AppsPage and conflicting toolbar overrides in AppUninstaller styles.',
      },
      {
        type: 'fixed',
        text: 'Removed duplicate system:reboot IPC handler that conflicted with the existing system:restart handler.',
      },
    ],
  },
  {
    version: '2.1.5',
    date: '2026-04-11',
    highlights: 'Major update with new features, improvements, and fixes across the app.',
    changes: [
      {
        type: 'new',
        text: 'Added Trace Route diagnostics to the Network tools for improved connectivity troubleshooting.',
      },
      {
        type: 'new',
        text: 'Added a full Mouse / Polling Rate page with USB polling override, queue size control, and pointer configuration.',
      },
      {
        type: 'new',
        text: 'Added the Share Hardware Report workflow for sharing export-ready hardware reports.',
      },
      {
        type: 'new',
        text: 'Added the Dual PC guide section to support multi-machine setups and workflows.',
      },
      {
        type: 'new',
        text: 'Added AntiCheat compatibility status improvements, with safer wording and more accurate process reporting.',
      },
      {
        type: 'fixed',
        text: 'Fixed report image stretching and quality issues so shared images render at the correct native width and remain sharp.',
      },
      {
        type: 'fixed',
        text: 'Refined anti-cheat safe status text to avoid incorrect tweak claims and reflect actual compatibility checks.',
      },
    ],
  },
];

export default changelog;

