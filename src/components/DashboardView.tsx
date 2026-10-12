import { getLocalDateString } from '../utils/date';
import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FolderArchive,
  Heart,
  Clock,
  Plus,
  Zap,
  Target,
  FileText,
  Check,
  AlertTriangle,
  Bell,
  Calendar,
} from 'lucide-react';
import {
  Task,
  Transaction,
  FileItem,
  WishlistItem,
  ActivityItem,
  UserProfile,
  DashboardSummary,
} from '../types';
import { dataService } from '../services/dataService';
import { notificationService, evaluateTaskUrgency } from '../services/notificationService';

interface DashboardViewProps {
  profile: UserProfile;
  username: string;
  summary: DashboardSummary;
  tasks: Task[];
  transactions: Transaction[];
  files: FileItem[];
  wishlist: WishlistItem[];
  activities: ActivityItem[];
  onNavigate: (tab: any) => void;
  onAddTask: () => void;
  onAddTransaction: () => void;
  isDark: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  username,
  summary,
  tasks,
  transactions,
  files,
  wishlist,
  activities,
  onNavigate,
  onAddTask,
  onAddTransaction,
  isDark,
  onShowToast,
}) => {
  const [taskTab, setTaskTab] = useState<'today' | 'urgent' | 'all' | 'completed'>('today');

  const todayStr = getLocalDateString();
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 11
      ? 'Selamat Pagi'
      : currentHour < 15
      ? 'Selamat Siang'
      : currentHour < 18
      ? 'Selamat Sore'
      : 'Selamat Malam';

  const formatCurrency = (val: number) => 'Rp' + val.toLocaleString('id-ID');

  const urgentCounts = notificationService.getUrgentCounts(tasks);
  const urgentTasks = tasks.filter((t) => {
    if (t.status === 'completed' || !t.deadline) return false;
    const { urgency } = evaluateTaskUrgency(t);
    return urgency === 'overdue' || urgency === 'today';
  });

  const todayTasks = tasks.filter((t) => t.deadline === todayStr && t.status !== 'completed');
  const allActiveTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const displayedTasks =
    taskTab === 'today'
      ? tasks.filter((t) => t.deadline === todayStr)
      : taskTab === 'urgent'
      ? urgentTasks
      : taskTab === 'all'
      ? allActiveTasks
      : completedTasks;

  const handleToggleTask = (task: Task) => {
    const isNowDone = task.status !== 'completed';
    dataService.toggleTaskStatus(task.id);
    if (onShowToast) {
      onShowToast(
        isNowDone ? `Tugas "${task.title}" selesai` : `Tugas "${task.title}" dibuka kembali`,
        'success'
      );
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* Top Header: Simple, Clean, Calm, No visual noise */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className={`text-lg sm:text-xl font-semibold tracking-tight ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}
          >
            Hai, {username}
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {greeting}. {todayTasks.length} tugas hari ini · Saldo {formatCurrency(summary.current_balance)}
          </p>
        </div>

        {/* Minimal Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-lime-600 hover:bg-lime-500 text-white shadow-xs shadow-lime-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Task Baru</span>
          </button>
          <button
            onClick={onAddTransaction}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer active:scale-[0.98] ${
              isDark
                ? 'bg-[#16171e] hover:bg-[#1d1f27] border-[#242633] text-zinc-300'
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Catat Kas</span>
          </button>
        </div>
      </div>

      {/* Proactive Deadline Alert Banner */}
      {(urgentCounts.overdue > 0 || urgentCounts.today > 0) && (
        <div
          className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
            urgentCounts.overdue > 0
              ? isDark
                ? 'bg-rose-500/10 border-rose-500/25 text-rose-200'
                : 'bg-rose-50 border-rose-200 text-rose-900'
              : isDark
              ? 'bg-amber-500/10 border-amber-500/25 text-amber-200'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {urgentCounts.overdue > 0 ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
            ) : (
              <Bell className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div className="text-xs">
              <span className="font-semibold">
                {urgentCounts.overdue > 0
                  ? `Perhatian: Ada ${urgentCounts.overdue} tugas melewati deadline!`
                  : `Pengingat: Ada ${urgentCounts.today} tugas jatuh tempo hari ini!`}
              </span>{' '}
              <span className="opacity-80 hidden sm:inline">
                {urgentCounts.overdue > 0
                  ? 'Segera tinjau dan selesaikan tugas sebelum menumpuk.'
                  : 'Pastikan dikerjakan tepat waktu.'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setTaskTab('urgent');
              }}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                urgentCounts.overdue > 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-2xs'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-2xs'
              }`}
            >
              Lihat ({urgentCounts.overdue + urgentCounts.today})
            </button>
          </div>
        </div>
      )}

      {/* Overview Metrics: Linear style clean data row (No loud colors) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
          }`}
        >
          <p className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Tugas Hari Ini
          </p>
          <p className={`text-base font-semibold font-mono mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {todayTasks.length} <span className="text-xs font-sans text-zinc-500">pending</span>
          </p>
        </div>

        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
          }`}
        >
          <p className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Saldo Kas Total
          </p>
          <p className={`text-base font-semibold font-mono mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {formatCurrency(summary.current_balance)}
          </p>
        </div>

        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
          }`}
        >
          <p className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Files Tersimpan
          </p>
          <p className={`text-base font-semibold font-mono mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {summary.files_count} <span className="text-xs font-sans text-zinc-500">berkas</span>
          </p>
        </div>

        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
          }`}
        >
          <p className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Target Wishlist
          </p>
          <p className="text-base font-semibold font-mono mt-1 text-lime-400">
            {summary.wishlist_progress_average}% <span className="text-xs font-sans text-zinc-500">terkumpul</span>
          </p>
        </div>
      </div>

      {/* Main 2-Column Working Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Tasks Section (7 Cols) */}
        <div
          className={`lg:col-span-7 rounded-xl border p-4 sm:p-5 flex flex-col ${
            isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
          }`}
        >
          {/* Header & Minimal Tab Switcher */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-inherit">
            <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              Tasks
            </h2>

            {/* Linear-style quiet tabs */}
            <div
              className={`flex items-center p-0.5 rounded-lg border text-[11px] ${
                isDark ? 'bg-[#101116] border-[#222430]' : 'bg-zinc-100 border-zinc-200'
              }`}
            >
              {urgentTasks.length > 0 && (
                <button
                  onClick={() => setTaskTab('urgent')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    taskTab === 'urgent'
                      ? isDark
                        ? 'bg-rose-500/25 text-rose-300'
                        : 'bg-rose-100 text-rose-800'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  Mendesak ({urgentTasks.length})
                </button>
              )}
              <button
                onClick={() => setTaskTab('today')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  taskTab === 'today'
                    ? isDark
                      ? 'bg-[#1f202b] text-white'
                      : 'bg-white text-zinc-950 shadow-2xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Hari Ini ({todayTasks.length})
              </button>
              <button
                onClick={() => setTaskTab('all')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  taskTab === 'all'
                    ? isDark
                      ? 'bg-[#1f202b] text-white'
                      : 'bg-white text-zinc-950 shadow-2xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Semua ({allActiveTasks.length})
              </button>
              <button
                onClick={() => setTaskTab('completed')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  taskTab === 'completed'
                    ? isDark
                      ? 'bg-[#1f202b] text-white'
                      : 'bg-white text-zinc-950 shadow-2xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Selesai ({completedTasks.length})
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-1.5 flex-1 min-h-[240px]">
            {displayedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-xs text-zinc-500">
                <p>Tidak ada tugas di kategori ini.</p>
                <button
                  onClick={onAddTask}
                  className="mt-2 text-lime-400 hover:underline cursor-pointer"
                >
                  + Tambah tugas baru
                </button>
              </div>
            ) : (
              displayedTasks.map((task) => {
                const isDone = task.status === 'completed';
                const urgency = evaluateTaskUrgency(task);

                return (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task)}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer group select-none ${
                      isDone
                        ? isDark
                          ? 'bg-[#101116]/40 border-transparent opacity-50'
                          : 'bg-zinc-50/60 border-transparent opacity-60'
                        : urgency.urgency === 'overdue'
                        ? isDark
                          ? 'bg-rose-500/5 border-rose-500/25 hover:border-rose-500/40'
                          : 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                        : isDark
                        ? 'bg-[#181922] border-[#222430] hover:border-zinc-700'
                        : 'bg-white border-zinc-200 hover:border-zinc-400 shadow-2xs'
                    }`}
                  >
                    <button
                      type="button"
                      className="mt-0.5 text-zinc-500 group-hover:text-lime-400"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-medium leading-snug ${
                            isDone ? 'line-through text-zinc-500' : isDark ? 'text-zinc-100' : 'text-zinc-900'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                            isDark ? 'bg-[#121319] text-zinc-400 border border-[#20222d]' : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {task.category}
                        </span>

                        {/* Deadline Status Pill */}
                        {!isDone && task.deadline && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                              urgency.urgency === 'overdue'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : urgency.urgency === 'today'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : urgency.urgency === 'tomorrow'
                                ? 'bg-lime-500/10 text-lime-400 border-lime-500/30'
                                : 'text-zinc-500 border-zinc-800'
                            }`}
                          >
                            {urgency.urgency === 'overdue' ? (
                              <AlertTriangle className="w-2.5 h-2.5" />
                            ) : (
                              <Clock className="w-2.5 h-2.5" />
                            )}
                            <span>{urgency.label}</span>
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className={`text-[11px] mt-0.5 line-clamp-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.reminder && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {task.reminder}
                        </span>
                      )}
                      <span
                        className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border font-semibold ${
                          task.priority === 'high'
                            ? 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                            : task.priority === 'medium'
                            ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
                            : 'text-zinc-400 border-zinc-700 bg-zinc-800/40'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-inherit flex items-center justify-between text-xs">
            <span className="text-[11px] font-mono text-zinc-500">{tasks.length} Total tasks</span>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1 font-medium cursor-pointer"
            >
              Buka Semua
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Finance & Wishlist (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Finance Cashflow Card */}
          <div
            className={`rounded-xl border p-4 sm:p-5 ${
              isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                Cashflow
              </h2>
              <button
                onClick={() => onNavigate('finance')}
                className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
              >
                Detail
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div
              className={`p-3 rounded-lg border font-mono text-xs space-y-1.5 ${
                isDark ? 'bg-[#101116] border-[#20222d]' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="flex justify-between items-center text-emerald-400">
                <span>+ Pemasukan Hari Ini</span>
                <span className="font-semibold">{formatCurrency(summary.income_today)}</span>
              </div>
              <div className="flex justify-between items-center text-rose-400">
                <span>- Pengeluaran Hari Ini</span>
                <span className="font-semibold">{formatCurrency(summary.expense_today)}</span>
              </div>
              <div
                className={`pt-2 border-t flex justify-between items-center font-bold text-sm ${
                  isDark ? 'border-[#222430] text-zinc-100' : 'border-zinc-200 text-zinc-900'
                }`}
              >
                <span>= Saldo Total</span>
                <span>{formatCurrency(summary.current_balance)}</span>
              </div>
            </div>
          </div>

          {/* Wishlist Target Card */}
          <div
            className={`rounded-xl border p-4 sm:p-5 ${
              isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                Wishlist
              </h2>
              <button
                onClick={() => onNavigate('wishlist')}
                className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
              >
                Lihat ({wishlist.length})
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {wishlist.length > 0 ? (
              <div
                className={`p-3 rounded-lg border ${
                  isDark ? 'bg-[#101116] border-[#20222d]' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {wishlist[0].name}
                  </span>
                  <span className="font-mono text-lime-400 font-bold text-xs">
                    {Math.min(
                      100,
                      Math.round((wishlist[0].saved_amount / (wishlist[0].target_price || 1)) * 100)
                    )}
                    %
                  </span>
                </div>

                <div
                  className={`w-full h-1.5 rounded-full mt-2.5 overflow-hidden ${
                    isDark ? 'bg-zinc-800' : 'bg-zinc-200'
                  }`}
                >
                  <div
                    className="h-full bg-lime-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((wishlist[0].saved_amount / (wishlist[0].target_price || 1)) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-400 mt-2">
                  <span>Terkumpul: {formatCurrency(wishlist[0].saved_amount)}</span>
                  <span>Target: {formatCurrency(wishlist[0].target_price)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 py-3 text-center">Belum ada target wishlist.</p>
            )}
          </div>

          {/* Recent Files Card */}
          <div
            className={`rounded-xl border p-4 sm:p-5 ${
              isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                Dokumen Kuliah
              </h2>
              <button
                onClick={() => onNavigate('files')}
                className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
              >
                Lihat ({files.length})
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5">
              {files.slice(0, 2).map((f) => (
                <div
                  key={f.id}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                    isDark ? 'bg-[#101116] border-[#20222d]' : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className={`truncate text-xs ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      {f.name}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {f.file_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
