import React from 'react';
import { CheckCircle, ArrowCounterClockwise } from 'phosphor-react';
import '../styles/PerformanceTweakCard.css';

interface PerformanceTweakCardProps {
  id: string;
  title: string;
  icon: any;
  category: string;
  description: string;
  buttonText: string;
  color: string;
  onApply: (id: string) => Promise<void>;
  onReset?: (id: string) => Promise<void>;
  isLoading?: boolean;
  isEnabled?: boolean;
}

const PerformanceTweakCard: React.FC<PerformanceTweakCardProps> = ({
  id,
  title,
  icon,
  category,
  description,
  buttonText,
  color,
  onApply,
  onReset,
  isLoading = false,
  isEnabled = false,
}) => {
  const handleClick = async () => {
    try {
      await onApply(id);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleReset = async () => {
    try {
      if (onReset) {
        await onReset(id);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Show Apply button if not enabled, or if Win32 Priority is at default (value 2)
  const showApplyButton = !isEnabled;

  return (
    <div className="tweak-card" style={{ borderColor: color }}>
      <div className="tweak-header">
        <div className="tweak-title-section">
          <h3 className="tweak-title">{title}</h3>
          <p className="tweak-category">{category}</p>
        </div>
        {typeof icon === 'string' ? (
          <img src={icon} alt={title} className="tweak-icon" style={{ width: 28, height: 28, color }} />
        ) : (
          React.createElement(icon, { size: 28, color, className: 'tweak-icon' })
        )}
      </div>

      <p className="tweak-description">{description}</p>

      <div className="tweak-footer">
        {showApplyButton ? (
          <button
            className="tweak-button tweak-button-apply"
            style={{ backgroundColor: '#27ae60', color: '#fff' }}
            onClick={handleClick}
            disabled={isLoading}
          >
            <CheckCircle size={16} weight="bold" className="button-icon" />
            {isLoading ? 'Applying...' : buttonText}
          </button>
        ) : (
          <button
            className="tweak-button tweak-button-reset"
            style={{ backgroundColor: '#FFD600', color: '#222' }}
            onClick={handleReset}
            disabled={isLoading}
          >
            <ArrowCounterClockwise size={16} weight="bold" className="button-icon" />
            {isLoading ? 'Resetting...' : 'Reset to Default'}
          </button>
        )}
        <div className={`tweak-status ${isEnabled ? 'enabled' : 'disabled'}`}>
          <span className="status-dot"></span>
          <span className="status-text">{isEnabled ? 'Applied' : 'Not Applied'}</span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTweakCard;
