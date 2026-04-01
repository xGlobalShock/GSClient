import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import '../styles/Toast.css';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  const iconByType = {
    success: <CheckCircle2 size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map(toast => {
          const isRaw = React.isValidElement(toast.message) && !!(toast.message.props?.toastKey);
          const cls = isRaw ? 'toast toast-raw' : `toast toast-${toast.type}`;

          return (
            <motion.div
              key={toast.id}
              className={cls}
              initial={isRaw ? { opacity: 0 } : { opacity: 0, x: 32, scale: 0.95 }}
              animate={isRaw ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
              exit={isRaw ? { opacity: 0 } : { opacity: 0, x: 32, scale: 0.95 }}
              transition={{ duration: isRaw ? 0.15 : 0.2 }}
            >
              {isRaw ? (
                // render the element directly for full-overlay toasts
                toast.message
              ) : (
                <>
                  <div className="toast-content">
                    <span className="toast-icon">{iconByType[toast.type]}</span>
                    <p className="toast-message">{toast.message}</p>
                  </div>
                  <button className="toast-close" onClick={() => removeToast(toast.id)}>
                    ×
                  </button>
                </>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
