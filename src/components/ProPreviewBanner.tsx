import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UpgradeModal from './UpgradeModal';
import '../styles/ProLock.css';

interface ProPreviewBannerProps {
  pageName?: string;
}

const ProPreviewBanner: React.FC<ProPreviewBannerProps> = ({ pageName }) => {
  const { isPro, user } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Only hide for PRO/owner — show for both free and logged-out users
  if (isPro) return null;

  const isLoggedIn = !!user;

  return (
    <>
      <div className="pro-preview-banner">
        <Crown size={14} className="pro-preview-banner-icon" />
        <span className="pro-preview-banner-text">
          {isLoggedIn
            ? <><strong>{pageName || 'This feature'}</strong> requires a PRO subscription — $4.99 / 30 days</>
            : <><strong>{pageName || 'This feature'}</strong> requires a PRO subscription</>
          }
        </span>
        <button className="pro-preview-banner-btn" onClick={() => setShowUpgrade(true)}>
          Upgrade to PRO
        </button>
      </div>
      {showUpgrade && (
        <UpgradeModal
          featureName={pageName}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
};

export default ProPreviewBanner;
