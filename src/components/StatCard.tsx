
import React from 'react';
import { motion } from 'framer-motion';
import '../styles/StatCard.css';

interface StatCardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  status: 'good' | 'warning' | 'critical';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon,
  status,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      default:
        return '#10b981';
    }
  };

  const normalizedValue = Math.min(value, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <motion.div
      className={`stat-card stat-${status}`}
      whileHover={{ scale: 1.03, y: -5 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="stat-card-inner stat-card-vertical">
        <div className="stat-icon-badge" style={{ boxShadow: `0 0 16px ${getStatusColor()}40` }}>
          {icon}
        </div>
        <div className="stat-circle-container">
          <svg className="stat-circle-svg" width="110" height="110">
            <circle
              cx="55"
              cy="55"
              r="45"
              fill="none"
              stroke="rgba(255, 255, 255, 0.07)"
              strokeWidth="8"
            />
            <motion.circle
              cx="55"
              cy="55"
              r="45"
              fill="none"
              stroke={getStatusColor()}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                filter: `drop-shadow(0 0 8px ${getStatusColor()}80)`
              }}
            />
          </svg>
          <div className="stat-circle-text stat-circle-text-large">{normalizedValue.toFixed(1)}<span className="stat-unit-text">{unit}</span></div>
        </div>
        <h4 className="stat-label stat-label-center">{title}</h4>
      </div>
    </motion.div>
  );
};

export default StatCard;
