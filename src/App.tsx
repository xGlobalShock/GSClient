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
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ToastContainer';
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
  ipAddress: string;
  windowsVersion: string;
  windowsBuild: string;
  systemUptime: string;
  powerPlan: string;
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
  wifiSignal: number;
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
  const [systemStats, setSystemStats] = useState({
    cpu: 0,
    ram: 0,
    disk: 0,
    temperature: 0,
  });
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | undefined>(undefined);
  const [extendedStats, setExtendedStats] = useState<ExtendedStats | undefined>(undefined);

  useEffect(() => {
    // Loader timeout (simulate app/data loading)
    const timer = setTimeout(() => setIsLoading(false), 5000);

    // Get real system stats
    const fetchSystemStats = async () => {
      if (window.electron?.ipcRenderer) {
        try {
          const stats = await window.electron.ipcRenderer.invoke('system:get-stats');
          setSystemStats(stats);
        } catch (error) {
          console.error('Error fetching system stats:', error);
        }
      }
    };

    // Fetch hardware info once
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

    // Fetch extended stats (live metrics)
    const fetchExtendedStats = async () => {
      if (window.electron?.ipcRenderer) {
        try {
          const ext = await window.electron.ipcRenderer.invoke('system:get-extended-stats');
          setExtendedStats(ext);
        } catch (error) {
          console.error('Error fetching extended stats:', error);
        }
      }
    };
    fetchExtendedStats();

    // Initial fetch
    fetchSystemStats();

    // Update every 2 seconds
    const interval = setInterval(fetchSystemStats, 2000);
    const extInterval = setInterval(fetchExtendedStats, 3000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      clearInterval(extInterval);
    };
  }, []);

  const renderPage = () => {
    return (
      <>
        <div style={{ display: currentPage === 'dashboard' ? 'block' : 'none' }}>
          <Dashboard systemStats={systemStats} hardwareInfo={hardwareInfo} extendedStats={extendedStats} />
        </div>
        <div style={{ display: currentPage === 'performance' ? 'block' : 'none' }}>
          <Performance />
        </div>
        <div style={{ display: currentPage === 'cleaner' ? 'block' : 'none' }}>
          <Cleaner />
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
            <Loader />
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
