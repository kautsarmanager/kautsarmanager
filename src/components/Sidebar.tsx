import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
  FolderArchive,
  Heart,
  Bot,
  Settings,
  X,
  Lock,
  LogOut,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile, DashboardSummary, UserAccount } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

export type NavTab = 'dashboard' | 'tasks' | 'finance' | 'files' | 'wishlist' | 'ai' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  profile: UserProfile;
  summary: DashboardSummary;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isDark: boolean;
  currentUser?: UserAccount | null;
  onLockApp?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  profile,
  summary,
  mobileOpen,
  onCloseMobile,
  isDark,
  currentUser,
  onLockApp,
  onLogout,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'tasks' as NavTab,
      label: 'Tugas',
      icon: CheckSquare,
      badge: summary.pending_tasks_count > 0 ? summary.pending_tasks_count : null,
    },
    {
      id: 'finance' as NavTab,
      label: 'Finance',
      icon: Wallet,
      badge: null,
    },
    {
      id: 'files' as NavTab,
      label: 'Files',
      icon: FolderArchive,
      badge: summary.files_count > 0 ? summary.files_count : null,
    },
    {
      id: 'wishlist' as NavTab,
      label: 'Wishlist',
      icon: Heart,
      badge: `${summary.wishlist_progress_average}%`,
    },
    {
      id: 'ai' as NavTab,
      label: 'AI Assistant',
      icon: Bot,
      badge: null,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-60 border-r transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDark
            ? 'bg-[#171717] border-[#424242] text-zinc-300'
            : 'bg-white border-zinc-200 text-zinc-700 shadow-2xs'
        }`}
      >
        {/* Workspace Brand (Linear / Raycast Style) */}
        <div
          className={`flex items-center justify-between px-4 h-14 border-b ${
            isDark ? 'border-[#424242]' : 'border-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs tracking-wider border shadow-xs ${
                isDark
                  ? 'bg-[#2f2f2f] border-[#424242] text-lime-400'
                  : 'bg-lime-50 border-lime-200 text-lime-600'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className={`text-xs font-semibold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Manager
              </span>
              <span className="block text-[10px] text-zinc-500 font-mono leading-none">v1.2</span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className={`md:hidden p-1 rounded-md ${
              isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-black'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-[#1c1d26] text-white font-semibold shadow-xs'
                      : 'bg-zinc-100 text-zinc-950 font-semibold'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-[#16171e]'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-lime-400'
                        : isDark
                        ? 'text-zinc-500'
                        : 'text-zinc-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                      isActive
                        ? isDark
                          ? 'bg-lime-500/20 text-lime-300'
                          : 'bg-lime-100 text-lime-700'
                        : isDark
                        ? 'bg-[#2f2f2f] text-zinc-500'
                        : 'bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Minimal User Profile, PWA, & System Status */}
        <div
          className={`p-3 border-t space-y-2.5 ${
            isDark ? 'border-[#424242] bg-[#0c0d11]' : 'border-zinc-200 bg-zinc-50'
          }`}
        >
          {/* PWA Mobile App Install Button */}
          <div className="w-full">
            <PWAInstallButton isDark={isDark} />
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border shrink-0 ${
                  isDark
                    ? 'bg-[#181922] border-[#292b38] text-lime-400'
                    : 'bg-white border-zinc-300 text-lime-600'
                }`}
              >
                {(currentUser?.username || profile.name).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {currentUser ? currentUser.username : profile.name}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">Akun aktif</span>
                </div>
              </div>
            </div>

            {/* Quick Actions: Lock App and Logout */}
            <div className="flex items-center gap-1 shrink-0">
              {onLockApp && (
                <button
                  type="button"
                  onClick={onLockApp}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'text-zinc-400 hover:text-white hover:bg-[#2f2f2f]' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
                  }`}
                  title="Kunci Aplikasi dengan PIN"
                  aria-label="Kunci aplikasi"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'text-zinc-400 hover:text-rose-400 hover:bg-[#2f2f2f]' : 'text-zinc-500 hover:text-rose-600 hover:bg-zinc-200'
                  }`}
                  title="Keluar Akun"
                  aria-label="Keluar akun"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
