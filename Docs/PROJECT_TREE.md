# Project Tree — GS Center v2.1.4

```
GC Center/
│
├── package.json                    # Dependencies, scripts, electron-builder config
├── tsconfig.json                   # TypeScript configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── postcss.config.js               # PostCSS configuration
├── index.html                      # Vite entry (dev only)
├── README.md                       # Project overview & feature documentation
├── ToDoList.md                     # Task tracking
│
├── electron/                       # ── Electron Main Process Entry ──
│   ├── main.js                     # Window, tray, IPC registration, auto-updater
│   ├── admin-check.js              # UAC elevation detection
│   ├── dev-launcher.js             # Dev mode: React + Electron concurrent start
│   └── launcher.js                 # Production entry point
│
├── main-process/                   # ── IPC Handler Modules (26 files) ──
│   ├── tweaks.js                   # 17 registry performance tweaks
│   ├── cleaners.js                 # 30+ cache/file cleaners
│   ├── hardwareMonitor.js          # GCMonitor.exe sidecar management
│   ├── hardwareInfo.js             # Static hardware identity collection
│   ├── healthScore.js              # Weighted health score calculation
│   ├── advisor.js                  # System insights & upgrade recommendations
│   ├── overlay.js                  # FPS HUD overlay window
│   ├── gameProfiles.js             # Game config read/write
│   ├── appInstaller.js             # Winget app installation
│   ├── appUninstaller.js           # App removal + leftover cleanup
│   ├── windowsDebloat.js           # AppX bloatware removal
│   ├── startup.js                  # Startup item management
│   ├── serviceTweaks.js            # Windows service optimization
│   ├── softwareUpdates.js          # Winget software updates
│   ├── network.js                  # Ping/latency testing
│   ├── obsPresets.js               # OBS config deployment
│   ├── spaceAnalyzer.js            # Disk usage analysis
│   ├── resolutionManager.js        # Display resolution control
│   ├── auth.js                     # OAuth flow (Discord/Twitch)
│   ├── authSession.js              # Session/token management
│   ├── paypal.js                   # PayPal checkout flow
│   ├── autoUpdater.js              # electron-updater integration
│   ├── ctTweaks.js                 # Essential tweaks batch runner
│   ├── ctEssentialTweaks.js        # 30+ essential tweak definitions
│   ├── repairOverlay.js            # Floating repair progress window
│   ├── windowManager.js            # Window lifecycle management
│   └── utils.js                    # execAsync, runPSScript helpers
│
├── native-monitor/                 # ── C# Hardware Monitor Sidecar ──
│   ├── Program.cs                  # Entry point
│   ├── HardwareInfoCollector.cs    # LibreHardwareMonitor data collector
│   ├── GCMonitor.csproj            # .NET 8 project
│   ├── bin/                        # Build output
│   ├── obj/                        # Build intermediates
│   └── publish/                    # Published sidecar executable
│
├── lib/                            # ── Native Helpers ──
│   └── ResolutionHelper.cs         # Win32 display resolution API wrapper
│
├── src/                            # ── React Frontend ──
│   ├── App.tsx                     # Root component, routing, state management
│   ├── index.tsx                   # React DOM entry
│   ├── index.css                   # Global CSS + Tailwind imports
│   ├── custom.d.ts                 # TypeScript declarations
│   ├── react-app-env.d.ts         # CRA environment types
│   │
│   ├── pages/                      # ── 19 Page Components ──
│   │   ├── LiveMetrics.tsx         # Dashboard with real-time hardware charts
│   │   ├── Performance.tsx         # 17 gaming tweaks in 7 categories
│   │   ├── GameLibrary.tsx         # Game profiles & hardware comparison
│   │   ├── OBSPresets.tsx          # OBS preset deployment & launch
│   │   ├── ResolutionManager.tsx   # Monitor resolution management
│   │   ├── Network.tsx             # Regional ping tests + speed tests
│   │   ├── AppsPage.tsx            # Tab container (Install/Uninstall/Debloat/Startup/Space)
│   │   ├── AppInstaller.tsx        # 40+ winget app installer
│   │   ├── AppUninstaller.tsx      # App uninstaller + leftover cleanup
│   │   ├── WindowsDebloat.tsx      # 100+ bloatware removal (Pro)
│   │   ├── Startup.tsx             # Startup item management
│   │   ├── SpaceAnalyzer.tsx       # Disk usage analyzer (Pro)
│   │   ├── SoftwareUpdates.tsx     # Software update manager (Pro)
│   │   ├── Cleaner.tsx             # 30+ cleaners + essential tweaks + repair
│   │   ├── ServiceOptimizer.tsx    # 60+ service optimizer (Pro)
│   │   ├── Settings.tsx            # App settings & overlay config
│   │   ├── AdminPanel.tsx          # User management (Owner/Admin)
│   │   ├── ManageSubscription.tsx  # Pro subscription management
│   │   └── LoginPage.tsx           # Discord/Twitch OAuth login
│   │
│   ├── components/                 # ── 21 UI Components ──
│   │   ├── Header.tsx              # Top bar with profile, What's New, version
│   │   ├── Sidebar.tsx             # Bottom nav bar (9 items)
│   │   ├── ToastContainer.tsx      # Toast notification display
│   │   ├── DashboardHero.tsx       # Dashboard metric cards + charts
│   │   ├── HealthScore.tsx         # Health score with 7 factors
│   │   ├── AdvisorPanel.tsx        # System insights panel
│   │   ├── PageHeader.tsx          # Page title + stats + badges
│   │   ├── PerformanceTweakCard.tsx # Tweak card with apply/reset
│   │   ├── CleanerCard.tsx         # Cleaner card with action button
│   │   ├── SystemRepairPanel.tsx   # SFC/DISM/ChkDsk tools
│   │   ├── TweakExecutionModal.tsx # Essential tweaks progress modal
│   │   ├── CacheCleanupToast.tsx   # Batch cleanup overlay
│   │   ├── AutoCleanupRunner.tsx   # Startup auto-cleanup
│   │   ├── LightRays.tsx           # WebGL light ray animation
│   │   ├── Loader.tsx              # Skeleton loading state
│   │   ├── PaywallModal.tsx        # PRO upgrade modal + ProGuard HOC
│   │   ├── UpgradeModal.tsx        # Simplified upgrade prompt
│   │   ├── ProPreviewBanner.tsx    # PRO feature info banner
│   │   ├── ProLockedWrapper.tsx    # PRO content disabled wrapper
│   │   ├── ProLineBadge.tsx        # Inline upgrade button
│   │   └── ProfileDropdown.tsx     # User menu dropdown
│   │
│   ├── contexts/                   # ── Global State ──
│   │   ├── AuthContext.tsx         # Auth, profile, Pro/Admin state
│   │   └── ToastContext.tsx        # Toast notification queue
│   │
│   ├── hooks/                      # ── Custom Hooks ──
│   │   └── useRealtimeHardware.ts  # Real-time hardware metric subscription
│   │
│   ├── data/                       # ── Static Data ──
│   │   ├── performanceTweaks.ts    # 17 tweak definitions
│   │   ├── cleanerUtilities.ts     # 30 cleaner definitions
│   │   ├── gameRequirements.ts     # 8 game hardware specs
│   │   ├── appCatalog.ts           # 40+ app catalog (winget IDs)
│   │   ├── obsPresets.ts           # OBS preset metadata
│   │   ├── obsPresetConfigs/       # OBS config files
│   │   ├── changelog.ts            # Version changelog
│   │   └── devUpdates.ts           # Dev update notes
│   │
│   ├── services/                   # ── Service Layer ──
│   │   └── obsPresetsService.ts    # OBS apply/launch via IPC
│   │
│   ├── utils/                      # ── Utilities ──
│   │   ├── settings.ts             # localStorage settings persistence
│   │   └── hardwareCompare.ts      # Hardware benchmark + FPS prediction
│   │
│   ├── lib/                        # ── Library Config ──
│   │   └── supabase.ts             # Supabase client + Pro page IDs
│   │
│   ├── styles/                     # ── 37 CSS Files ──
│   │   ├── Dashboard.css, DashboardHero.css, HealthScore.css
│   │   ├── Performance.css, PerformanceTweakCard.css
│   │   ├── Cleaner.css, CleanerCard.css, CacheCleanupToast.css
│   │   ├── GameLibrary.css, Network.css, OBSPresets.css
│   │   ├── AppInstaller.css, AppsPage.css, AppUninstaller.css
│   │   ├── WindowsDebloat.css, Startup.css, SpaceAnalyzer.css
│   │   ├── ServiceOptimizer.css, SoftwareUpdates.css
│   │   ├── ResolutionManager.css, Settings.css
│   │   ├── AdminPanel.css, ManageSubscription.css
│   │   ├── Sidebar.css, Header.css, PageHeader.css
│   │   ├── LoginPage.css, Auth.css, LightRays.css
│   │   ├── Loader.css, Toast.css, SystemRepairPanel.css
│   │   ├── AdvisorPanel.css, DevUpdates.css, WhatsNew.css
│   │   └── ProLineBadge.css, ProLock.css
│   │
│   └── assets/                     # Static images & icons
│
├── public/                         # ── Electron HTML Shells ──
│   ├── index.html                  # Main app shell
│   ├── preload.js                  # Main window IPC bridge
│   ├── overlay.html                # FPS HUD overlay
│   ├── overlay-preload.js          # Overlay IPC bridge
│   ├── splash.html                 # App splash screen
│   ├── splash-preload.js           # Splash IPC bridge
│   ├── repair-overlay.html         # Floating repair progress
│   ├── repair-overlay-preload.js   # Repair overlay IPC bridge
│   ├── installer.nsh               # NSIS installer customization
│   ├── app.manifest                # Windows app manifest
│   ├── app-icons/                  # Application icons
│   ├── drivers/                    # Bundled drivers
│   └── native-monitor/             # Bundled GCMonitor.exe
│
├── build/                          # ── Production Build Output ──
│   └── static/                     # Compiled JS/CSS/media
│
├── scripts/                        # ── Build & Utility Scripts ──
│   ├── enum_resolutions.ps1        # PowerShell resolution enumeration
│   ├── rename-output.js            # Build rename utility
│   ├── WPFTweaksRevertStartMenu.ps1 # Start menu revert
│   └── vivetool/                   # Windows feature flag tool
│
├── supabase/                       # ── Database ──
│   ├── schema.sql                  # Tables: users, profiles, subscriptions
│   └── functions/                  # Database functions
│
├── V-Config/                       # ── Game Config Templates ──
│   └── apex-legends/               # Apex Legends configs
│
└── Docs/                           # ── Documentation ──
    ├── ARCHITECTURE.md
    ├── FILE_MAP.md
    ├── PROJECT_TREE.md
    ├── QUICK_START.md
    ├── DEVELOPMENT.md
    ├── FEATURE_DOCUMENTATION.md
    ├── NPM_COMMANDS.md
    ├── UI_UX_GUIDE.md
    ├── PC_Tweaks.md
    └── ... (additional docs)
```
