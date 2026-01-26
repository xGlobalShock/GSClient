import React from 'react';
import {
  Home,
  Activity,
  Trash2,
  Settings,
  Zap,
} from 'lucide-react';
import '../styles/Sidebar.css';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'performance', label: 'Performance', icon: Activity },
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
              title={item.label}
            >
              <Icon size={24} />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <div className="status-dot active"></div>
          <span className="status-text">ONLINE</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
