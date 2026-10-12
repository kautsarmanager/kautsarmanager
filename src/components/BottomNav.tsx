import React from 'react';
import { LayoutDashboard, CheckSquare, Wallet, FolderArchive, Heart } from 'lucide-react';
import { NavTab } from './Sidebar';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingTasksCount: number;
  isDark: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  pendingTasksCount,
  isDark,
}) => {
  const items = [
    { id: 'dashboard' as NavTab, label: 'Home', icon: LayoutDashboard },
    {
      id: 'tasks' as NavTab,
      label: 'Tasks',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : null,
    },
    { id: 'finance' as NavTab, label: 'Finance', icon: Wallet },
    { id: 'files' as NavTab, label: 'Files', icon: FolderArchive },
    { id: 'wishlist' as NavTab, label: 'Wishlist', icon: Heart },
  ];

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 px-1.5 flex items-center justify-around border-t backdrop-blur-md transition-colors ${
        isDark
          ? 'bg-[#101116]/95 border-[#1f212a] text-zinc-400'
          : 'bg-white/95 border-zinc-200 text-zinc-500 shadow-lg'
      }`}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
              isActive
                ? isDark
                  ? 'text-white'
                  : 'text-zinc-950 font-medium'
                : isDark
                ? 'text-zinc-500 hover:text-zinc-300'
                : 'text-zinc-400 hover:text-zinc-700'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-4 h-4 transition-transform ${
                  isActive ? 'scale-110 text-lime-400' : 'scale-100'
                }`}
              />
              {item.badge && (
                <span className="absolute -top-1 -right-2 bg-lime-600 text-white font-mono text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-medium' : ''}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
