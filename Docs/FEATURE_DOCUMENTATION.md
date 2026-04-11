# Feature Documentation — GS Center v2.1.4

Complete reference for all features in GS Center.

---

## 1. Dashboard & Live Metrics

**Page**: `LiveMetrics.tsx` | **Nav**: Home

Real-time system monitoring dashboard powered by GCMonitor.exe (C# sidecar using LibreHardwareMonitor).

**Metrics displayed**:
- CPU: usage %, per-core load, clock speed (MHz), power draw (W), voltage, temperature
- GPU: usage %, VRAM used/total, core clock, memory clock, fan speed/RPM, power, temperature, hotspot temp, memory temp
- RAM: used/total GB, available, cached, standby, modified, non-paged pool, page file, top processes by RAM
- Disk: read/write speed (MB/s), temperature, health/lifespan %, all drives with capacity
- Network: upload/download speed, latency (ms), packet loss %, SSID, signal strength, adapter info
- System: process count, uptime, Windows version/build, power plan

**Components**:
- `DashboardHero.tsx` — Metric card grid with Recharts area charts, trend arrows, 600-point ring buffer history
- `HealthScore.tsx` — 0–100 composite score from 7 weighted factors (CPU temp 20%, CPU usage 15%, RAM 15%, disk free 15%, GPU temp 15%, latency 10%, disk health 10%)
- `AdvisorPanel.tsx` — AI-driven insights: critical/warning/good status per factor, hardware upgrade recommendations with priority scoring, constraint-aware (laptop, thermal throttling)

**Backend**: `hardwareMonitor.js`, `hardwareInfo.js`, `healthScore.js`, `advisor.js`

---

## 2. Performance Tweaks

**Page**: `Performance.tsx` | **Nav**: Tweaks

17 registry-level gaming performance tweaks organized in 7 categories.

| # | Tweak | Category | Registry Path |
|---|-------|----------|---------------|
| 1 | IRQ Priority | CPU | `HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl` |
| 2 | Win32 Priority Separation | CPU | `HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl` |
| 3 | Hardware GPU Scheduling | GPU | `HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers` |
| 4 | TDR Level (GPU Timeout) | GPU | `HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers` |
| 5 | Disable Memory Compression | Memory | PowerShell command |
| 6 | Large System Cache | Memory | `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management` |
| 7 | Network Interrupt Priority | Network | `HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl` |
| 8 | Disable Network Throttling | Network | `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile` |
| 9 | Disable Fullscreen Optimization | Display | `HKCU\System\GameConfigStore` |
| 10 | DWM Overlay Test Mode | Display | `HKLM\SOFTWARE\Microsoft\Windows\Dwm` |
| 11 | FSE Behavior Mode | Display | `HKCU\System\GameConfigStore` |
| 12 | Disable Game DVR | Game DVR | `HKCU\System\GameConfigStore` |
| 13 | Disable App Capture | Game DVR | `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR` |
| 14 | GDRV Policy | Game DVR | `HKLM\SOFTWARE\Microsoft\PolicyManager\default\ApplicationManagement` |
| 15 | Disable USB Selective Suspend | Hardware | Power scheme via PowerShell |
| 16 | Game Priority | Hardware | `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games` |
| 17 | Games Priority (GPU) | Hardware | Same path, GPU Priority value |

**Features**: Individual apply/reset, batch apply, status check (applied/default), system restore point creation (Pro).

**Backend**: `tweaks.js` — Consolidated PowerShell check script for O(1) status checking.

---

## 3. Cleanup Toolkit

**Page**: `Cleaner.tsx` | **Nav**: Utilities

30+ cleaners in 6 categories plus essential tweaks and system repair.

**Windows cleaners**: Temp files, Windows Update cache, DNS cache, RAM cache, Recycle Bin, thumbnails, logs, crash dumps, error reports, delivery optimization, recent files, prefetch.

**Game shader caches**: Apex Legends, Forza Horizon, Call of Duty, CS2, Fortnite, League of Legends, Overwatch, Rainbow Six Siege, Rocket League, Valorant.

**NVIDIA**: DXCache, GLCache driver caches.

**Essential Tweaks** (via `ctEssentialTweaks.js`): 30+ Windows preference tweaks including disable Store search, enable End Task on taskbar, disable location tracking, remove widgets, services optimization, Start Menu revert.

**System Repair** (`SystemRepairPanel.tsx`): SFC, DISM, ChkDsk with real-time progress bars and floating repair overlay.

**Backend**: `cleaners.js` — Returns `{ success, message, spaceSaved, filesDeleted, filesBefore, filesAfter }` per cleaner. `ctTweaks.js` for essential tweaks.

---

## 4. Game Library

**Page**: `GameLibrary.tsx` | **Nav**: Games

Game profile editor and hardware comparison for 8 competitive games.

**Supported games**: Apex Legends, Valorant, CS2, Fortnite, League of Legends, Rocket League, Overwatch, Call of Duty.

**Features**:
- Pro-player config editor: resolution, graphics quality, FOV, launch options
- Per-game config file read/write (paths: Saved Games/Apex, AppData/VALORANT, AppData/cs2)
- File lock/unlock for read-only protection
- Hardware vs game requirements comparison with FPS prediction
- Resolution builder: 16:9, 16:10, 4:3 aspect ratios + custom resolution

**Backend**: `gameProfiles.js` | **Data**: `gameRequirements.ts`, `hardwareCompare.ts`

---

## 5. OBS Presets

**Page**: `OBSPresets.tsx` | **Nav**: Stream

One-click OBS configuration deployment for streamers.

**Gaming preset includes**:
- Pre-built scenes: Gaming, Starting Soon, BRB, Ending
- Game capture source optimized for performance
- Twitch-optimized video/audio output settings
- Performance-friendly encoder configuration

**Flow**: Detect OBS → Get config path → Deploy preset files → Auto-launch OBS.

**Backend**: `obsPresets.js` | **Service**: `obsPresetsService.ts` | **Configs**: `src/data/obsPresetConfigs/`

---

## 6. Resolution Manager

**Page**: `ResolutionManager.tsx` | **Nav**: Display

Display resolution and refresh rate management via native C# helper.

**Features**:
- List active displays with adapter name, current resolution, refresh rate
- Enumerate all supported modes per display (W × H × Hz)
- Apply any supported resolution + refresh rate
- Real-time display status

**Backend**: `resolutionManager.js` → `ResolutionHelper.exe` (Win32 ChangeDisplaySettingsEx)

---

## 7. Network Diagnostics

**Page**: `Network.tsx` | **Nav**: Network

Network latency testing and speed tests for gamers.

**Ping tests**: 10 regional gaming servers — NA East, NA West, EU West, EU Central, Asia, Southeast Asia, South America, Middle East, Oceania, Africa.

**Speed tests**: Fast.com, Ookla Speedtest, testmy.net — loaded in isolated webview to prevent interference.

**Display**: Color-coded latency (green < 50ms, yellow < 100ms, red > 100ms).

**Backend**: `network.js` — Caches results for 900ms per host.

---

## 8. App Management

**Page**: `AppsPage.tsx` | **Nav**: Apps (tabbed interface)

### App Installer (`AppInstaller.tsx`)
40+ curated applications via winget. Categories: Browsers, Communications, Gaming, Gaming Tools, Streaming & Audio, Development, Utilities, Media. One-click install with progress tracking, bulk install, icon fetching.

### App Uninstaller (`AppUninstaller.tsx`)
Detects installed apps from registry, WMI, AppX packages. Leftover cleanup: files, folders, registry keys, services, scheduled tasks. 3 scan modes: Safe, Moderate, Advanced. Pre/post snapshots for orphan detection.

### Windows Debloat (`WindowsDebloat.tsx`) — Pro
100+ pre-installed Windows apps removal. Sources: AppX packages, Capabilities, Features. Batch removal, reinstall support, protected system exclusions.

### Startup Manager (`Startup.tsx`)
Startup items from 4 sources: HKCU/HKLM Run keys, User/Common Startup folders. Enable/disable toggles, protected entries, running process status, search/filter.

### Space Analyzer (`SpaceAnalyzer.tsx`) — Pro
Recursive directory scanning with drive selector, context menu, LRU caching, protected paths.

---

## 9. Software Updates (Pro)

**Page**: `SoftwareUpdates.tsx` | **Nav**: Updates

Detect and update installed software via `winget upgrade`.

**Features**: Batch update all, per-package progress (preparing → downloading → verifying → installing → done/error), cancellation support, update history.

**Backend**: `softwareUpdates.js`

---

## 10. Service Optimizer (Pro)

**Page**: `ServiceOptimizer.tsx` | **Nav**: (accessible via code, not in bottom nav)

60+ Windows services across 10 categories: Xbox, Telemetry, Remote Access, Media, Hyper-V, Networking, Security, System, Hardware, Misc.

**Modes**: Safe (low-risk only), Balanced (low + medium), Aggressive (all).

**Features**: Risk level indicators, backup/restore per service, reset to Windows defaults, search, custom selection.

**Backend**: `serviceTweaks.js`

---

## 11. Overlay HUD

**Window**: `overlay.html` | **Toggle**: `Ctrl+Shift+F`

Frameless, always-on-top, click-through gaming overlay.

**Metrics**: FPS, CPU %, GPU %, CPU temp, GPU temp, RAM %, latency, packet loss, network speed.

**Customization**: Position (4 corners), opacity, accent color (8 presets), font, per-metric sensor toggles.

**Backend**: `overlay.js` — Creates persistent BrowserWindow with transparent, click-through properties.

---

## 12. Settings

**Page**: `Settings.tsx` | **Access**: Header gear icon

- **Startup**: Auto-cleanup on launch
- **Appearance**: Light rays color (11 presets), app background gradient (12 presets), font family, font size
- **Overlay**: FPS HUD position, opacity, color, font, sensor toggles
- **System**: GPU acceleration, minimize-to-tray, check for updates
- **About**: Version, changelog

**Persistence**: localStorage via `settings.ts`

---

## 13. Auth & Subscription

**Login** (`LoginPage.tsx`): Discord/Twitch OAuth implicit flow via BrowserWindow partition.

**Profile**: Stored in Supabase. Roles: Free, Pro, Admin, Owner/Lifetime.

**Pro access**: Time-limited or lifetime grants. PayPal checkout integration.

**Admin Panel** (`AdminPanel.tsx`): User search, role assignment, Pro grants/revocation.

**Manage Subscription** (`ManageSubscription.tsx`): Status display, countdown timer, cancel/upgrade options.
