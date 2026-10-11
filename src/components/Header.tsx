import React, { useState } from 'react';
import { Search, Menu, Plus, Calendar, Sun, Moon, Bell, Lock } from 'lucide-react';
import { UserProfile, Task, UserAccount } from '../types';
import { notificationService } from '../services/notificationService';
import { NotificationPanel } from './NotificationPanel';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenMobileMenu: () => void;
  onQuickAdd: () => void;
  profile: UserProfile;
  isDark: boolean;
  onToggleTheme: () => void;
  tasks: Task[];
  onNavigateToTasks: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
  currentUser?: UserAccount | null;
  onLockApp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenMobileMenu,
  onQuickAdd,
  profile,
  isDark,
  onToggleTheme,
  tasks,
  onNavigateToTasks,
  onShowToast,
  currentUser,
  onLockApp,
}) => {
  const [notificationOpen, setNotificationOpen] = useState(false);

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const counts = notificationService.getUrgentCounts(tasks);

  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 backdrop-blur-md border-b transition-colors relative ${
        isDark
          ? 'bg-[#0e0f13]/85 border-[#1f212a]'
          : 'bg-white/90 border-zinc-200 shadow-2xs'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenMobileMenu}
          className={`md:hidden p-1.5 rounded-lg transition-colors ${
            isDark ? 'text-zinc-400 hover:text-white hover:bg-[#181920]' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
          aria-label="Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Global Search Bar (Raycast / Linear style) */}
        <button
          onClick={onOpenSearch}
          className={`flex items-center gap-2 px-2.5 py-1.5 w-44 sm:w-60 md:w-72 rounded-lg border text-xs text-left cursor-pointer transition-all ${
            isDark
              ? 'bg-[#14151b] border-[#222430] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="flex-1 truncate">Cari apa saja...</span>
          <kbd
            className={`hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded border ${
              isDark
                ? 'bg-[#191a22] text-zinc-400 border-[#272935]'
                : 'bg-zinc-200 text-zinc-600 border-zinc-300'
            }`}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* PWA Install Button */}
        <PWAInstallButton isDark={isDark} />

        <div
          className={`hidden sm:flex items-center gap-1.5 text-xs font-mono ${
            isDark ? 'text-zinc-500' : 'text-zinc-500'
          }`}
        >
          <Calendar className="w-3 h-3 text-zinc-500" />
          <span>{todayFormatted}</span>
        </div>

        {/* Notification Bell Button with Urgency Counter */}
        <div className="relative">
          <button
            onClick={() => setNotificationOpen((prev) => !prev)}
            className={`relative p-1.5 rounded-lg border transition-colors cursor-pointer ${
              notificationOpen
                ? isDark
                  ? 'bg-[#1f202c] border-indigo-500/50 text-indigo-400'
                  : 'bg-indigo-50 border-indigo-300 text-indigo-600'
                : isDark
                ? 'bg-[#14151b] border-[#222430] text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1d26]'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
            title={`Notifikasi Deadline (${counts.total} tugas)`}
            aria-label="Notifikasi deadline"
          >
            <Bell className="w-3.5 h-3.5" />

            {/* Notification Badge */}
            {counts.total > 0 && (
              <span
                className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9px] font-bold font-mono rounded-full text-white ${
                  counts.overdue > 0
                    ? 'bg-rose-500 animate-pulse'
                    : counts.today > 0
                    ? 'bg-amber-500'
                    : 'bg-indigo-600'
                }`}
              >
                {counts.total > 9 ? '9+' : counts.total}
              </span>
            )}
          </button>

          {/* Floating Dropdown / Popover */}
          <NotificationPanel
            isOpen={notificationOpen}
            onClose={() => setNotificationOpen(false)}
            tasks={tasks}
            isDark={isDark}
            onNavigateToTasks={onNavigateToTasks}
            onShowToast={onShowToast}
          />
        </div>

        {/* Quick Lock Screen Button */}
        {onLockApp && (
          <button
            onClick={onLockApp}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#14151b] border-[#222430] text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1d26]'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
            title="Kunci Aplikasi dengan PIN"
            aria-label="Kunci aplikasi"
          >
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        )}

        {/* Minimal Theme Switcher */}
        <button
          onClick={onToggleTheme}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isDark
              ? 'bg-[#14151b] border-[#222430] text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1d26]'
              : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
          title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          aria-label="Toggle tema"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Primary Action Button */}
        <button
          onClick={onQuickAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs shadow-indigo-600/30 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Task</span>
        </button>
      </div>
    </header>
  );
};
