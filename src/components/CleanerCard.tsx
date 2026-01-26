import React from 'react';
import { Cpu, Warning, Trash, ArrowCounterClockwise, Question, Monitor, Cloud, CheckCircle } from 'phosphor-react';
import '../styles/CleanerCard.css';

interface CleanerCardProps {
  id: string;
  title: string;
  icon: any;
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

  // Render image if icon is a string (image path), else render as React component
  const renderIcon = () => {
    if (typeof Icon === 'string') {
      // Standardize all image icon sizes to 40x40px
      return (
        <img
          src={Icon}
          alt={title + ' icon'}
          className="card-icon"
          style={{ width: 40, height: 40, objectFit: 'contain' }}
        />
      );
    }
    if (Icon) {
      // Standardize all React icon sizes to 40px
      return <Icon size={40} color={color} className="card-icon" />;
    }
    return null;
  };

  return (
    <div className="cleaner-card" style={{ borderColor: color }}>
      <div className="card-header">
        <div className="card-title-section">
          <h3 className="card-title">{title}</h3>
          <p className="card-cache-type">{cacheType}</p>
        </div>
        {renderIcon()}
      </div>

      <p className="card-description">{description}</p>

      <button
        className="card-button"
        style={{ backgroundColor: '#27ae60', color: '#fff' }}
        onClick={handleClick}
        disabled={isLoading}
      >
        <CheckCircle size={16} weight="bold" className="button-icon" />
        {isLoading ? 'Cleaning...' : buttonText}
      </button>
    </div>
  );
};

export default CleanerCard;
