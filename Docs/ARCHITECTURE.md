# Architecture — GS Center v2.1.4

## System Overview

GS Center is a desktop application with three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Electron Shell (main.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Window Mgr  │  │   Tray/IPC   │  │   Auto-Updater        │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                  Main Process (main-process/)                    │
│  26 IPC handler modules: tweaks, cleaners, overlay, auth, etc.  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Registry Ops │  │ PowerShell   │  │   Winget / WMI        │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ GCMonitor.exe│  │ ResHelper.exe│  │   File System Ops     │  │
│  │  (C# sidecar)│  │  (C# helper) │  │                       │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                   Renderer Process (src/)                        │
│  React 18 + TypeScript + Tailwind CSS                           │
│  ┌──────────┐ ┌────────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │ 19 Pages │ │21 Components│ │2 Context│ │  1 Hook          │  │
│  └──────────┘ └────────────┘ └─────────┘ └──────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Data Layer: performanceTweaks, cleanerUtilities,         │   │
│  │ gameRequirements, appCatalog, obsPresets, changelog      │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                   External Services                              │
│  Supabase (Auth/DB) • PayPal (Payments) • winget (Packages)    │
│  LibreHardwareMonitor (via GCMonitor) • OBS Studio              │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Hardware Monitoring Pipeline
```
GCMonitor.exe (C# sidecar)
  ↓ stdout JSON events (hwinfo, lhm-data)
hardwareMonitor.js (main process)
  ↓ IPC: hardware:realtime events
useRealtimeHardware hook (renderer)
  ↓ React state
LiveMetrics / DashboardHero / HealthScore / AdvisorPanel
```

### Tweak Application Flow
```
User toggles tweak → Performance.tsx
  ↓ ipcRenderer.invoke('tweak:apply-{name}')
tweaks.js → PowerShell registry edit → success/fail
  ↓ IPC response
UI updates tweak card status (applied/default)
```

### App Install Flow
```
User clicks Install → AppInstaller.tsx
  ↓ ipcRenderer.invoke('app:install', { id, name })
appInstaller.js → winget install --id {id}
  ↓ IPC progress events (preparing → downloading → installing → done)
UI shows progress bar per app
```

### Authentication Flow
```
User clicks Discord/Twitch → LoginPage.tsx
  ↓ ipcRenderer.invoke('auth:login', provider)
auth.js → Opens OAuth BrowserWindow → Redirect intercept
  ↓ Access token extracted from URL hash
AuthContext.tsx → Supabase session → Profile fetch
  ↓ User state propagated to all components
Pro features unlocked based on role/subscription
```

## State Management

| State | Location | Scope |
|-------|----------|-------|
| Auth/Profile | AuthContext (Supabase + localStorage cache) | Global |
| Toasts | ToastContext | Global |
| Hardware metrics | useRealtimeHardware hook | Dashboard/Performance |
| Settings | localStorage via settings.ts | Persistent |
| Page navigation | useState in App.tsx | App-wide |
| Tweak status | Per-page fetch via IPC check handlers | Per-page |

## IPC Communication Map

The main process registers **100+ IPC handlers** across 26 modules:

| Module | Handler Prefix | Count |
|--------|---------------|-------|
| tweaks.js | `tweak:apply-*`, `tweak:reset-*`, `tweak:check-*` | ~51 |
| cleaners.js | `cleaner:clear-*` | ~30 |
| hardwareMonitor.js | `hardware:*` | 5 |
| hardwareInfo.js | `hardware:get-info` | 1 |
| healthScore.js | `health:*` | 2 |
| advisor.js | `advisor:*` | 2 |
| overlay.js | `overlay:*` | 6 |
| gameProfiles.js | `game:*`, `system:get-display-resolutions` | 5 |
| appInstaller.js | `app:*` | 4 |
| appUninstaller.js | `appuninstall:*` | 5 |
| windowsDebloat.js | `wdebloat:*` | 4 |
| startup.js | `startup:*` | 2 |
| serviceTweaks.js | `service:*` | 5 |
| softwareUpdates.js | `software:*` | 3 |
| network.js | `network:*` | 1 |
| obsPresets.js | `obs:*` | 4 |
| spaceAnalyzer.js | `space:*` | 3 |
| resolutionManager.js | `resolution:*` | 3 |
| auth.js | `auth:*` | 2 |
| paypal.js | `paypal:*` | 1 |
| autoUpdater.js | `updater:*` | 2 |
| ctTweaks.js | `ct:*` | 3 |
| repairOverlay.js | `repair-overlay:*` | 3 |
| windowManager.js | `window:*` | 4 |

## Native Sidecar Architecture

### GCMonitor.exe (native-monitor/)
- **Language**: C# (.NET 8.0)
- **Purpose**: Real-time hardware metrics via LibreHardwareMonitor
- **Communication**: stdout JSON events, one per line
- **Events**: `hwinfo` (identity), `hwinfo-update`, `lhm-data` (metrics), `lhm-error`
- **Lifecycle**: Spawned by hardwareMonitor.js, auto-restart on crash (max 5 attempts)

### ResolutionHelper.exe (lib/)
- **Language**: C#
- **Purpose**: Win32 API wrapper for display resolution changes
- **Communication**: CLI args → stdout JSON response

## Build & Packaging

```
npm run react-build    → build/ (React production bundle)
npm run electron-build → dist/ (Electron installer via electron-builder)
npm run build:monitor  → native-monitor/publish/ (GCMonitor.exe)
```

Electron-builder config produces NSIS installer for Windows x64.

## Security Model

- **Admin elevation**: Detected at launch via admin-check.js; UAC prompt if needed
- **Protected paths**: Space Analyzer excludes Windows, Program Files, etc.
- **Protected startup items**: Windows Defender, Security Health cannot be disabled
- **Protected services**: Critical system services excluded from optimization
- **OAuth**: Implicit flow with BrowserWindow partition isolation
- **Registry writes**: Only specific, documented keys; restore point recommended
