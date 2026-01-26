import React, { useState, useEffect } from 'react';
import Loader from './components/Loader';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Performance from './pages/Performance';
import Cleaner from './pages/Cleaner';
import Settings from './pages/Settings';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import './App.css';

function App() {
    const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [systemStats, setSystemStats] = useState({
    cpu: 0,
    ram: 0,
    disk: 0,
    temperature: 0,
  });

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

    // Initial fetch
    fetchSystemStats();

    // Update every 2 seconds
    const interval = setInterval(fetchSystemStats, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const renderPage = () => {
    return (
      <>
        <div style={{ display: currentPage === 'dashboard' ? 'block' : 'none' }}>
          <Dashboard systemStats={systemStats} />
        </div>
        <div style={{ display: currentPage === 'performance' ? 'block' : 'none' }}>
          <Performance />
        </div>
        <div style={{ display: currentPage === 'cleaner' ? 'block' : 'none' }}>
          <Cleaner />
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
