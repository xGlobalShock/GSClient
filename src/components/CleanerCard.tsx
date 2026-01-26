import React from 'react';
import { LucideIcon } from 'lucide-react';
import '../styles/CleanerCard.css';

interface CleanerCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  cacheType: string;
  description: string;
  buttonText: string;
  color: string;
  onClean: (id: string) => Promise<void>;
  isLoading?: boolean;
}

const CleanerCard: React.FC<CleanerCardProps> = ({
  id,
  title,
  icon: Icon,
  cacheType,
  description,
  buttonText,
  color,
  onClean,
  isLoading = false,
}) => {
  const handleClick = async () => {
    try {
      await onClean(id);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="cleaner-card" style={{ borderColor: color }}>
      <div className="card-header">
        <div className="card-title-section">
          <h3 className="card-title">{title}</h3>
          <p className="card-cache-type">{cacheType}</p>
        </div>
        <Icon size={28} color={color} className="card-icon" />
      </div>

      <p className="card-description">{description}</p>

      <button
        className="card-button"
        style={{ backgroundColor: color }}
        onClick={handleClick}
        disabled={isLoading}
      >
        <span className="button-icon">⚡</span>
        {isLoading ? 'Cleaning...' : buttonText}
      </button>
    </div>
  );
};

export default CleanerCard;
