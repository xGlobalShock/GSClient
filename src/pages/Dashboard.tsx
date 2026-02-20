import React from 'react';
import SystemDetails from '../components/SystemDetails';
import Loader from '../components/Loader';
import type { HardwareInfo, ExtendedStats } from '../App';
import '../styles/Dashboard.css';

interface DashboardProps {
  systemStats: {
    cpu: number;
    ram: number;
    disk: number;
    temperature: number;
  };
  hardwareInfo?: HardwareInfo;
  extendedStats?: ExtendedStats;
  statsLoaded?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ systemStats, hardwareInfo, extendedStats, statsLoaded }) => {
  if (!statsLoaded) {
    // show page-level loader until first statistics arrive
    return <div className="dashboard-page"><Loader /></div>;
  }

  return (
    <div className="dashboard-page">
      <SystemDetails systemStats={systemStats} hardwareInfo={hardwareInfo} extendedStats={extendedStats} />
    </div>
  );
};

export default Dashboard;
