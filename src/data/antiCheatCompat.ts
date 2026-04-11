/* ── Anti-Cheat Compatibility Database ─────────────────────────────
 *  All registry/system tweaks in GC Center are SAFE — anti-cheats
 *  scan for runtime behaviour (drivers, injection, memory hacks),
 *  not Windows registry values.
 *
 *  This file focuses on detecting **risky software** installed on
 *  the PC that anti-cheats are verified to flag / ban for.
 *
 *  Status levels:
 *  'safe'    = no known issues  (green badge)
 *  'caution' = flagged when running alongside the game  (yellow badge)
 *  'risky'   = known to trigger bans even when not in use  (red badge)
 * ─────────────────────────────────────────────────────────────────── */

export type CompatStatus = 'safe' | 'caution' | 'risky';

export interface AntiCheatSystem {
  id: string;
  name: string;
  shortName: string;
  games: string[];
}

export interface RiskyApp {
  /** Process name(s) without .exe — matched against running procs */
  processNames: string[];
  /** Display name shown in UI */
  label: string;
  /** Per anti-cheat severity */
  status: Record<string, CompatStatus>;
  /** Why this app is flagged */
  note: string;
  /** How to resolve / stay safe */
  resolution: string;
}

/* ── Anti-cheat systems ────────────────────────────────────────── */

export const antiCheatSystems: AntiCheatSystem[] = [
  {
    id: 'eac',
    name: 'Easy Anti-Cheat',
    shortName: 'EAC',
    games: [
      'Fortnite',
      'Apex Legends',
      'Rust',
      'Dead by Daylight',
      'The Finals',
      'Fall Guys',
      'Halo Infinite',
      'Halo: The Master Chief Collection',
      'War Thunder',
      'Hunt: Showdown',
      'Smite',
      'Paladins',
      'For Honor',
      'Tom Clancy\'s Ghost Recon Wildlands',
      'Dragon Ball FighterZ',
      'Naraka: Bladepoint',
      'MultiVersus',
      'Back 4 Blood',
      'Elden Ring',
      'Lost Ark',
      'New World',
      'Star Citizen',
      'Squad',
      'Insurgency: Sandstorm',
      'Hell Let Loose',
      'Payday 3',
      'Rogue Company',
      'Knockout City',
      'Plants vs Zombies: Battle for Neighborville',
      'Warhammer: Vermintide 2',
      'Warhammer 40,000: Darktide',
      'Deep Rock Galactic',
      'Dragonball Xenoverse 2',
      'Robocraft',
      'Brawlhalla',
      'Splitgate',
      'Rocket Arena',
      'Chivalry 2',
      'Super People',
      'Palworld',
      'Dark and Darker',
      'The Day Before',
      'XDefiant',
      'Sword Art Online: Fatal Bullet',
      'Totally Accurate Battlegrounds',
      'Deceit',
      'Black Desert Online',
      'Watch Dogs: Legion',
      'Dying Light 2',
      'Unturned',
      'Conan Exiles',
      'Vigor',
    ],
  },
  {
    id: 'vanguard',
    name: 'Vanguard',
    shortName: 'VGD',
    games: [
      'Valorant',
      'League of Legends',
      'Teamfight Tactics',
      'Legends of Runeterra',
    ],
  },
  {
    id: 'battleye',
    name: 'BattlEye',
    shortName: 'BE',
    games: [
      'Rainbow Six Siege',
      'PUBG',
      'Escape from Tarkov',
      'DayZ',
      'Arma 3',
      'Arma Reforger',
      'Destiny 2',
      'Tom Clancy\'s The Division 2',
      'Tom Clancy\'s Rainbow Six Extraction',
      'Forza Horizon 5',
      'Forza Motorsport',
      'Mount & Blade II: Bannerlord',
      'Unturned',
      'Conan Exiles',
      'ARK: Survival Evolved',
      'ARK: Survival Ascended',
      'Vigor',
      'SCUM',
      'Enlisted',
      'Planetside 2',
      'H1Z1',
      'Islands of Nyne',
      'Civilization VI (Online)',
      'Crossout',
      'Warface',
      'The Cycle: Frontier',
      'Playerunknown\'s Battlegrounds: New State',
      'Delta Force',
      'Ghost Recon Breakpoint',
      'Tower of Fantasy',
      'Throne and Liberty',
      'Shatterline',
      'Squad',
      'Beyond the Wire',
      'Post Scriptum',
    ],
  },
  {
    id: 'faceit',
    name: 'FACEIT Anti-Cheat',
    shortName: 'FACEIT',
    games: ['CS2 (FACEIT)'],
  },
  {
    id: 'esea',
    name: 'ESEA Anti-Cheat',
    shortName: 'ESEA',
    games: ['CS2 (ESEA)'],
  },
];

/* ── Risky Applications ───────────────────────────────────────────
 *  Verified via official AC docs, community ban reports, and AC
 *  vendor statements. Each entry has confirmed detection history.
 *
 *  Categories:
 *  1. Memory editors / debuggers / reverse-engineering
 *  2. Automation / macro / scripting tools
 *  3. DLL injection / overlays / game modifiers
 *  4. Sandbox / virtualisation / emulation
 *  5. Network interception / packet tools
 *  6. Cheat / exploit software
 *  7. Kernel-driver utilities blocked by Vanguard
 *  8. HWID spoofers / ban-evasion tools
 *  9. Screen capture / pixel bots
 *  10. Miscellaneous — commonly asked about (safe apps)
 *  11. Peripheral software with macro / scripting risks
 * ─────────────────────────────────────────────────────────────── */

