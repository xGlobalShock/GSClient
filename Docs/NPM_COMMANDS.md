# NPM Commands — GS Center v2.1.4

## Primary Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development (React hot reload + Electron window) |
| `npm run client` | Recommended desktop launch via dev-launcher |
| `npm run react-build` | Build React for production → `build/` |
| `npm run electron-build` | Package Windows installer → `dist/` |
| `npm run build:monitor` | Build GCMonitor.exe sidecar → `native-monitor/publish/` |

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run react-start` | React dev server only (port 3000) |
| `npm run electron-only` | Electron only (uses pre-built React from `build/`) |
| `npm start` | Alias for dev |
| `npm run react-test` | Run Jest test suite |

## Package Management

```bash
npm install                    # Install all dependencies
npm install <package>          # Add a dependency
npm install -D <package>       # Add a dev dependency
npm ls --depth=0               # List top-level packages
npm outdated                   # Check for outdated packages
```

## Build Workflow

```bash
# Full release build
npm run react-build          # 1. Build React production bundle
npm run build:monitor        # 2. Build native hardware monitor (if changed)
npm run electron-build       # 3. Package Windows installer

# Output: dist/GS-Center-Setup-x.x.x.exe
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Install fails | Delete `node_modules/` and `package-lock.json`, then `npm install` |
| Electron won't start | Ensure React is running on `localhost:3000` first |
| Native monitor build fails | Install .NET 8.0 SDK |
| winget not found | Install App Installer from Microsoft Store |
| Permission errors | Run terminal as Administrator |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GENERATE_SOURCEMAP=false` | Disable source maps in production |
| `NODE_MAX_OLD_SPACE_SIZE=4096` | Increase Node.js memory limit |
| `SKIP_PREFLIGHT_CHECK=true` | Skip CRA compatibility checks |
