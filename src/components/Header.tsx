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

      <div className="header-right" aria-hidden>
        {/* Notifications and profile removed per request */}
      </div>
    </header>
  );
};

export default Header;
