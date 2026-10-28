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
    { id: 'tasks' as NavTab, label: 'Tugas', icon: CheckSquare, badge: pendingTasksCount > 0 ? pendingTasksCount : null },
    { id: 'finance' as NavTab, label: 'Keuangan', icon: Wallet },
    { id: 'files' as NavTab, label: 'File', icon: FolderArchive },
    { id: 'wishlist' as NavTab, label: 'Wishlist', icon: Heart },
  ];

  return (
    <nav
      aria-label="Navigasi utama"
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)] ${
        isDark ? 'bg-[#0A0A0B]/92 border-[#26272B]' : 'bg-white/95 border-zinc-200'
      }`}
    >
      {/* Five equal columns: icons and labels line up on every phone width. */}
      <ul className="grid grid-cols-5 h-16 max-w-xl mx-auto px-1 list-none m-0 p-0">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <li key={item.id} className="flex">
              <button
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer select-none ${
                  isActive
                    ? isDark ? 'text-white' : 'text-zinc-950'
                    : isDark ? 'text-zinc-400 active:text-zinc-200' : 'text-zinc-500 active:text-zinc-800'
                }`}
              >
                <span
                  className={`relative flex items-center justify-center h-7 w-12 rounded-full transition-colors ${
                    isActive ? (isDark ? 'bg-[#172A5C]' : 'bg-blue-100') : ''
                  }`}
                >
                  <Icon className={`!w-[22px] !h-[22px] ${isActive ? 'text-lime-400' : ''}`} strokeWidth={isActive ? 2.1 : 1.75} />
                  {item.badge ? (
                    <span className="absolute -top-0.5 right-1 min-w-4 h-4 px-1 rounded-full bg-lime-600 text-white text-[11px] leading-4 font-semibold text-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </span>
                <span className={`text-[11px] leading-none tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
