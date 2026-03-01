import React, { useState, useEffect } from 'react';
import Loader from './components/Loader';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Performance from './pages/Performance';
import Cleaner from './pages/Cleaner';
import Settings from './pages/Settings';
import GameLibrary from './pages/GameLibrary';
import OBSPresets from './pages/OBSPresets';
import Network from './pages/Network';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { useRealtimeHardware } from './hooks/useRealtimeHardware';
import './App.css';

export interface HardwareInfo {
  cpuName: string;
  gpuName: string;
  ramInfo: string;
  ramBrand: string;
  ramPartNumber: string;
  diskName: string;
  cpuCores: number;
  cpuThreads: number;
  cpuMaxClock: string;
  gpuVramTotal: string;
  gpuDriverVersion: string;
  ramTotalGB: number;
  ramUsedGB: number;
  ramSticks: string;
  diskTotalGB: number;
  diskFreeGB: number;
  diskType: string;
  diskHealth: string;
  allDrives: { letter: string; totalGB: number; freeGB: number; label: string }[];
  networkAdapter: string;
  networkLinkSpeed?: string;
  networkAdapters?: { name: string; type: string; linkSpeed: string }[];
  ipAddress: string;
  ipv6Address?: string;
  macAddress?: string;
  gateway?: string;
  dns?: string;
  // Motherboard & BIOS
  motherboardManufacturer?: string;
  motherboardProduct?: string;
  motherboardSerial?: string;
  biosVersion?: string;
  biosDate?: string;
  windowsVersion: string;
  windowsBuild: string;
  systemUptime: string;
  powerPlan: string;
  lastWindowsUpdate?: string;
  windowsActivation?: string;
  hasBattery: boolean;
  batteryPercent: number;
  batteryStatus: string;
}

export interface ExtendedStats {
  cpuClock: number;
  perCoreCpu: number[];
  gpuUsage: number;
  gpuTemp: number;
  gpuVramUsed: number;
  gpuVramTotal: number;
  networkUp: number;
  networkDown: number;
  ssid?: string;
  wifiSignal: number;
  activeAdapterName?: string;
  activeLinkSpeed?: string;
  latencyMs?: number;
  ramUsedGB: number;
  ramTotalGB: number;
  diskReadSpeed: number;
  diskWriteSpeed: number;
  processCount: number;
  systemUptime: string;
}

function App() {
    const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | undefined>(undefined);

  // ── Real-Time Push: subscribe to hardware metrics from main process ──
  // The hook listens for 'realtime-hw-update' events pushed via webContents.send
  // at 1000ms intervals. Uses useRef internally to avoid re-rendering on every push;
  // state is flushed once per animation frame for smooth batched UI updates.
  const shouldStream = isLoading || currentPage === 'dashboard' || currentPage === 'performance';
  const { systemStats, extendedStats, connected } = useRealtimeHardware({ enabled: shouldStream });

  // Dismiss the loader as soon as the first real-time push arrives
  useEffect(() => {
    if (isLoading && connected) {
      setIsLoading(false);
    }
  }, [isLoading, connected]);

  // Fallback: if real-time push hasn't connected within 5s, try a single poll
  // to unblock the loader (covers dev mode without Electron)
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(async () => {
      if (!connected && window.electron?.ipcRenderer) {
        try {
          await window.electron.ipcRenderer.invoke('system:get-stats');
          setIsLoading(false);
        } catch {}
      }
      // If no electron at all (browser dev), just dismiss after timeout
      if (!window.electron) setIsLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isLoading, connected]);

  useEffect(() => {
    // Fetch hardware info once (static data, cached on disk for 7 days)
    const fetchHardwareInfo = async () => {
      if (window.electron?.ipcRenderer) {
        try {
          const info = await window.electron.ipcRenderer.invoke('system:get-hardware-info');
          setHardwareInfo(info);
        } catch (error) {
          console.error('Error fetching hardware info:', error);
        }
      }
    };
    fetchHardwareInfo();

    // Listen for background-refreshed hardware info (replaces stale cache)
    const onHwUpdated = (info: HardwareInfo) => { setHardwareInfo(info); };
    const unsub = window.electron?.ipcRenderer?.on?.('hardware-info-updated', onHwUpdated);
    return () => { unsub?.(); };
  }, []);

  const renderPage = () => {
    return (
      <>
        <div style={{ display: currentPage === 'dashboard' ? 'block' : 'none' }}>
          <Dashboard
            systemStats={systemStats}
            hardwareInfo={hardwareInfo}
            extendedStats={extendedStats}
            statsLoaded={connected}
          />
        </div>
        <div style={{ display: currentPage === 'performance' ? 'block' : 'none' }}>
          <Performance />
        </div>
        <div style={{ display: currentPage === 'cleaner' ? 'block' : 'none' }}>
          <Cleaner />
        </div>
        <div style={{ display: currentPage === 'network' ? 'block' : 'none' }}>
          <Network />
        </div>
        <div style={{ display: currentPage === 'gameLibrary' ? 'block' : 'none' }}>
          <GameLibrary />
        </div>
        <div style={{ display: currentPage === 'obsPresets' ? 'block' : 'none' }}>
          <OBSPresets />
        </div>
        <div style={{ display: currentPage === 'settings' ? 'block' : 'none' }}>
          <Settings />
        </div>
      </>
    );
  };

  return (
    <ToastProvider>
      {isLoading ? (
        <div className="app-container">
          <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
          <div className="main-content">
            <Header />
            <div className="page-content">
              <Loader />
            </div>
          </div>
        </div>
      ) : (
        <div className="app-container">
          <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
          <div className="main-content">
            <Header />
            <div className="page-content">
              {renderPage()}
            </div>
          </div>
          <ToastContainer />
        </div>
      )}
    </ToastProvider>
  );
}

export default App;
