import React, { useState } from 'react';
import { Crown, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UpgradeModal from './UpgradeModal';
import '../styles/ProLineBadge.css';

interface ProLineBadgeProps {
  pageName?: string;
}

const ProLineBadge: React.FC<ProLineBadgeProps> = ({ pageName }) => {
  const { isPro } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (isPro) return null;

  return (
    <>
      <button className="pro-line-badge" onClick={() => setShowUpgrade(true)} title="Upgrade to PRO">
        {/* Ambient glow layer */}
        <span className="pro-line-badge-glow" />
        {/* Shimmer sweep */}
        <span className="pro-line-badge-shimmer" />

        {/* Left chip: Crown + PRO */}
        <span className="pro-line-badge-chip">
          <Crown size={10} className="pro-line-badge-crown" />
          <span className="pro-line-badge-pro">PRO</span>
        </span>

        {/* Separator */}
        <span className="pro-line-badge-sep" />

        {/* Right: call to action */}
        <span className="pro-line-badge-cta">
          <span className="pro-line-badge-action">Upgrade</span>
          <ArrowRight size={9} className="pro-line-badge-arrow" />
        </span>
      </button>
      {showUpgrade && (
        <UpgradeModal
          featureName={pageName}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
};

export default ProLineBadge;
