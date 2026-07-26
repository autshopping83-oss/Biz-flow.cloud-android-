// src/components/AppShell.tsx
// Layout principal com BottomNavigation para Android

import React from 'react';
import { BottomNav, type NavTab } from './BottomNav';

interface AppShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isConnected: boolean;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps & { t: (key: string) => string }> = ({
  activeTab,
  onTabChange,
  isConnected,
  t,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <div className="pb-20">
        {children}
      </div>
      <BottomNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        isConnected={isConnected}
        t={t}
      />
    </div>
  );
};
