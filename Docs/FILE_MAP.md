# File Map — GS Center v2.1.4

## Project Statistics

- **Total files**: ~150+
- **React pages**: 19
- **React components**: 21
- **CSS stylesheets**: 37
- **Main process modules**: 26
- **Data files**: 8
- **Contexts**: 2
- **Custom hooks**: 1

---

## Electron Layer

| File | Purpose |
|------|---------|
| `electron/main.js` | Main process entry: window creation, tray, IPC registration, auto-updater |
| `electron/admin-check.js` | Detects admin privileges, prompts UAC elevation |
| `electron/dev-launcher.js` | Dev mode: spawns React dev server + Electron concurrently |
| `electron/launcher.js` | Production spawn entry point |

## Main Process — IPC Handler Modules

| File | Purpose |
|------|---------|
| `main-process/tweaks.js` | 17 registry performance tweaks (apply/reset/check) + restore point |
| `main-process/cleaners.js` | 30+ cache/file cleaners (Windows, games, NVIDIA) |
| `main-process/hardwareMonitor.js` | GCMonitor.exe sidecar lifecycle + real-time metric streaming |
| `main-process/hardwareInfo.js` | Static hardware identity (CPU, GPU, RAM, disk, network, mobo, BIOS) |
| `main-process/healthScore.js` | 0–100 health score from 7 weighted factors |
| `main-process/advisor.js` | AI-driven system insights + hardware upgrade recommendations |
| `main-process/overlay.js` | FPS HUD overlay window (always-on-top, click-through) |
| `main-process/gameProfiles.js` | Game config read/write (Apex, Valorant, CS2) + display resolutions |
| `main-process/appInstaller.js` | Winget app installation with progress tracking |
| `main-process/appUninstaller.js` | App removal + orphaned leftover scanning/cleanup |
| `main-process/windowsDebloat.js` | AppX bloatware removal (100+ apps) |
| `main-process/startup.js` | Startup item listing + enable/disable |
| `main-process/serviceTweaks.js` | 60+ Windows service optimization with backup/restore |
| `main-process/softwareUpdates.js` | Winget software update detection + batch update |
| `main-process/network.js` | Ping tests to regional gaming servers |
| `main-process/obsPresets.js` | OBS config deployment + launch |
| `main-process/spaceAnalyzer.js` | Recursive disk usage analysis |
| `main-process/resolutionManager.js` | Display resolution enumeration + apply via C# helper |
| `main-process/auth.js` | OAuth flow (Discord/Twitch) via BrowserWindow |
| `main-process/authSession.js` | Session/token management |
| `main-process/paypal.js` | PayPal checkout flow with local HTTP callback |
| `main-process/autoUpdater.js` | App auto-update via electron-updater |
| `main-process/ctTweaks.js` | Essential Windows tweaks batch runner |
| `main-process/ctEssentialTweaks.js` | 30+ essential tweak definitions (registry, services, scripts) |
| `main-process/repairOverlay.js` | Floating always-on-top repair progress window |
| `main-process/windowManager.js` | Window lifecycle (create, minimize, maximize, close) |
| `main-process/utils.js` | Shared helpers (execAsync, runPSScript, isPermissionError) |

## Native Code

| File | Purpose |
|------|---------|
| `native-monitor/Program.cs` | GCMonitor sidecar entry point |
| `native-monitor/HardwareInfoCollector.cs` | LibreHardwareMonitor data collection |
| `native-monitor/GCMonitor.csproj` | .NET 8 project file |
| `lib/ResolutionHelper.cs` | Win32 display resolution change helper |

## React Pages (src/pages/)

| File | Nav Label | Purpose |
|------|-----------|---------|
| `LiveMetrics.tsx` | Home | Real-time dashboard with 600-point metric history |
| `Performance.tsx` | Tweaks | 17 gaming tweaks in 7 categories |
| `GameLibrary.tsx` | Games | Game profiles, config editor, hardware comparison |
| `OBSPresets.tsx` | Stream | OBS preset deployment + launch |
| `ResolutionManager.tsx` | Display | Monitor resolution & refresh rate management |
| `Network.tsx` | Network | Regional ping tests + speed test webviews |
| `AppsPage.tsx` | Apps | Tab container for Installer/Uninstaller/Debloat/Startup/Space |
| `AppInstaller.tsx` | (tab) | 40+ curated app installation via winget |
| `AppUninstaller.tsx` | (tab) | App removal with leftover cleanup |
| `WindowsDebloat.tsx` | (tab) | 100+ bloatware removal (Pro) |
| `Startup.tsx` | (tab) | Startup item management |
| `SpaceAnalyzer.tsx` | (tab) | Disk usage analyzer (Pro) |
| `SoftwareUpdates.tsx` | Updates | Winget software update management (Pro) |
| `Cleaner.tsx` | Utilities | 30+ cache cleaners + essential tweaks + repair |
| `ServiceOptimizer.tsx` | (hidden) | 60+ Windows service optimization (Pro) |
| `Settings.tsx` | (header) | App settings (appearance, overlay, startup, about) |
| `AdminPanel.tsx` | (header) | User management (Owner/Admin only) |
| `ManageSubscription.tsx` | (header) | Pro subscription management |
| `LoginPage.tsx` | — | Discord/Twitch OAuth login screen |

