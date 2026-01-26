import React from 'react';
import { motion } from 'framer-motion';
import StatCard from '../components/StatCard';
import { Cpu, MemoryStick, HardDrive, Thermometer } from 'lucide-react';
import '../styles/Dashboard.css';

interface DashboardProps {
  systemStats: {
    cpu: number;
    ram: number;
    disk: number;
    temperature: number;
  };
}

type StatStatus = 'good' | 'warning' | 'critical';

const getStatus = (value: number): StatStatus => {
  if (value < 60) return 'good';
  if (value < 80) return 'warning';
  return 'critical';
};

const HeroHeader: React.FC = () => (
  <motion.header className="hero-header" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
    <div>
      <h2 className="hero-title">PC Optimizer Elite</h2>
      <p className="hero-sub">System Performance Control Center</p>
    </div>
    <div className="hero-actions">
      <div className="status-badge" aria-hidden>Optimal</div>
    </div>
  </motion.header>
);
// Feature flag: set to false while actions are not implemented
const SHOW_ACTIONS = false;
const ActionsBar: React.FC = () => (
  <div className="actions-bar">
    <motion.button className="btn btn-primary" whileHover={{ scale: 1.03 }}>🚀 Boost Performance</motion.button>
    <motion.button className="btn btn-secondary" whileHover={{ scale: 1.03 }}>🔧 Advanced Settings</motion.button>
  </div>
);

const SystemHealthCard: React.FC<{ percent?: number }> = ({ percent = 90 }) => (
  <motion.div className="system-health-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
    <div className="health-row">
      <div className="health-bar" aria-hidden>
        <div className="health-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="health-score">{percent}%</div>
    </div>
    <div className="health-text">
      <div className="health-title">System Health</div>
      <div className="health-desc">Your system is performing at optimal levels</div>
    </div>
  </motion.div>
);

const Dashboard: React.FC<DashboardProps> = ({ systemStats }) => {
  // Compute lightweight system health score from metrics
  const computeHealth = (s: DashboardProps['systemStats']) => {
    // Normalize components (higher is worse; we invert to health)
    const cpuHealth = Math.max(0, 100 - s.cpu); // 100% CPU -> 0 health
    const ramHealth = Math.max(0, 100 - s.ram);
    const diskHealth = Math.max(0, 100 - s.disk);
    // Map temperature to a 0-100 health (assume 30C ideal, 90C worst)
    const tempClamped = Math.min(Math.max(s.temperature, 30), 90);
    const tempHealth = Math.max(0, 100 - ((tempClamped - 30) / (90 - 30)) * 100);

    // Weighted average - tweakable: CPU:35, RAM:25, Disk:20, Temp:20
    const health = (cpuHealth * 0.35) + (ramHealth * 0.25) + (diskHealth * 0.2) + (tempHealth * 0.2);
    return Math.round(Math.max(0, Math.min(100, health)));
  };

  const stats = [
    { title: 'CPU', value: systemStats.cpu, unit: '%', icon: <Cpu size={36} />, status: getStatus(systemStats.cpu) },
    { title: 'RAM', value: systemStats.ram, unit: '%', icon: <MemoryStick size={36} />, status: getStatus(systemStats.ram) },
    { title: 'Disk', value: systemStats.disk, unit: '%', icon: <HardDrive size={36} />, status: getStatus(systemStats.disk) },
    { title: 'Temp', value: systemStats.temperature, unit: '°C', icon: <Thermometer size={36} />, status: getStatus(systemStats.temperature) },
  ];

  // Exponential moving average for smoothing fluctuations
  const [healthPct, setHealthPct] = React.useState<number>(() => computeHealth(systemStats));
  React.useEffect(() => {
    const newPct = computeHealth(systemStats);
    setHealthPct(prev => Math.round(prev * 0.8 + newPct * 0.2)); // alpha=0.2
  }, [systemStats]);

  return (
    <div className="dashboard-page">
      <HeroHeader />

      <section className="stat-grid" aria-label="System Stats">
        {stats.map((s) => (
          <StatCard key={s.title} title={s.title} value={s.value} unit={s.unit} icon={s.icon} status={s.status} />
        ))}
      </section>

{SHOW_ACTIONS && <ActionsBar />}

      <SystemHealthCard percent={healthPct} />
    </div>
  );
};

export default Dashboard;
