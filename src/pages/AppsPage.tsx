import React, { useState, useCallback } from 'react';
import AppInstaller from './AppInstaller';
import AppUninstaller from './AppUninstaller';
import WindowsDebloat from './WindowsDebloat';
import '../styles/AppsPage.css';

interface AppsPageProps {
  isActive?: boolean;
}

type Tab = 'install' | 'uninstall' | 'debloat';

const AppsPage: React.FC<AppsPageProps> = ({ isActive = false }) => {
  const [activeTab, setActiveTab] = useState<Tab>('install');
  const [installRefresh, setInstallRefresh] = useState(0);
  const [uninstallRefresh, setUninstallRefresh] = useState(0);

  const onAppInstalled = useCallback(() => setUninstallRefresh(n => n + 1), []);
  const onAppUninstalled = useCallback(() => setInstallRefresh(n => n + 1), []);

  return (
    <div className="apps-page">
      {/* Keep all mounted so state isn't reset on tab switch */}
      <div className={`apps-tab-content${activeTab === 'install' ? ' apps-tab-content--visible' : ''}`}>
        <AppInstaller isActive={isActive && activeTab === 'install'} activeTab={activeTab} onTabChange={setActiveTab} refreshSignal={installRefresh} onAppInstalled={onAppInstalled} />
      </div>
      <div className={`apps-tab-content${activeTab === 'uninstall' ? ' apps-tab-content--visible' : ''}`}>
        <AppUninstaller isActive={isActive && activeTab === 'uninstall'} activeTab={activeTab} onTabChange={setActiveTab} refreshSignal={uninstallRefresh} onAppUninstalled={onAppUninstalled} />
      </div>
      <div className={`apps-tab-content${activeTab === 'debloat' ? ' apps-tab-content--visible' : ''}`}>
        <WindowsDebloat isActive={isActive && activeTab === 'debloat'} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default AppsPage;
