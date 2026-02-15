import React from 'react';
import {
  Home,
  Activity,
  Trash2,
  Settings,
  Gamepad2,
  Zap,
  Video,
} from 'lucide-react';
import '../styles/Sidebar.css';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  online?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, online: onlineProp }) => {
  const [online, setOnline] = React.useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  React.useEffect(() => {
    // If a prop is provided, use it; otherwise listen to browser events
    if (typeof onlineProp === 'boolean') {
      setOnline(onlineProp);
      return;
    }
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onlineProp]);
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'gameLibrary', label: 'Game Library', icon: Gamepad2 },
    { id: 'obsPresets', label: 'OBS Presets', icon: Video },
    { id: 'cleaner', label: 'Cleaner', icon: Trash2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Zap className="logo-icon" />
        <span className="logo-text">ELITE</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon size={24} />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator" aria-hidden>
          <div className={`status-dot ${online ? 'active' : ''}`}></div>
          <span className="status-text">{online ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
