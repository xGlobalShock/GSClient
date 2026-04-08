import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, Zap, Shield, X, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import '../styles/ProLock.css';

const UPGRADE_BENEFITS = [
  { icon: <Zap size={15} />,      text: 'Advanced system optimizations & tweaks' },
  { icon: <Sparkles size={15} />, text: 'Game library with auto-config tools' },
  { icon: <Shield size={15} />,   text: 'Batch software updates & app management' },
  { icon: <Crown size={15} />,    text: 'Full access to all current & future features' },
];

interface UpgradeModalProps {
  featureName?: string;
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ featureName, onClose }) => {
  const { user, login, refreshProfile } = useAuth();
  const [loginLoading, setLoginLoading] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleLogin = async (provider: 'discord' | 'twitch') => {
    setLoginLoading(provider);
    try {
      await login(provider);
    } finally {
      setLoginLoading(null);
    }
  };

  const handlePayPalCheckout = async () => {
    if (!user) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-paypal-order',
        { body: { user_id: user.id } }
      );
      if (orderError || !orderData?.approval_url) {
        let msg = orderError?.message || 'Failed to create payment order';
        try {
          const body = await (orderError as any)?.context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      const result = await (window as any).electron.ipcRenderer.invoke('paypal:checkout', {
        approval_url: orderData.approval_url,
        order_id: orderData.order_id,
      });
      if (result?.cancelled) {
        setCheckoutLoading(false);
        return;
      }
      if (!result?.order_id) {
        throw new Error('No order ID returned from PayPal');
      }
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'verify-payment',
        { body: { user_id: user.id, transaction_id: result.order_id } }
      );
      if (verifyError || !verifyData?.success) {
        throw new Error(verifyError?.message || 'Payment verification failed');
      }
      await refreshProfile();
      onClose();
    } catch (err: any) {
      setCheckoutError(err?.message || 'Payment failed. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const modal = (
    <AnimatePresence>
      <div className="upgrade-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div
          className="upgrade-modal"
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <button className="upgrade-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>

          <div className="upgrade-header">
            <div className="upgrade-icon-wrap">
              <Crown size={24} />
            </div>
            <h2 className="upgrade-title">Unlock PRO Features</h2>
            {featureName && (
              <p className="upgrade-feature-name">
                <strong>{featureName}</strong> requires a Pro subscription
              </p>
            )}
          </div>

          <div className="upgrade-benefits">
            {UPGRADE_BENEFITS.map((b) => (
              <div key={b.text} className="upgrade-benefit">
                <span className="upgrade-benefit-icon">{b.icon}</span>
                <span className="upgrade-benefit-text">{b.text}</span>
              </div>
            ))}
          </div>

          {!user ? (
            <div className="upgrade-actions">
              <p className="upgrade-note">Sign in to purchase a PRO subscription</p>
              <button
                className="upgrade-btn upgrade-btn-discord"
                onClick={() => handleLogin('discord')}
                disabled={!!loginLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                {loginLoading === 'discord' ? 'Connecting…' : 'Sign in with Discord'}
              </button>
              <button
                className="upgrade-btn upgrade-btn-twitch"
                onClick={() => handleLogin('twitch')}
                disabled={!!loginLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                </svg>
                {loginLoading === 'twitch' ? 'Connecting…' : 'Sign in with Twitch'}
              </button>
            </div>
          ) : (
            <div className="upgrade-actions">
              {checkoutError && (
                <p className="upgrade-error">{checkoutError}</p>
              )}
              <button
                className="upgrade-btn upgrade-btn-primary"
                onClick={handlePayPalCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading
                  ? <><Loader2 size={15} className="upgrade-spin" /> Processing…</>
                  : <><Crown size={16} /> Upgrade to Pro — $4.99</>
                }
              </button>
              <button
                className="upgrade-btn upgrade-btn-secondary"
                onClick={onClose}
                disabled={checkoutLoading}
              >
                Maybe Later
              </button>
              <p className="upgrade-note">
                Secure checkout via PayPal · Pro activates instantly
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
  return ReactDOM.createPortal(modal, document.body);
};

export default UpgradeModal;