export const riskyApps: RiskyApp[] = [
  /* ═══════════════════════════════════════════════════════════════
   * 1. MEMORY EDITORS / DEBUGGERS / REVERSE-ENGINEERING
   * ═══════════════════════════════════════════════════════════════ */
  {
    processNames: ['cheatengine-x86_64', 'cheatengine-i386', 'cheatengine', 'cheatengine-x86_64-SSE4-AVX2'],
    label: 'Cheat Engine',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Universally detected. Bans reported even when not attached to the game. Its kernel driver (dbk64.sys) is flagged on load.',
    resolution: 'Fully uninstall Cheat Engine (including its kernel driver via "Uninstall" in the CE installer). Reboot before playing.',
  },
  {
    processNames: ['processhacker', 'systeminformer'],
    label: 'Process Hacker / System Informer',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Kernel-level process inspection tool. Vanguard blocks its driver (kprocesshacker.sys) on boot. FACEIT/ESEA ban outright.',
    resolution: 'Close the application and stop its driver service before playing. Use Task Manager instead for basic process monitoring.',
  },
  {
    processNames: ['x64dbg', 'x32dbg'],
    label: 'x64dbg / x32dbg',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'User-mode debugger. Anti-cheats detect debugger APIs. Vanguard blocks at kernel level even when idle.',
    resolution: 'Close x64dbg completely before launching any protected game. Do not debug and play simultaneously.',
  },
  {
    processNames: ['ollydbg', 'ollydbg2'],
    label: 'OllyDbg',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Legacy debugger. Same detection profile as x64dbg — detected via debug API hooks.',
    resolution: 'Close OllyDbg and reboot before playing to clear any debug flags.',
  },
  {
    processNames: ['windbg', 'windbgx', 'kd'],
    label: 'WinDbg (Windows Debugger)',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Kernel debugger. BattlEye explicitly blocks kernel debugging mode. Vanguard refuses to start if kernel debug is enabled.',
    resolution: 'Close WinDbg. Disable kernel debugging: run "bcdedit /debug off" as admin and reboot.',
  },
  {
    processNames: ['reclass', 'reclass.net', 'reclassnet64'],
    label: 'ReClass.NET',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Memory structure reverse-engineering tool. Universally flagged as cheat tooling.',
    resolution: 'Fully close ReClass.NET before playing. Consider uninstalling if you play competitively.',
  },
  {
    processNames: ['ida', 'ida64', 'idaq', 'idaq64'],
    label: 'IDA Pro / IDA Free',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'Disassembler. Vanguard and kernel-level ACs may flag if running during gameplay.',
    resolution: 'Close IDA before launching the game. Having it installed is fine, just don\'t run it while playing.',
  },
  {
    processNames: ['ghidra', 'ghidrarun'],
    label: 'Ghidra',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'caution', esea: 'safe' },
    note: 'NSA reverse-engineering framework. Similar to IDA — may be flagged if running alongside game.',
    resolution: 'Close Ghidra before playing. Installed files alone are not flagged.',
  },
  {
    processNames: ['hxd', 'hxd64'],
    label: 'HxD Hex Editor',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'caution', esea: 'safe' },
    note: 'Hex editor. Can be flagged by kernel ACs when accessing game memory regions.',
    resolution: 'Close HxD before playing. Do not open game files while the game is running.',
  },
  {
    processNames: ['dnspy', 'dnspy-x86'],
    label: 'dnSpy (.NET Debugger)',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: '.NET assembly debugger/editor. Flagged as potential cheat development tool.',
    resolution: 'Close dnSpy before launching any protected game.',
  },
  {
    processNames: ['apimonitor', 'apimonitor-x64', 'apimonitor-x86'],
    label: 'API Monitor',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Hooks Windows API calls in real-time. Flagged as debugger/instrumentation tool by kernel-level ACs.',
    resolution: 'Close API Monitor before playing. Do not hook game processes.',
  },
  {
    processNames: ['immunitydebugger', 'immunitydbg'],
    label: 'Immunity Debugger',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Python-scriptable debugger based on OllyDbg. Same detection profile — detected via debug API hooks.',
    resolution: 'Close Immunity Debugger before playing. Same precautions as OllyDbg.',
  },
  {
    processNames: ['cutter', 'cutter-re'],
    label: 'Cutter (radare2 GUI)',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'caution', esea: 'safe' },
    note: 'Open-source RE framework GUI. Similar to IDA/Ghidra — flagged when running alongside games by kernel ACs.',
    resolution: 'Close Cutter before playing. Having it installed is fine.',
  },
  {
    processNames: ['binaryninja', 'binaryninja-free'],
    label: 'Binary Ninja',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'caution', esea: 'safe' },
    note: 'Commercial disassembler/decompiler. Same category as IDA — may be flagged if running during gameplay.',
    resolution: 'Close Binary Ninja before playing. Installed files alone are not flagged.',
  },
  {
    processNames: ['scylla', 'scylla_x64', 'scylla_x86'],
    label: 'Scylla (IAT Dumper)',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Import reconstruction tool used for unpacking protected executables. Strongly associated with cheat development.',
    resolution: 'Close and preferably uninstall before playing any protected game.',
  },
  {
    processNames: ['peexplorer', 'pe-bear', 'pebear', 'pestudio', 'cff explorer', 'cffexplorer'],
    label: 'PE Analysis Tools (PE-bear, PEStudio, CFF Explorer)',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'caution', esea: 'safe' },
    note: 'PE header inspection tools. May be flagged by kernel ACs when analyzing game executables.',
    resolution: 'Close PE tools before playing. Do not analyze game binaries while the game is running.',
  },

  /* ═══════════════════════════════════════════════════════════════
   * 2. AUTOMATION / MACRO / SCRIPTING TOOLS
   * ═══════════════════════════════════════════════════════════════ */
  {
    processNames: ['autohotkey', 'autohotkey32', 'autohotkey64', 'autohotkeysc', 'autohotkeyu64', 'autohotkeyu32'],
    label: 'AutoHotkey',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'FACEIT and ESEA ban macro/scripting tools outright. BattlEye kicks (not bans) for macros. EAC flags if sending inputs to game.',
    resolution: 'Close all AHK scripts before playing. FACEIT/ESEA: uninstall or don\'t have any scripts running at all.',
  },
  {
    processNames: ['autoit', 'autoit3', 'aut2exe'],
    label: 'AutoIt',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Automation scripting. Same detection profile as AutoHotkey.',
    resolution: 'Close all AutoIt scripts and processes before playing.',
  },
  {
    processNames: ['tinytask'],
    label: 'TinyTask',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Macro recorder/playback. Detected as input automation.',
    resolution: 'Close TinyTask before playing any competitive game.',
  },
  {
    processNames: ['pulover', 'pulovermacrocreator'],
    label: 'Pulover\'s Macro Creator',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'AHK-based macro creator. Detected as AutoHotkey variant.',
    resolution: 'Close before playing. FACEIT/ESEA treat it the same as AHK.',
  },
  {
    processNames: ['keytweak'],
    label: 'KeyTweak',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'Registry-based key remapper. Generally safe but FACEIT may flag input-modifying tools.',
    resolution: 'Close KeyTweak before FACEIT matches. Remappings applied via registry persist without it running.',
  },
  {
    processNames: ['gsautoclicker', 'autoclicker', 'opautoclicker', 'fastclicker', 'freeclicker', 'clickermann'],
    label: 'Auto Clicker (GS / OP / generic)',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Simulates mouse clicks. Detected as input automation by all anti-cheats. FACEIT/ESEA ban outright.',
    resolution: 'Close all auto clicker software before playing any competitive game.',
  },
  {
    processNames: ['macrorecorder', 'jitbit', 'jitbitmacrorecorder'],
    label: 'JitBit Macro Recorder',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Commercial macro recorder. Detected as input automation tool.',
    resolution: 'Close before playing. FACEIT/ESEA ban all macro recorders.',
  },
  {
    processNames: ['minimousemacro'],
    label: 'Mini Mouse Macro',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Free mouse/keyboard macro tool. Same detection profile as other macro software.',
    resolution: 'Close before playing any anti-cheat protected game.',
  },
  {
    processNames: ['rewasd', 'rewasdservice'],
    label: 'reWASD (Controller Remapper)',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Advanced controller remapper with macro/combo support. FACEIT/ESEA flag its virtual device driver and macro features.',
    resolution: 'Disable macros/combos in reWASD before playing. FACEIT: stop the reWASD service entirely.',
  },
  {
    processNames: ['ds4windows'],
    label: 'DS4Windows',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'PlayStation controller emulator (ViGEm driver). Generally safe, but FACEIT may flag the virtual gamepad driver.',
    resolution: 'Usually fine. If FACEIT issues occur, close DS4Windows and use Steam Input instead.',
  },
  {
    processNames: ['inputmapper'],
    label: 'InputMapper',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'Controller remapper using ViGEm. Same profile as DS4Windows — virtual device driver may be flagged.',
    resolution: 'Close before FACEIT/ESEA matches if experiencing issues.',
  },
  {
    processNames: ['antimicro', 'antimicrox'],
    label: 'AntiMicro / AntiMicroX',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'Maps gamepad inputs to keyboard/mouse. May be flagged as input spoofing by strict ACs.',
    resolution: 'Close before FACEIT/ESEA matches.',
  },
  {
    processNames: ['interception', 'intercept'],
    label: 'Interception Driver',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Kernel-level input filter driver. Vanguard blocks on boot. Used by mouse smoothing tools — detected as input manipulation.',
    resolution: 'Uninstall the Interception driver: run "interception /uninstall" as admin and reboot. Vanguard will not start with it loaded.',
  },
  {
    processNames: ['rawaccel'],
    label: 'Raw Accel (Mouse Acceleration)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Custom mouse acceleration curves. Uses its own signed filter driver (not Interception). Whitelisted by Vanguard since v2.0.',
    resolution: 'No action needed. Raw Accel is safe. Ensure you are NOT using the old Interception-based version.',
  },

  /* ═══════════════════════════════════════════════════════════════
   * 3. DLL INJECTION / OVERLAYS / GAME MODIFIERS
   * ═══════════════════════════════════════════════════════════════ */
  {
    processNames: ['reshade', 'reshade64'],
    label: 'ReShade',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'DLL injection into game process. Vanguard blocks. BattlEye FAQ states it can be blocked per-game (PUBG, Fortnite). EAC allows whitelisted versions.',
    resolution: 'Remove ReShade DLLs (dxgi.dll, d3d9.dll, reshade-shaders) from game folder. Use NVIDIA/AMD native filters instead.',
  },
  {
    processNames: ['sweetfx'],
    label: 'SweetFX',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Graphics injection. Same detection as ReShade — uses DLL injection.',
    resolution: 'Remove SweetFX DLLs from the game directory.',
  },
  {
    processNames: ['enb', 'enbinjector'],
    label: 'ENBSeries',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Graphics enhancer using DLL injection (d3d9.dll proxy). Detected as injected code.',
    resolution: 'Remove ENB files (d3d9.dll, enbseries.ini, enblocal.ini) from game directory before playing online.',
  },
  {
    processNames: ['specialk', 'skif'],
    label: 'Special K (Game Modifier)',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'caution', esea: 'caution' },
    note: 'Global DLL injection for framerate/HDR mods. Detected as injected DLL in game process.',
    resolution: 'Disable Special K\'s global injection before playing. Remove its DLL from game folders.',
  },
  {
    processNames: ['extremeinjector', 'extreme_injector'],
    label: 'Extreme Injector',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'DLL injector explicitly designed for game hacking. Universally banned.',
    resolution: 'Uninstall immediately. Having this on your PC is a major red flag for all anti-cheats.',
  },
  {
    processNames: ['xenos', 'xenos64'],
    label: 'Xenos Injector',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Advanced DLL injector (manual map, thread hijacking). Universally flagged.',
    resolution: 'Delete and uninstall. All major anti-cheats detect this on sight.',
  },
  {
    processNames: ['ghl', 'gameoverlayx', 'gameoverlay'],
    label: 'Generic Game Overlay / Hook Libraries',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Any DLL hooking D3D/Vulkan render pipeline in the game process. Universally detected as injection.',
    resolution: 'Remove unknown overlay DLLs from game directories. Only use whitelisted overlays (Discord, Steam, NVIDIA).',
  },
  {
    processNames: ['rivatuner', 'rtss', 'rtssstatsserver'],
    label: 'RivaTuner Statistics Server (RTSS)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'FPS overlay/framerate limiter. Safe with all major anti-cheats — widely whitelisted. Keep updated.',
    resolution: 'No action needed. Keep RTSS updated as very old versions could be flagged.',
  },
  {
    processNames: ['fraps', 'fraps64'],
    label: 'FRAPS',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Legacy FPS counter/recording tool. Uses D3D hooks but is whitelisted by all major anti-cheats.',
    resolution: 'No action needed. FRAPS is safe to use.',
  },
  {
    processNames: ['losslessscaling'],
    label: 'Lossless Scaling',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'safe' },
    note: 'Frame generation / upscaling tool. Uses window capture (not injection). Generally safe but FACEIT may flag unfamiliar overlays.',
    resolution: 'Usually safe. Close before FACEIT matches if you encounter issues.',
  },

  /* ═══════════════════════════════════════════════════════════════
   * 4. SANDBOX / VIRTUALISATION / EMULATION
   * ═══════════════════════════════════════════════════════════════ */
  {
    processNames: ['sandboxie', 'sbiesvc', 'sbiectrl', 'sbiedrv'],
    label: 'Sandboxie',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'caution', esea: 'caution' },
    note: 'Vanguard blocks Sandboxie driver at kernel level. Other ACs flag if the game runs inside a sandbox.',
    resolution: 'Don\'t run games inside Sandboxie. Stop the Sandboxie service before Vanguard games.',
  },
  {
    processNames: ['vmware', 'vmplayer', 'vmware-vmx', 'vmnat', 'vmnetdhcp'],
    label: 'VMware (Virtual Machine)',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'caution', esea: 'caution' },
    note: 'Vanguard blocks play from VMs. Other ACs may detect VM environment and refuse to run.',
    resolution: 'Don\'t play anti-cheat protected games from inside a VM. Having VMware installed on your host is fine.',
  },
  {
    processNames: ['virtualbox', 'vboxsvc', 'vboxmanage', 'vboxheadless'],
    label: 'VirtualBox',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'caution', esea: 'caution' },
    note: 'Same as VMware — playing from inside the VM is blocked/flagged.',
    resolution: 'Don\'t play inside VirtualBox. The host machine is safe to have VirtualBox installed.',
  },
  {
    processNames: ['qemu', 'qemu-system-x86_64', 'qemu-system-i386'],
    label: 'QEMU',
    status: { eac: 'caution', vanguard: 'risky', battleye: 'caution', faceit: 'caution', esea: 'caution' },
    note: 'Open-source VM emulator. Same restrictions as VMware/VirtualBox — games inside VM are blocked.',
    resolution: 'Don\'t play anti-cheat protected games inside QEMU. Host installation is fine.',
  },
  {
    processNames: ['bluestacks', 'bluestacksappplayer', 'bstkagent', 'bstkservice'],
    label: 'BlueStacks (Android Emulator)',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Android emulator. Vanguard may flag its hypervisor components. Generally safe for PC gaming when not running.',
    resolution: 'Close BlueStacks before playing Valorant. Having it installed is fine for other games.',
  },
  {
    processNames: ['ldplayer', 'ldmultiplayer', 'dnplayer'],
    label: 'LDPlayer (Android Emulator)',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Android emulator similar to BlueStacks. Vanguard may flag its virtualization driver.',
    resolution: 'Close LDPlayer before playing Vanguard-protected games.',
  },
  {
    processNames: ['nox', 'noxplayer', 'noxvmhandle'],
    label: 'NoxPlayer (Android Emulator)',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Android emulator. Same profile as BlueStacks/LDPlayer — Vanguard may flag virtualization.',
    resolution: 'Close NoxPlayer before playing Vanguard-protected games.',
  },
  {
    processNames: ['memu', 'memuhyperv'],
    label: 'MEmu (Android Emulator)',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Android emulator with VT-based virtualization. Vanguard may block its driver.',
    resolution: 'Close MEmu before playing Vanguard-protected games.',
  },

  /* ═══════════════════════════════════════════════════════════════
   * 5. NETWORK INTERCEPTION / PACKET TOOLS
   * ═══════════════════════════════════════════════════════════════ */
  {
    processNames: ['wireshark', 'dumpcap', 'tshark'],
    label: 'Wireshark',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'risky', esea: 'caution' },
    note: 'FACEIT bans packet capture tools during matches. Other ACs generally allow it.',
    resolution: 'Close Wireshark and stop any captures before FACEIT/ESEA matches.',
  },
  {
    processNames: ['fiddler', 'fiddlereverywhere'],
    label: 'Fiddler',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'risky', esea: 'caution' },
    note: 'HTTP proxy / traffic interception. FACEIT flags network monitoring tools.',
    resolution: 'Close Fiddler and disable its proxy before playing.',
  },
  {
    processNames: ['charles', 'charlesproxy'],
    label: 'Charles Proxy',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'risky', esea: 'caution' },
    note: 'HTTP/HTTPS debugging proxy. Same category as Fiddler for anti-cheat detection.',
    resolution: 'Close Charles Proxy and remove proxy settings before playing.',
  },
  {
    processNames: ['mitmproxy', 'mitmweb', 'mitmdump'],
    label: 'mitmproxy (Man-in-the-Middle)',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'safe', faceit: 'risky', esea: 'risky' },
    note: 'Network interception tool. Explicitly designed for MITM attacks — heavily flagged.',
    resolution: 'Stop mitmproxy and remove any proxy configuration before playing.',
  },
  {
    processNames: ['netlimiter', 'nlsvc', 'nlclientapp'],
    label: 'NetLimiter',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Bandwidth limiter/shaper. Can be used as a lag switch to manipulate network conditions in-game. FACEIT/ESEA flag it.',
    resolution: 'Close NetLimiter before competitive matches. Do not throttle game traffic.',
  },
  {
    processNames: ['clumsy'],
    label: 'Clumsy (Network Simulator)',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Simulates latency, packet loss, and jitter. Classified as a lag switch tool by competitive ACs.',
    resolution: 'Close Clumsy before playing. Using it in competitive games will result in bans.',
  },
  {
    processNames: ['nmap', 'zenmap'],
    label: 'Nmap / Zenmap',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'risky', esea: 'caution' },
    note: 'Network scanner. FACEIT flags network reconnaissance tools during matches.',
    resolution: 'Close Nmap/Zenmap before FACEIT matches.',
  },
  {
    processNames: ['burpsuite', 'burp', 'burpsuitecommunity', 'burpsuitepro'],
    label: 'Burp Suite',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'risky', esea: 'caution' },
    note: 'Web security proxy. Intercepts HTTP/HTTPS traffic. FACEIT flags proxy tools.',
    resolution: 'Close Burp Suite and disable its proxy before playing.',
  },
  {
    processNames: ['netlimiter4', 'networx'],
    label: 'NetWorx (Bandwidth Monitor)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'safe' },
    note: 'Passive bandwidth monitoring. Generally safe, but FACEIT may flag network monitoring tools.',
    resolution: 'Usually safe. Close before FACEIT if issues occur.',
  },

  /* ═══════════════════════════════════════════════════════════════
   * 6. CHEAT / EXPLOIT / TRAINER SOFTWARE
   * ═══════════════════════════════════════════════════════════════ */
  {
    processNames: ['wemod', 'wemodapp'],
    label: 'WeMod (Game Trainer)',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Game trainer/cheat tool. Uses memory injection. Detected by all major anti-cheats.',
    resolution: 'Fully close WeMod before playing online games. Only use on single-player offline games.',
  },
  {
    processNames: ['artmoney', 'artmoneypro', 'artmoneyse'],
    label: 'ArtMoney',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Memory editor / game cheating tool. Same detection signature as Cheat Engine.',
    resolution: 'Uninstall before playing online. Functions identically to Cheat Engine for detection purposes.',
  },
  {
    processNames: ['l4dmultihack', 'cheathappens', 'fling', 'flingtrainer'],
    label: 'Cheat Happens / Fling Trainers',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Game trainers that modify memory. Universally detected by anti-cheats.',
    resolution: 'Close all trainer applications and reboot before playing multiplayer games.',
  },
  {
    processNames: ['cosmosmanager', 'cosmos'],
    label: 'Cosmos (Cheat Engine Plugin)',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Frontend for Cheat Engine. Detected via CE\'s underlying driver/process.',
    resolution: 'Uninstall Cosmos and Cheat Engine. Remove the dbk64 kernel driver.',
  },
  {
    processNames: ['plitch', 'plitchapp'],
    label: 'PLITCH (Game Trainer Platform)',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Cloud-based game trainer. Injects cheats into game memory. Detected by all ACs despite its \'legit\' branding.',
    resolution: 'Close PLITCH completely before playing online. Only use on single-player offline games.',
  },
  {
    processNames: ['fearlessrevolution', 'tableclipper'],
    label: 'Fearless Revolution (Cheat Tables)',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Community cheat table platform using Cheat Engine. Requires CE to run — universally detected.',
    resolution: 'Close and uninstall. Same as Cheat Engine — remove the kernel driver and reboot.',
  },
  {
    processNames: ['mrantifun'],
    label: 'MrAntiFun Trainers',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Free game trainers that modify memory. Same detection profile as Fling/Cheat Happens trainers.',
    resolution: 'Close all trainer executables and reboot before playing multiplayer games.',
  },
  {
    processNames: ['gamegenie', 'scanmem', 'tsearch'],
    label: 'Memory Scanner Tools (TSearch, ScanMem)',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Generic memory scanners. Detected the same way as Cheat Engine — hooks ReadProcessMemory.',
    resolution: 'Close and uninstall all memory scanning tools before playing online.',
  },

  /* ═══════════════════════════════════════════════════════════════
   * 7. KERNEL-DRIVER UTILITIES (Vanguard-specific blocks)
   * ═══════════════════════════════════════════════════════════════ */
  {
    processNames: ['cpuz', 'cpuz_x64', 'cpuz_x32'],
    label: 'CPU-Z (vulnerable driver versions)',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Older cpuz driver versions (cpuz1xx.sys) have known vulnerabilities exploitable by cheats. Vanguard blocks vulnerable driver versions.',
    resolution: 'Update CPU-Z to the latest version. Close CPU-Z before launching Valorant if you get driver errors.',
  },
  {
    processNames: ['gpuz', 'gpu-z'],
    label: 'GPU-Z (vulnerable driver)',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Uses a kernel driver that Vanguard may block if it contains known vulnerabilities.',
    resolution: 'Update GPU-Z to latest version. Close before playing Valorant if issues occur.',
  },
  {
    processNames: ['rweverything', 'rw', 'rweverything64'],
    label: 'RWEverything',
    status: { eac: 'safe', vanguard: 'risky', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Low-level hardware access tool. Its kernel driver (RwDrv.sys) is on Vanguard\'s vulnerable driver blocklist.',
    resolution: 'Uninstall RWEverything or stop its driver: "sc stop RwDrv" as admin, then reboot.',
  },
  {
    processNames: ['speedfan'],
    label: 'SpeedFan',
    status: { eac: 'safe', vanguard: 'risky', battleye: 'caution', faceit: 'safe', esea: 'safe' },
    note: 'Uses vulnerable kernel driver. BattlEye FAQ confirms it blocks "kernel drivers with known security issues." Vanguard blocks on boot.',
    resolution: 'Use HWiNFO64 or Libre Hardware Monitor instead. Uninstall SpeedFan and reboot.',
  },
  {
    processNames: ['throttlestop'],
    label: 'ThrottleStop',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'CPU undervolting/throttling control using WinRing0 kernel driver. Vanguard may block vulnerable driver versions.',
    resolution: 'Update ThrottleStop to the latest version. Close before Valorant if you get driver block errors.',
  },
  {
    processNames: ['aida64', 'aida64extreme', 'aida64engineer'],
    label: 'AIDA64',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'System diagnostics tool with kernel driver for hardware access. Vanguard may flag its driver on older versions.',
    resolution: 'Update AIDA64 to latest version. Close before Valorant if Vanguard reports a driver block.',
  },
  {
    processNames: ['coretemp', 'core temp'],
    label: 'Core Temp',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'CPU temperature monitor using kernel driver. Older versions use a driver that Vanguard may block.',
    resolution: 'Update to latest version. Use HWiNFO64 as alternative if issues persist.',
  },
  {
    processNames: ['openrgb'],
    label: 'OpenRGB',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'RGB lighting control. Uses SMBus/I2C kernel access that Vanguard has historically flagged.',
    resolution: 'Close OpenRGB before playing Valorant if you get driver errors. Other games are unaffected.',
  },
  {
    processNames: ['fancontrol'],
    label: 'FanControl',
    status: { eac: 'safe', vanguard: 'caution', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Fan speed controller using LibreHardwareMonitor driver. Vanguard may flag the kernel driver.',
    resolution: 'Update FanControl. Close before Valorant if Vanguard blocks it.',
  },

  /* ═══════════════════════════════════════════════════════════════
   * 8. HWID SPOOFERS / BAN-EVASION TOOLS
   * ═══════════════════════════════════════════════════════════════ */
  {
    processNames: ['hwid', 'hwidspoofer', 'spoofersvc', 'serialchanger'],
    label: 'HWID Spoofer (any variant)',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Ban-evasion tool. Anti-cheats actively scan for HWID manipulation. Using one triggers hardware bans.',
    resolution: 'Completely remove the spoofer and all its drivers. A clean Windows reinstall may be needed if kernel drivers persist.',
  },
  {
    processNames: ['macaddresschanger', 'tmac', 'technitium'],
    label: 'Technitium MAC Changer',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'MAC address spoofing. FACEIT/ESEA treat network identity changes as ban evasion.',
    resolution: 'Do not change MAC address while playing on FACEIT/ESEA. Reset to original MAC.',
  },
  {
    processNames: ['volumeid'],
    label: 'VolumeID (Disk Serial Changer)',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Sysinternals tool that changes disk volume serial numbers. Used as ban-evasion tool — all ACs detect serial changes.',
    resolution: 'Do not use. Changing disk serials is treated as ban evasion and will result in hardware bans.',
  },
  {
    processNames: ['devicecleaner', 'driverstore', 'ghostbuster'],
    label: 'Device / Driver Cleaners (for spoofing)',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Tools that remove hidden device entries to spoof hardware configs. FACEIT/ESEA treat as evasion.',
    resolution: 'Only use for legitimate driver cleanup. Do not use to manipulate hardware identifiers.',
  },

  /* ═══════════════════════════════════════════════════════════════
   * 9. SCREEN CAPTURE / PIXEL READING BOTS
   * ═══════════════════════════════════════════════════════════════ */
  {
    processNames: ['pixelbot', 'colorbot', 'pixelaim'],
    label: 'Pixel / Color Bot',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Screen-reading automation that generates simulated input (aimbots). All ACs detect via input pattern analysis.',
    resolution: 'Delete and remove all pixel bot software. These are classified as cheats.',
  },

  /* ═══════════════════════════════════════════════════════════════
   * 10. MISCELLANEOUS — COMMONLY ASKED ABOUT
   * ═══════════════════════════════════════════════════════════════ */
  {
    processNames: ['obs64', 'obs32', 'obs'],
    label: 'OBS Studio',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Streaming/recording software. Safe with all anti-cheats — does not inject into game process.',
    resolution: 'No action needed. OBS is safe to use while gaming.',
  },
  {
    processNames: ['discord', 'discordptb', 'discordcanary'],
    label: 'Discord',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Voice chat with game overlay. Safe — its overlay is whitelisted by all major anti-cheats.',
    resolution: 'No action needed. Discord is safe to use.',
  },
  {
    processNames: ['msiafterburner', 'msiafterburner64'],
    label: 'MSI Afterburner',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'GPU overclocking + monitoring. Generally safe. Old RTSS versions could be flagged — keep RTSS updated.',
    resolution: 'Keep MSI Afterburner and RTSS updated to latest versions. Safe to use.',
  },
  {
    processNames: ['hwinfo64', 'hwinfo32', 'hwinfo'],
    label: 'HWiNFO',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Hardware monitoring. Safe with all anti-cheats — recommended alternative to SpeedFan.',
    resolution: 'No action needed. HWiNFO is safe to use.',
  },
  {
    processNames: ['nvcontainer', 'nvdisplay.container', 'nvidia share', 'nvidia geforce experience', 'nvspcaps64', 'shadowplay'],
    label: 'NVIDIA GeForce Experience / ShadowPlay',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'NVIDIA overlay, ShadowPlay recording, game optimization. Whitelisted by all anti-cheats.',
    resolution: 'No action needed. Safe to use for recording and overlay.',
  },
  {
    processNames: ['amdrsserv', 'amddvr', 'radeon software', 'cncmd', 'amdow'],
    label: 'AMD Adrenalin / Radeon Software',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'AMD GPU driver suite with overlay and recording. Safe with all anti-cheats.',
    resolution: 'No action needed. Safe to use.',
  },
  {
    processNames: ['steam', 'steamwebhelper', 'steamservice', 'gameoverlayui'],
    label: 'Steam (with Overlay)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Steam client and its in-game overlay. Universally whitelisted by all anti-cheats.',
    resolution: 'No action needed. Steam is safe to use.',
  },
  {
    processNames: ['gamebar', 'gamebarpresencewriter', 'gamebarft'],
    label: 'Xbox Game Bar',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Built-in Windows game overlay. Whitelisted by all anti-cheats.',
    resolution: 'No action needed. Xbox Game Bar is safe.',
  },
  {
    processNames: ['overwolf', 'overwolfbrowser', 'overwolfservice'],
    label: 'Overwolf',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Game overlay platform (Curseforge, Outplayed, etc.). Whitelisted by all major anti-cheats.',
    resolution: 'No action needed. Overwolf and its apps are safe.',
  },
  {
    processNames: ['medal', 'medalapp'],
    label: 'Medal.tv',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Clip recording software. Uses window capture — does not inject into games.',
    resolution: 'No action needed. Medal.tv is safe to use.',
  },
  {
    processNames: ['outplayed'],
    label: 'Outplayed (by Overwolf)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Automatic game clip recorder. Runs via Overwolf — whitelisted by all ACs.',
    resolution: 'No action needed. Outplayed is safe to use.',
  },
  {
    processNames: ['streamlabs', 'streamlabsobs', 'streamlabs obs'],
    label: 'Streamlabs OBS',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Streaming software based on OBS. Same safe profile as OBS Studio.',
    resolution: 'No action needed. Streamlabs is safe to use.',
  },
  {
    processNames: ['razersynapse', 'razersynapse3', 'razercentral', 'rzsdkservice', 'rzsdkserver'],
    label: 'Razer Synapse (with Macros)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'Razer peripheral software. Basic DPI/lighting is safe. Synapse Macro module can record/replay input sequences — FACEIT/ESEA detect software-replayed macros via input pattern analysis and timing irregularities.',
    resolution: 'Delete all macros in Synapse before FACEIT/ESEA. Disable the Macro module entirely in Synapse > Modules. Hardware-stored profiles without macros are fine.',
  },
  {
    processNames: ['lghub', 'lghub_agent', 'lghub_system_tray', 'lghub_updater'],
    label: 'Logitech G Hub (with Scripting)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'Logitech peripheral software. Basic DPI/lighting is safe. G Hub supports Lua scripting (G-scripts) that can automate recoil patterns, rapid-fire, etc. On-board macros stored to mouse memory are harder to detect, but FACEIT/ESEA can flag suspicious input patterns regardless of source.',
    resolution: 'Delete all Lua scripts and macros from G Hub profiles before FACEIT/ESEA. Go to G Hub > Assignments and remove any scripted actions. On-board profiles with just DPI settings are safe.',
  },
  {
    processNames: ['icue', 'icue5', 'icuedevicemanager', 'corsair.service'],
    label: 'Corsair iCUE (with Macros)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'Corsair peripheral software. Basic RGB/DPI is safe. iCUE macro recorder can create input sequences — FACEIT/ESEA detect software-driven macros via timing analysis. Hardware-stored on-board macros are harder to detect but still risky if they produce inhuman input patterns.',
    resolution: 'Delete all recorded macros and key remaps with multi-action sequences in iCUE before FACEIT/ESEA matches. Basic RGB and DPI profiles are fine.',
  },
  {
    processNames: ['steelseries gg', 'steelseries', 'steelseriesengine', 'steelseriessonar'],
    label: 'SteelSeries GG / Engine (with Macros)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'SteelSeries peripheral software + Sonar audio. Basic use is safe. Macro features in SteelSeries Engine can record/replay inputs — FACEIT/ESEA flag automated input patterns.',
    resolution: 'Remove all macros from SteelSeries Engine profiles before FACEIT/ESEA. Sonar audio features are always safe.',
  },
  {
    processNames: ['razercortex', 'cortex'],
    label: 'Razer Cortex (Game Booster)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Game booster that frees RAM and kills background processes. Does not modify game files or memory.',
    resolution: 'No action needed. Razer Cortex is safe.',
  },
  {
    processNames: ['spotify'],
    label: 'Spotify',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Music player. Safe with all anti-cheats.',
    resolution: 'No action needed. Spotify is safe to use while gaming.',
  },
  {
    processNames: ['voicemeeter', 'voicemeeterbanana', 'voicemeeterpotato', 'audiorepeater'],
    label: 'VoiceMeeter',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Virtual audio mixer. Uses a virtual audio driver — safe with all anti-cheats.',
    resolution: 'No action needed. VoiceMeeter is safe to use.',
  },
  {
    processNames: ['equalizerapo'],
    label: 'Equalizer APO / Peace',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'System-wide audio equalizer. Uses APO interface — safe with all anti-cheats.',
    resolution: 'No action needed. Equalizer APO is safe.',
  },
  {
    processNames: ['fpsmonitor'],
    label: 'FPS Monitor',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Hardware monitoring overlay. Uses safe overlay methods — whitelisted by ACs.',
    resolution: 'No action needed. FPS Monitor is safe.',
  },
  {
    processNames: ['capframex'],
    label: 'CapFrameX',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Frametime analysis tool. Captures data via Intel PresentMon — does not inject into games.',
    resolution: 'No action needed. CapFrameX is safe to use.',
  },
  {
    processNames: ['nvidiaprofileinspector', 'nvidiaprofileinspectordrs'],
    label: 'NVIDIA Profile Inspector',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'NVIDIA driver profile editor. Modifies driver settings, not game memory. Safe with all ACs.',
    resolution: 'No action needed. NVIDIA Profile Inspector is safe.',
  },

  /* ═══════════════════════════════════════════════════════════════
   * 11. PERIPHERAL SOFTWARE WITH MACRO / SCRIPTING RISKS
   *     These are peripheral brands whose software or firmware
   *     has known scripting/macro capabilities that anti-cheats
   *     actively detect via input pattern analysis.
   * ═══════════════════════════════════════════════════════════════ */
  {
    processNames: ['bloody', 'bloody7', 'bloodymouse', 'oscar', 'oscarcommander', 'oscareditor', 'a4tech'],
    label: 'Bloody / A4Tech Mouse Software',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Bloody mice have built-in firmware-level recoil scripts and rapid-fire macros. FACEIT, ESEA, and Valve (VAC) have all confirmed bans for Bloody mouse software. The mouse firmware itself can trigger detection even without the software running.',
    resolution: 'Do NOT use Bloody/A4Tech mice for competitive gaming. If you must, factory-reset the mouse firmware to remove all scripts, uninstall Oscar/Bloody software, and switch to "Core 1" mode (no macros). Consider using a different mouse brand.',
  },
  {
    processNames: ['hyperxngenuity', 'ngenuity', 'hyperx'],
    label: 'HyperX NGenuity (with Macros)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'HyperX peripheral software. Basic DPI/RGB is safe. Macro recording feature can create input sequences that FACEIT/ESEA detect via input timing analysis.',
    resolution: 'Delete all macros in NGenuity before FACEIT/ESEA matches. Basic DPI and lighting profiles are safe.',
  },
  {
    processNames: ['roccatswarm', 'roccat', 'roccat swarm'],
    label: 'Roccat Swarm (with Macros)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'Roccat peripheral software. Basic settings are safe. Easy-Shift and macro features can replay input sequences — flagged by competitive ACs.',
    resolution: 'Disable Easy-Shift macros and delete all recorded macros before FACEIT/ESEA matches.',
  },
  {
    processNames: ['wooting', 'wootility'],
    label: 'Wooting / Wootility (Rapid Trigger)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'safe', esea: 'safe' },
    note: 'Analog keyboard with Rapid Trigger. The hardware feature is legitimate and accepted by all ACs including FACEIT. SOCD (Simultaneous Opposing Cardinal Directions) cleaning is built-in and legal in most games.',
    resolution: 'No action needed. Wooting Rapid Trigger is safe. Some games (Valorant, CS2) have their own SOCD handling — check game-specific rules.',
  },
  {
    processNames: ['gamesir', 'gamesirapp'],
    label: 'GameSir Software (Controller)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'GameSir controller software with turbo/macro features. Basic controller mapping is safe. Turbo and macro modes are flagged by competitive ACs.',
    resolution: 'Disable turbo and macro modes before competitive matches. Standard controller mapping is fine.',
  },
  {
    processNames: ['tartarus', 'orbweaver'],
    label: 'Razer Tartarus / Orbweaver (Keypad)',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'Razer gaming keypads configured via Synapse. Basic key remapping is safe. Multi-action macros and turbo modes are flagged by competitive ACs same as any other macro software.',
    resolution: 'Remove all macros and turbo functions from keypad profiles before FACEIT/ESEA. Basic key remaps are fine.',
  },
  {
    processNames: ['xim', 'ximapex', 'xim4', 'ximlink', 'ximmanager'],
    label: 'XIM Apex / XIM 4 (Console Adapter)',
    status: { eac: 'caution', vanguard: 'caution', battleye: 'caution', faceit: 'risky', esea: 'risky' },
    note: 'Mouse & keyboard adapter that emulates controller input. Creates an unfair advantage in controller-only games. Some games (Fortnite, Overwatch) actively detect and block XIM devices.',
    resolution: 'Do not use XIM adapters in competitive games. Many game developers consider it cheating and detection is improving.',
  },
  {
    processNames: ['cronusmax', 'cronuszen', 'cronustoolbox', 'zentoolbox'],
    label: 'Cronus Zen / CronusMAX',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Controller mod device with scripts for rapid-fire, anti-recoil, and aim assist abuse. Universally considered cheating. Many games actively detect Cronus USB device ID.',
    resolution: 'Do not use Cronus devices in any online game. Remove the device and uninstall CronusToolbox/ZenToolbox.',
  },
  {
    processNames: ['strike-pack', 'strikepackfps', 'modpack', 'collectiveminds'],
    label: 'Strike Pack / Mod Pack (Controller Mod)',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Controller attachment with anti-recoil, rapid-fire, and drop-shot mods. Implemented in firmware — detected via input pattern analysis by ACs.',
    resolution: 'Remove the Strike Pack from your controller. Do not use any mod packs in competitive online games.',
  },
  {
    processNames: ['titan2', 'gtunerpro'],
    label: 'Titan Two / gTuner Pro',
    status: { eac: 'risky', vanguard: 'risky', battleye: 'risky', faceit: 'risky', esea: 'risky' },
    note: 'Advanced controller scripting device similar to Cronus. Supports GPC scripts for recoil compensation aimbot-like patterns. Universally banned.',
    resolution: 'Do not use Titan Two in online games. Remove the device and uninstall gTuner Pro.',
  },
  {
    processNames: ['driverhub', 'mousedriver', 'genericmousesoftware'],
    label: 'Generic/Unbranded Mouse Software',
    status: { eac: 'safe', vanguard: 'safe', battleye: 'safe', faceit: 'caution', esea: 'caution' },
    note: 'Off-brand mouse software from Amazon/AliExpress mice often includes hidden macro and DPI scripting features. FACEIT/ESEA may flag these unsigned drivers.',
    resolution: 'Use generic Windows HID drivers instead. Remove manufacturer software for unbranded mice before competitive play.',
  },
];

/* ── Helpers ───────────────────────────────────────────────────── */

export const statusColor: Record<CompatStatus, string> = {
  safe: '#00CC6A',
  caution: '#FFD600',
  risky: '#ef4444',
};

export const statusLabel: Record<CompatStatus, string> = {
  safe: 'Safe',
  caution: 'Caution',
  risky: 'Risky',
};
