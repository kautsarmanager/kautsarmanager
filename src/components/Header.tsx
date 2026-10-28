import React, { useState } from 'react';
import { Search, Menu, Plus, Calendar, Sun, Moon, Bell, Lock } from 'lucide-react';
import { UserProfile, Task, UserAccount } from '../types';
import { notificationService } from '../services/notificationService';
import { NotificationPanel } from './NotificationPanel';
import { PWAInstallButton } from './PWAInstallButton';
import { formatDateInUserTimezone } from '../utils/preferences';

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

  const todayFormatted = formatDateInUserTimezone(new Date(), { day: 'numeric', month: 'short', year: 'numeric' });

  const counts = notificationService.getUrgentCounts(tasks);

  const iconBtn = `inline-flex items-center justify-center h-10 w-10 sm:h-9 sm:w-9 shrink-0 rounded-lg border cursor-pointer ${
    isDark
      ? 'bg-[#1A1B1E] border-[#26272B] text-zinc-400 hover:text-zinc-100 hover:bg-[#1F2024]'
      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
  }`;

  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 backdrop-blur-xl border-b h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] ${
        isDark ? 'bg-[#0A0A0B]/88 border-[#26272B]' : 'bg-white/90 border-zinc-200'
      }`}
    >
      {/* Left: menu + search (search stretches on phones, fixed width on larger screens) */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button type="button" onClick={onOpenMobileMenu} className={`${iconBtn} md:hidden`} aria-label="Buka menu">
          <Menu className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Cari"
          className={`flex items-center gap-2 h-10 sm:h-9 px-3 flex-1 sm:flex-none sm:w-60 md:w-72 min-w-0 rounded-lg border text-sm sm:text-xs text-left cursor-pointer ${
            isDark
              ? 'bg-[#1A1B1E] border-[#26272B] text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
          }`}
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1 truncate">Cari apa saja...</span>
          <kbd
            className={`hidden md:inline-block px-1.5 py-0.5 text-[11px] rounded border ${
              isDark ? 'bg-[#111113] text-zinc-400 border-[#26272B]' : 'bg-zinc-200 text-zinc-600 border-zinc-300'
            }`}
          >
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: actions. Secondary ones move into the side menu on phones. */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden md:block"><PWAInstallButton isDark={isDark} /></div>

        <div className={`hidden lg:flex items-center gap-1.5 text-xs mr-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          <Calendar className="w-4 h-4" />
          <span className="tabular-nums whitespace-nowrap">{todayFormatted}</span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationOpen((prev) => !prev)}
            className={`${iconBtn} relative ${
              notificationOpen ? (isDark ? '!border-lime-500/60 !text-lime-400' : '!border-lime-300 !text-lime-600') : ''
            }`}
            title={`Notifikasi Deadline (${counts.total} tugas)`}
            aria-label="Notifikasi deadline"
          >
            <Bell className="w-4 h-4" />
            {counts.total > 0 && (
              <span
                className={`absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[11px] leading-none font-semibold rounded-full text-white ${
                  counts.overdue > 0 ? 'bg-rose-500' : counts.today > 0 ? 'bg-amber-500' : 'bg-lime-600'
                }`}
              >
                {counts.total > 9 ? '9+' : counts.total}
              </span>
            )}
          </button>

          <NotificationPanel
            isOpen={notificationOpen}
            onClose={() => setNotificationOpen(false)}
            tasks={tasks}
            isDark={isDark}
            onNavigateToTasks={onNavigateToTasks}
            onShowToast={onShowToast}
          />
        </div>

        {onLockApp && (
          <button type="button" onClick={onLockApp} className={`${iconBtn} hidden sm:inline-flex`} title="Kunci aplikasi dengan PIN" aria-label="Kunci aplikasi">
            <Lock className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleTheme}
          className={`${iconBtn} hidden sm:inline-flex`}
          title={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
          aria-label="Ganti tema"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onQuickAdd}
          aria-label="Tambah tugas"
          className="inline-flex items-center justify-center gap-1.5 h-10 w-10 sm:h-9 sm:w-auto sm:px-3.5 shrink-0 text-sm sm:text-xs font-semibold rounded-lg bg-lime-600 hover:bg-lime-500 text-white active:scale-[0.97] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah Tugas</span>
        </button>
      </div>
    </header>
  );
};