## React Components (src/components/)

| File | Purpose |
|------|---------|
| `Header.tsx` | Top bar: profile dropdown, What's New, version check |
| `Sidebar.tsx` | Bottom navigation bar with 9 items + active indicator |
| `ToastContainer.tsx` | Toast notification display with auto-dismiss |
| `DashboardHero.tsx` | Dashboard metric cards with Recharts and trend arrows |
| `HealthScore.tsx` | Compact/expanded health score with 7 factors |
| `AdvisorPanel.tsx` | Collapsible system insights panel |
| `PageHeader.tsx` | Consistent page title + stat buttons + badge center |
| `PerformanceTweakCard.tsx` | Individual tweak card with apply/reset + status |
| `CleanerCard.tsx` | Cleaner card with icon, description, clean button |
| `SystemRepairPanel.tsx` | SFC/DISM/ChkDsk repair tools with progress overlay |
| `TweakExecutionModal.tsx` | Essential tweaks batch progress modal |
| `CacheCleanupToast.tsx` | Full-page batch cache cleanup overlay |
| `AutoCleanupRunner.tsx` | Toast-based auto-cleanup on startup |
| `LightRays.tsx` | WebGL animated light rays (OGL renderer) |
| `Loader.tsx` | Skeleton loading state with animated bento grid |
| `PaywallModal.tsx` | Upgrade-to-PRO modal with checkout |
| `UpgradeModal.tsx` | Simplified upgrade prompt |
| `ProPreviewBanner.tsx` | PRO-only feature info banner |
| `ProLockedWrapper.tsx` | Wraps Pro content with disabled styling |
| `ProLineBadge.tsx` | Inline "Upgrade" button with shimmer |
| `ProfileDropdown.tsx` | User menu: role badge, logout, settings, subscription |

## Contexts (src/contexts/)

| File | Purpose |
|------|---------|
| `AuthContext.tsx` | User auth state, login/logout, Pro/Admin detection, Supabase integration |
| `ToastContext.tsx` | Toast notification queue (addToast, removeToast) |

## Hooks (src/hooks/)

| File | Purpose |
|------|---------|
| `useRealtimeHardware.ts` | Subscribes to `hardware:realtime` IPC events, typed payload |

## Data (src/data/)

| File | Purpose |
|------|---------|
| `performanceTweaks.ts` | 17 tweak definitions with registry paths, keys, values |
| `cleanerUtilities.ts` | 30 cleaner definitions with icons, descriptions, colors |
| `gameRequirements.ts` | Hardware specs for 8 games (min/recommended, CPU/GPU benchmarks) |
| `appCatalog.ts` | 40+ winget app catalog with categories and icons |
| `obsPresets.ts` | OBS preset definitions (features, difficulty, metadata) |
| `obsPresetConfigs/` | OBS config files for preset deployment |
| `changelog.ts` | Version changelog entries |
| `devUpdates.ts` | Developer update notes (markdown) |

## Utils (src/utils/)

| File | Purpose |
|------|---------|
| `settings.ts` | Load/save settings to localStorage |
| `hardwareCompare.ts` | Hardware benchmark comparison + FPS prediction |

## Services (src/services/)

| File | Purpose |
|------|---------|
| `obsPresetsService.ts` | OBS preset apply/launch via IPC |

## Styles (src/styles/)

37 CSS files — one per page/component plus global styles. Uses Tailwind CSS utility classes with custom CSS for animations and component-specific styling.

## Public (Electron HTML shells)

| File | Purpose |
|------|---------|
| `public/index.html` | Main app HTML shell |
| `public/overlay.html` | FPS HUD overlay window |
| `public/overlay-preload.js` | Overlay IPC bridge |
| `public/splash.html` | App splash screen |
| `public/splash-preload.js` | Splash IPC bridge |
| `public/repair-overlay.html` | Floating repair progress window |
| `public/repair-overlay-preload.js` | Repair overlay IPC bridge |
| `public/preload.js` | Main window IPC bridge |
| `public/installer.nsh` | NSIS installer customization |
| `public/app.manifest` | Windows app manifest |

## Scripts

| File | Purpose |
|------|---------|
| `scripts/enum_resolutions.ps1` | PowerShell display resolution enumeration |
| `scripts/rename-output.js` | Build output renaming utility |
| `scripts/WPFTweaksRevertStartMenu.ps1` | Start menu revert script |
| `scripts/vivetool/` | Windows feature flag tool |

## Database

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Database schema (users, profiles, subscriptions) |

## Game Configs

| Path | Purpose |
|------|---------|
| `V-Config/apex-legends/` | Apex Legends configuration templates |
