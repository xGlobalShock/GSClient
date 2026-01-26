import React from 'react';
import '../styles/Loader.css';

const Loader: React.FC = () => (
  <div className="loader-overlay">
    <div className="loader-spinner"></div>
    <span className="loader-text">Loading...</span>
  </div>
);

export default Loader;
