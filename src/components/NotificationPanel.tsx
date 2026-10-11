import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  Volume2,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Task } from '../types';
import {
  notificationService,
  TaskDeadlineNotification,
  DeadlineUrgency,
} from '../services/notificationService';
import { dataService } from '../services/dataService';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  isDark: boolean;
  onNavigateToTasks: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  tasks,
  isDark,
  onNavigateToTasks,
  onShowToast,
}) => {
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'soon'>('all');
  const [permission, setPermission] = useState<NotificationPermission>(
    notificationService.getPermissionStatus()
  );
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const notifications = notificationService.getNotifications(tasks);
  const counts = notificationService.getUrgentCounts(tasks);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'overdue') return n.urgency === 'overdue';
    if (filter === 'today') return n.urgency === 'today';
    if (filter === 'soon') return n.urgency === 'tomorrow' || n.urgency === 'soon';
    return true;
  });

  const handleRequestPermission = async () => {
    const res = await notificationService.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      notificationService.playChime('regular');
      notificationService.sendBrowserNotification(
        'Notifikasi Aktif',
        'Anda akan menerima pengingat deadline tugas penting secara otomatis.'
      );
      if (onShowToast) onShowToast('Notifikasi browser berhasil diaktifkan', 'success');
    } else if (res === 'denied') {
      if (onShowToast) onShowToast('Izin notifikasi diblokir di browser Anda', 'error');
    }
  };

  const handleTestSound = () => {
    notificationService.playChime('urgent');
    if (onShowToast) onShowToast('Memutar suara pengingat deadline', 'info');
  };

  const handleCompleteTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    dataService.toggleTaskStatus(task.id);
    notificationService.markAsRead(task.id);
    notificationService.playChime('regular');
    if (onShowToast) {
      onShowToast(`Tugas "${task.title}" berhasil diselesaikan!`, 'success');
    }
  };

  const handleMarkAsRead = (n: TaskDeadlineNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationService.markAsRead(n.id);
    if (onShowToast) onShowToast('Notifikasi ditandai sudah dibaca', 'info');
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead(tasks);
    if (onShowToast) onShowToast('Semua notifikasi ditandai sudah dibaca', 'info');
  };

  const handleItemClick = (task: Task) => {
    notificationService.markAsRead(task.id);
    onClose();
    onNavigateToTasks();
  };

  const renderUrgencyBadge = (urgency: DeadlineUrgency, label: string) => {
    switch (urgency) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case 'today':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case 'tomorrow':
      case 'soon':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{label}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{label}</span>
          </span>
        );
    }
  };

  return (
    <div
      ref={panelRef}
      className={`fixed sm:absolute top-14 right-2 sm:right-4 z-50 w-[calc(100vw-1rem)] sm:w-[420px] max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
        isDark
          ? 'bg-[#121319]/95 border-[#222430] text-zinc-100 shadow-black/60'
          : 'bg-white/95 border-zinc-200 text-zinc-900 shadow-xl'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? 'border-[#1f212c]' : 'border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-tight">Notifikasi Deadline</h3>
            <p className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {counts.total} tugas memiliki deadline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleTestSound}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1d26]'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
            }`}
            title="Tes Suara Pengingat"
            aria-label="Tes suara"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1d26]'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
            }`}
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Browser Notification Banner / Setting */}
      <div
        className={`px-3.5 py-2 text-[11px] border-b flex items-center justify-between gap-2 ${
          isDark ? 'bg-[#151620] border-[#1f212c]' : 'bg-zinc-50 border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck
            className={`w-3.5 h-3.5 shrink-0 ${
              permission === 'granted' ? 'text-emerald-400' : 'text-zinc-400'
            }`}
          />
          <span className="truncate">
            {permission === 'granted'
              ? 'Notifikasi browser aktif'
              : permission === 'denied'
              ? 'Izin browser ditolak'
              : 'Aktifkan notifikasi browser'}
          </span>
        </div>

        {permission !== 'granted' && (
          <button
            onClick={handleRequestPermission}
            className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shrink-0 cursor-pointer"
          >
            Izinkan
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        className={`flex items-center gap-1 p-2 border-b text-xs ${
          isDark ? 'border-[#1f212c] bg-[#0f1015]' : 'border-zinc-200 bg-zinc-50/50'
        }`}
      >
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-medium text-center transition-colors cursor-pointer ${
            filter === 'all'
              ? isDark
                ? 'bg-[#1c1d27] text-white'
                : 'bg-white text-zinc-950 shadow-2xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Semua ({counts.total})
        </button>

        {counts.overdue > 0 && (
          <button
            onClick={() => setFilter('overdue')}
            className={`py-1 px-2 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              filter === 'overdue'
                ? 'bg-rose-500/20 text-rose-300'
                : 'text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            Terlambat ({counts.overdue})
          </button>
        )}

        <button
          onClick={() => setFilter('today')}
          className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-medium text-center transition-colors cursor-pointer ${
            filter === 'today'
              ? isDark
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Hari Ini ({counts.today})
        </button>

        <button
          onClick={() => setFilter('soon')}
          className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-medium text-center transition-colors cursor-pointer ${
            filter === 'soon'
              ? isDark
                ? 'bg-[#1c1d27] text-white'
                : 'bg-white text-zinc-950 shadow-2xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Segera ({counts.soon})
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto max-h-[380px] p-2 space-y-1.5 divide-y-0">
        {filteredNotifications.length === 0 ? (
          <div className="py-10 text-center px-4">
            <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-zinc-300">Semua deadline aman!</p>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Tidak ada tugas mendesak pada filter ini.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            return (
              <div
                key={n.id}
                onClick={() => handleItemClick(n.task)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer group ${
                  n.urgency === 'overdue'
                    ? isDark
                      ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40'
                      : 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                    : n.urgency === 'today'
                    ? isDark
                      ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                      : 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                    : isDark
                    ? 'bg-[#151620] border-[#20222f] hover:border-zinc-700'
                    : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {renderUrgencyBadge(n.urgency, n.urgencyLabel)}
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                          isDark
                            ? 'bg-[#101116] text-zinc-400 border-[#222430]'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        {n.task.category}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-medium truncate ${
                        isDark ? 'text-zinc-100' : 'text-zinc-900'
                      }`}
                    >
                      {n.task.title}
                    </h4>

                    {n.task.description && (
                      <p
                        className={`text-[11px] line-clamp-1 mt-0.5 ${
                          isDark ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        {n.task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        {n.formattedDate}
                      </span>
                      {n.reminderTime && (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Clock className="w-3 h-3" />
                          {n.reminderTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                    <button
                      onClick={(e) => handleCompleteTask(n.task, e)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs active:scale-95 transition-all cursor-pointer"
                      title="Selesaikan tugas sekarang"
                    >
                      <Check className="w-3 h-3" />
                      <span>Selesai</span>
                    </button>

                    <button
                      onClick={(e) => handleMarkAsRead(n, e)}
                      className={`text-[10px] px-1 py-0.5 rounded transition-colors ${
                        isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                      title="Tandai sudah dibaca"
                    >
                      Abaikan
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        className={`flex items-center justify-between px-3.5 py-2.5 border-t text-xs ${
          isDark ? 'border-[#1f212c] bg-[#0e0f14]' : 'border-zinc-200 bg-zinc-50'
        }`}
      >
        <button
          onClick={handleMarkAllRead}
          className={`text-[11px] font-medium transition-colors cursor-pointer ${
            isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Tandai Semua Dibaca
        </button>

        <button
          onClick={() => {
            onClose();
            onNavigateToTasks();
          }}
          className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer"
        >
          <span>Buka Semua Task</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
