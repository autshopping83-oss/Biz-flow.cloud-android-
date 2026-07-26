// src/components/BottomNav.tsx
// Bottom Navigation no estilo Android para navegação principal

import React from 'react';

export type NavTab = 'home' | 'history' | 'finance' | 'more';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isConnected: boolean;
  t: (key: string) => string;
}

interface TabItem {
  key: NavTab;
  icon: string;
  labelKey: string;
}

const tabs: TabItem[] = [
  { key: 'home', icon: 'fa-house', labelKey: 'home' },
  { key: 'history', icon: 'fa-clock-rotate-left', labelKey: 'documents' },
  { key: 'finance', icon: 'fa-chart-pie', labelKey: 'finance' },
  { key: 'more', icon: 'fa-ellipsis-h', labelKey: 'more' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, t }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-lg"
         style={{ paddingBottom: 'var(--safe-area-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors relative ${
              activeTab === tab.key
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {activeTab === tab.key && (
              <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
            <i className={`fa-solid ${tab.icon} text-lg ${activeTab === tab.key ? 'scale-110' : ''}`} />
            <span className={`text-[10px] font-semibold tracking-tight ${activeTab === tab.key ? 'font-bold' : ''}`}>
              {t(tab.labelKey)}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};
