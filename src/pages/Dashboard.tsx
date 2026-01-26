import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, MemoryStick, HardDrive, Thermometer } from 'lucide-react';
import StatCard from '../components/StatCard';
import '../styles/Dashboard.css';

interface DashboardProps {
  systemStats: {
    cpu: number;
    ram: number;
    disk: number;
    temperature: number;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ systemStats }) => {
  const getStatus = (value: number): 'good' | 'warning' | 'critical' => {
    if (value < 60) return 'good';
    if (value < 80) return 'warning';
    return 'critical';
  };

  return (
    <motion.div
      className="dashboard-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="dashboard-grid">
        <StatCard
          title="CPU Usage"
          value={systemStats.cpu}
          unit="%"
          icon={<Cpu size={28} strokeWidth={2} />}
          status={getStatus(systemStats.cpu)}
        />
        <StatCard
          title="RAM Usage"
          value={systemStats.ram}
          unit="%"
          icon={<MemoryStick size={28} strokeWidth={2} />}
          status={getStatus(systemStats.ram)}
        />
        <StatCard
          title="Disk Usage"
          value={systemStats.disk}
          unit="%"
          icon={<HardDrive size={28} strokeWidth={2} />}
          status={getStatus(systemStats.disk)}
        />
        <StatCard
          title="Temperature"
          value={systemStats.temperature}
          unit="°C"
          icon={<Thermometer size={28} strokeWidth={2} />}
          status={systemStats.temperature > 75 ? 'critical' : systemStats.temperature > 60 ? 'warning' : 'good'}
        />
      </div>

      <div className="dashboard-actions">
        <motion.button
          className="action-button primary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          🚀 Boost Performance
        </motion.button>
        <motion.button
          className="action-button secondary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          🔧 Advanced Settings
        </motion.button>
      </div>

      <div className="dashboard-info">
        <motion.div
          className="info-card"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3>System Health</h3>
          <p>Your system is performing at optimal levels</p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
