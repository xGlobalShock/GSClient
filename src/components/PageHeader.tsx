import React from 'react';
import { motion } from 'framer-motion';
import '../styles/PageHeader.css';

export interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  /** Optional small stat element shown after the line (e.g. "3/7 Active") */
  stat?: React.ReactNode;
  /** Optional action buttons rendered on the far right */
  actions?: React.ReactNode;
  /** Optional element rendered INSIDE the header — centered absolutely */
  lineContent?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, stat, actions, lineContent }) => (
  <motion.div
    className="ph-root"
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
  >
    <h2 className="ph-title">{title}</h2>
    <span className="ph-dot" aria-hidden="true" />
    <div className="ph-spacer" aria-hidden="true" />
    {stat    && <div className="ph-stat">{stat}</div>}
    {actions && <div className="ph-actions">{actions}</div>}
    {lineContent && <div className="ph-badge-center">{lineContent}</div>}
  </motion.div>
);

export default PageHeader;
