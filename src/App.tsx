/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { TasksView } from './components/TasksView';
import { FinanceView } from './components/FinanceView';
import { FilesView } from './components/FilesView';
import { WishlistView } from './components/WishlistView';
import { SettingsView } from './components/SettingsView';
import { AiAssistantView } from './components/AiAssistantView';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { AuthScreen } from './components/AuthScreen';
import { AppLockScreen } from './components/AppLockScreen';
import { dataService } from './services/dataService';
import { notificationService } from './services/notificationService';
import { authService } from './services/authService';
import {
  UserProfile,
  DashboardSummary,
  Task,
  Transaction,
  FileItem,
  WishlistItem,
  ActivityItem,
  UserAccount,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      const saved = sessionStorage.getItem('kautsarmanager_active_tab');
      const validTabs: NavTab[] = ['dashboard', 'tasks', 'finance', 'files', 'wishlist', 'ai', 'settings'];
      return saved && validTabs.includes(saved as NavTab) ? (saved as NavTab) : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => { try { return localStorage.getItem('manager_sidebar_collapsed') === 'true'; } catch { return false; } });
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [initialTaskModalOpen, setInitialTaskModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Auth & Session state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => authService.getCurrentUser());
  const [authInitializing, setAuthInitializing] = useState(true);
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => authService.isAppLocked());

  // Central state synced with DataService
  const [profile, setProfile] = useState<UserProfile>(dataService.getProfile());
  const [summary, setSummary] = useState<DashboardSummary>(dataService.getDashboardSummary());
  const [tasks, setTasks] = useState<Task[]>(dataService.getTasks());
  const [transactions, setTransactions] = useState<Transaction[]>(dataService.getTransactions());
  const [files, setFiles] = useState<FileItem[]>(dataService.getFiles());
  const [wishlist, setWishlist] = useState<WishlistItem[]>(dataService.getWishlist());
  const [activities, setActivities] = useState<ActivityItem[]>(dataService.getActivities());

  const isDark = profile.theme !== 'light';

  useEffect(() => { try { localStorage.setItem('manager_sidebar_collapsed', String(sidebarCollapsed)); } catch {} }, [sidebarCollapsed]);

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    dataService.updateProfile({ theme: next });
  };

  const showToast = (title: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `t-${Date.now()}`;
    setToasts((prev) => [...prev, { id, title, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Restore the Supabase session before rendering the login screen.
  useEffect(() => {
    let mounted = true;
    authService.initialize().catch((error) => { console.error('Session restore failed:', error); }).finally(() => { if (mounted) setAuthInitializing(false); });
    const unsub = authService.subscribe(() => {
      const user = authService.getCurrentUser();
      dataService.setActiveUser(user);
      setCurrentUser(user);
      setIsAppLocked(authService.isAppLocked());
    });
    return () => { mounted = false; unsub(); };
  }, []);

  // Keep the current section when the user refreshes the page (F5).
  useEffect(() => {
    try {
      sessionStorage.setItem('kautsarmanager_active_tab', activeTab);
    } catch {
      // Session storage may be unavailable in restricted browser contexts.
    }
  }, [activeTab]);

  // Subscribe to changes from DataService
  useEffect(() => {
    const refreshData = () => {
      setProfile(dataService.getProfile());
      setSummary(dataService.getDashboardSummary());
      setTasks(dataService.getTasks());
      setTransactions(dataService.getTransactions());
      setFiles(dataService.getFiles());
      setWishlist(dataService.getWishlist());
      setActivities(dataService.getActivities());
    };

    const unsubscribe = dataService.subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  // Periodic deadline reminder check
  useEffect(() => {
    if (tasks.length === 0) return;

    // Check on startup and interval
    const checkDeadlines = () => {
      notificationService.checkAndTriggerScheduledDeadlines(tasks);
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tasks]);

  // Shortcut ⌘K / Ctrl+K for Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleQuickAddTask = () => {
    setActiveTab('tasks');
    setInitialTaskModalOpen(true);
  };

  const handleQuickAddTransaction = () => {
    setActiveTab('finance');
  };

  // Avoid flashing the login screen while the saved cloud session is restored.
  if (authInitializing) {
    return <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#212121] text-zinc-300' : 'bg-[#F7F7F8] text-zinc-700'}`}><div className="text-sm">Memulihkan sesi akun...</div></div>;
  }

  // If no active session, show authentication screen.
  if (!currentUser) {
    return (
      <>
        <AuthScreen
          onAuthSuccess={(u) => {
            dataService.setActiveUser(u);
            setCurrentUser(u);
            setIsAppLocked(false);
          }}
          isDark={isDark}
          onShowToast={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} isDark={isDark} />
      </>
    );
  }

  // If application is locked by user PIN
  if (isAppLocked) {
    return (
      <>
        <AppLockScreen
          currentUser={currentUser}
          onUnlocked={() => {
            authService.unlockAppWithoutPin();
            setIsAppLocked(false);
          }}
          onLogout={() => {
            if (!window.confirm('Keluar dari akun sekarang?')) return;
            void authService.logout();
            setCurrentUser(null);
          }}
          isDark={isDark}
          onShowToast={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} isDark={isDark} />
      </>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-150 antialiased ${
        isDark ? 'bg-[#212121] text-zinc-200' : 'bg-[#F7F7F8] text-zinc-900'
      }`}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setInitialTaskModalOpen(false);
        }}
        profile={profile}
        summary={summary}
        mobileOpen={mobileMenuOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onCloseMobile={() => setMobileMenuOpen(false)}
        isDark={isDark}
        currentUser={currentUser}
        onLockApp={() => authService.lockApp()}
        onLogout={() => { if (window.confirm('Keluar dari akun sekarang?')) void authService.logout(); }}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 pb-16 md:pb-0 transition-[padding] duration-200 ${sidebarCollapsed ? 'md:pl-[68px]' : 'md:pl-[248px]'}`}>
        <Header
          profile={profile}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickAdd={handleQuickAddTask}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          tasks={tasks}
          onNavigateToTasks={() => setActiveTab('tasks')}
          onShowToast={showToast}
          currentUser={currentUser}
          onLockApp={() => authService.lockApp()}
        />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              profile={profile}
              username={currentUser.username}
              summary={summary}
              tasks={tasks}
              transactions={transactions}
              files={files}
              wishlist={wishlist}
              activities={activities}
              onNavigate={(tab) => setActiveTab(tab)}
              onAddTask={handleQuickAddTask}
              onAddTransaction={handleQuickAddTransaction}
              isDark={isDark}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              initialCreateOpen={initialTaskModalOpen}
              isDark={isDark}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'finance' && (
            <FinanceView
              transactions={transactions}
              isDark={isDark}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'files' && (
            <FilesView
              files={files}
              isDark={isDark}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'wishlist' && (
            <WishlistView
              wishlist={wishlist}
              isDark={isDark}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'ai' && <AiAssistantView isDark={isDark} />}

          {activeTab === 'settings' && (
            <SettingsView
              profile={profile}
              currentUser={currentUser}
              onLogout={() => { if (window.confirm('Keluar dari akun sekarang?')) void authService.logout(); }}
            />
          )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setInitialTaskModalOpen(false);
        }}
        pendingTasksCount={summary.pending_tasks_count}
        isDark={isDark}
      />

      {/* Cross-App Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        isDark={isDark}
      />

      {/* Toast Feedback */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        isDark={isDark}
      />
    </div>
  );
}
