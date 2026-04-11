# Development Guide — GS Center v2.1.4

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- **.NET 8.0 SDK** (for building GCMonitor sidecar)
- **Windows 10/11 x64** (target platform)
- **Administrator privileges** (for registry tweaks, service management)
- **winget** (Windows Package Manager — comes with App Installer from Microsoft Store)

## Setup

```bash
# Clone and install
git clone <repo-url>
cd "GC Center"
npm install

# Build the native hardware monitor (first time)
npm run build:monitor

# Start development
npm run dev
```

## NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `npm run dev` | Start Electron + React dev server with hot reload |
| `client` | `npm run client` | Recommended desktop launch (via dev-launcher) |
| `react-start` | `npm run react-start` | React dev server only (port 3000) |
| `react-build` | `npm run react-build` | Production React build → `build/` |
| `electron-only` | `npm run electron-only` | Electron only (expects pre-built React in `build/`) |
| `electron-build` | `npm run electron-build` | Package Windows installer via electron-builder |
| `build:monitor` | `npm run build:monitor` | Build GCMonitor.exe sidecar → `native-monitor/publish/` |
| `react-test` | `npm run react-test` | Run Jest tests |

## Development Workflow

1. `npm run dev` — Opens Electron window pointing to `localhost:3000`
2. Edit React code in `src/` — Hot reload updates the UI instantly
3. Edit main process code in `main-process/` — Restart Electron (`Ctrl+C`, re-run)
4. Edit C# sidecar in `native-monitor/` — Run `npm run build:monitor`, restart Electron

## Project Architecture

```
Renderer (src/)          ←→  IPC Bridge (preload.js)  ←→  Main Process (main-process/)
React 18 + TypeScript         contextBridge                26 handler modules
19 pages, 21 components       ipcRenderer.invoke           Registry, PowerShell, winget
2 contexts, 1 hook            ipcRenderer.on               GCMonitor.exe sidecar
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for full system design.

## Adding a New Feature

### New Page
1. Create `src/pages/MyFeature.tsx`
2. Create `src/styles/MyFeature.css`
3. Import in `src/App.tsx` and add to the page router switch
4. Add nav item in `src/components/Sidebar.tsx` (if visible in nav)

### New IPC Handler
1. Create `main-process/myFeature.js`
2. Export a `register(ipcMain)` function with `ipcMain.handle()` calls
3. Import and call `register()` in `electron/main.js`
4. Call from renderer via `window.electronAPI.invoke('myfeature:action', args)`

### New Data File
1. Create `src/data/myData.ts` with typed exports
2. Import in the page/component that needs it

## Code Conventions

- **React**: Functional components with hooks, TypeScript interfaces for all props
- **Styling**: Tailwind CSS utility classes + component-specific CSS files
- **IPC naming**: `module:action` (e.g., `tweak:apply-irqPriority`, `cleaner:clear-temp`)
- **State**: AuthContext for global auth, ToastContext for notifications, local useState for page state
- **Animations**: Framer Motion for transitions, OGL for WebGL effects
- **Icons**: Lucide React throughout

## Building for Distribution

```bash
# 1. Build React production bundle
npm run react-build

# 2. Package as Windows installer
npm run electron-build
```

Output: `dist/GS-Center-Setup-x.x.x.exe` (NSIS installer)

## Environment

- React dev server: `http://localhost:3000`
- PayPal callback server: `http://localhost:48245`
- OAuth redirect: `http://localhost:3000/auth/callback`
- Supabase: Configured in `src/lib/supabase.ts`

## Debugging

- **Renderer**: DevTools (Ctrl+Shift+I in Electron window)
- **Main process**: `console.log` in main-process files → appears in terminal
- **Sidecar**: GCMonitor.exe stdout → parsed in hardwareMonitor.js
- **Registry tweaks**: Run PowerShell commands manually to test
- **IPC issues**: Check preload.js exposes the channel, main-process registers the handler
