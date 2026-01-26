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

  // Select fitting icon from phosphor-react
  let FittingIcon: any = null;
  switch (id) {
    case 'nvidia-cache': FittingIcon = Cpu; break;
    case 'apex-shaders': FittingIcon = Warning; break;
    case 'temp-files': FittingIcon = Trash; break;
    case 'prefetch': FittingIcon = ArrowCounterClockwise; break;
    case 'memory-dumps': FittingIcon = Question; break;
    case 'update-cache': FittingIcon = Monitor; break;
    case 'dns-cache': FittingIcon = Cloud; break;
    default: FittingIcon = Cpu;
  }

  return (
    <div className="cleaner-card" style={{ borderColor: color }}>
      <div className="card-header">
        <div className="card-title-section">
          <h3 className="card-title">{title}</h3>
          <p className="card-cache-type">{cacheType}</p>
        </div>
        <FittingIcon size={28} color={color} className="card-icon" />
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
