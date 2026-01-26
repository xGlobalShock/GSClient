import React from 'react';
import { Bell, User } from 'lucide-react';
import '../styles/Header.css';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">PC Optimizer Elite</h1>
        <p className="header-subtitle">System Performance Control Center</p>
      </div>

      <div className="header-right">
        <button className="header-button notification-btn">
          <Bell size={20} />
          <span className="notification-badge">2</span>
        </button>
        <button className="header-button profile-btn">
          <User size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
