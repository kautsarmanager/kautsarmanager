import { getLocalDateString } from '../utils/date';
import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Calendar,
  Clock,
  Filter,
  X,
  Search,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import { Task, Priority } from '../types';
import { dataService } from '../services/dataService';
import { evaluateTaskUrgency } from '../services/notificationService';

interface TasksViewProps {
  tasks: Task[];
  initialCreateOpen?: boolean;
  isDark: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  initialCreateOpen = false,
  isDark,
  onShowToast,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterDeadline, setFilterDeadline] = useState<'all' | 'overdue' | 'today' | 'soon'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(initialCreateOpen);

  // New Task Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(getLocalDateString());
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('');
  const [reminder, setReminder] = useState('');

  const categories = Array.from(new Set(tasks.map((t) => t.category).filter(Boolean)));

  const filteredTasks = tasks.filter((t) => {
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterStatus === 'pending' && t.status === 'completed') return false;
    if (filterStatus === 'completed' && t.status !== 'completed') return false;

    if (filterDeadline !== 'all') {
      const { urgency } = evaluateTaskUrgency(t);
      if (filterDeadline === 'overdue' && urgency !== 'overdue') return false;
      if (filterDeadline === 'today' && urgency !== 'today') return false;
      if (filterDeadline === 'soon' && urgency !== 'tomorrow' && urgency !== 'soon') return false;
    }

    return true;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    dataService.createTask({
      title: title.trim(),
      description: description.trim(),
      deadline,
      priority,
      status: 'pending',
      category: category.trim(),
      reminder: reminder.trim() || undefined,
    });

    if (onShowToast) {
      onShowToast(`Tugas "${title.trim()}" dengan deadline berhasil dibuat`, 'success');
    }

    setTitle('');
    setDescription('');
    setReminder('');
    setIsModalOpen(false);
  };

  const handleToggle = (task: Task) => {
    const isNowDone = task.status !== 'completed';
    dataService.toggleTaskStatus(task.id);
    if (onShowToast) {
      onShowToast(
        isNowDone ? `Tugas "${task.title}" diselesaikan` : `Tugas "${task.title}" dibuka kembali`,
        'success'
      );
    }
  };

  const handleDelete = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    dataService.deleteTask(task.id);
    if (onShowToast) {
      onShowToast(`Tugas "${task.title}" dihapus`, 'info');
    }
  };

  const setQuickDeadline = (days: number) => {
    const d = new Date(Date.now() + days * 86400000);
    setDeadline(getLocalDateString(d));
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-lg sm:text-xl font-semibold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Tasks & Deadline
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Kelola target harian, deadline, dan sistem pengingat otomatis tugas Anda.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-lime-600 hover:bg-lime-500 text-white shadow-xs shadow-lime-600/30 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Task Baru</span>
        </button>
      </div>

      {/* Filter Toolbar (Linear Style) */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl border ${
          isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Quick Search inside Tasks */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs w-44 sm:w-52 ${
              isDark ? 'bg-[#101116] border-[#222430]' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari task..."
              className="bg-transparent text-xs w-full focus:outline-hidden"
            />
          </div>

          {/* Status Segmented Control */}
          <div
            className={`flex items-center p-0.5 rounded-lg border text-[11px] ${
              isDark ? 'bg-[#101116] border-[#222430]' : 'bg-zinc-100 border-zinc-200'
            }`}
          >
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                filterStatus === 'all'
                  ? isDark
                    ? 'bg-[#1f202b] text-white'
                    : 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                filterStatus === 'pending'
                  ? isDark
                    ? 'bg-[#1f202b] text-white'
                    : 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                filterStatus === 'completed'
                  ? isDark
                    ? 'bg-[#1f202b] text-white'
                    : 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Selesai
            </button>
          </div>

          {/* Deadline Filter */}
          <select
            value={filterDeadline}
            onChange={(e) => setFilterDeadline(e.target.value as any)}
            className={`border rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden ${
              isDark
                ? 'bg-[#101116] border-[#222430] text-zinc-300'
                : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
          >
            <option value="all">Semua Deadline</option>
            <option value="overdue">🚨 Lewat Deadline (Overdue)</option>
            <option value="today">⏰ Jatuh Tempo Hari Ini</option>
            <option value="soon">📅 Segera / Mendatang</option>
          </select>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`border rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden ${
              isDark
                ? 'bg-[#101116] border-[#222430] text-zinc-300'
                : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={`border rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden ${
              isDark
                ? 'bg-[#101116] border-[#222430] text-zinc-300'
                : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
          >
            <option value="all">Semua Prioritas</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <span className="text-xs font-mono text-zinc-500 pr-2">
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Task List (Clean linear rows) */}
      <div className="space-y-1.5">
        {filteredTasks.length === 0 ? (
          <div
            className={`p-10 text-center rounded-xl border border-dashed ${
              isDark ? 'border-[#222430] bg-[#14151b]' : 'border-zinc-300 bg-white'
            }`}
          >
            <p className="text-zinc-400 text-xs">Tidak ada tugas yang sesuai filter.</p>
            <button
              onClick={() => {
                setFilterCategory('all');
                setFilterPriority('all');
                setFilterStatus('all');
                setFilterDeadline('all');
                setSearchQuery('');
              }}
              className="mt-2 text-xs text-lime-400 hover:underline cursor-pointer"
            >
              Reset filter
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === 'completed';
            const urgency = evaluateTaskUrgency(task);

            return (
              <div
                key={task.id}
                onClick={() => handleToggle(task)}
                className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                  isDone
                    ? isDark
                      ? 'bg-[#121319]/50 border-transparent opacity-50'
                      : 'bg-zinc-50 border-transparent opacity-60'
                    : urgency.urgency === 'overdue'
                    ? isDark
                      ? 'bg-rose-500/5 border-rose-500/25 hover:border-rose-500/40'
                      : 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                    : isDark
                    ? 'bg-[#14151b] border-[#20222d] hover:border-zinc-700'
                    : 'bg-white border-zinc-200 hover:border-zinc-400 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button type="button" className="mt-0.5 text-zinc-500 group-hover:text-lime-400">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-medium ${
                          isDone ? 'line-through text-zinc-500' : isDark ? 'text-zinc-100' : 'text-zinc-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          isDark
                            ? 'bg-[#101116] text-zinc-400 border-[#222430]'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        {task.category}
                      </span>

                      {/* Explicit Deadline Alert Pill */}
                      {!isDone && task.deadline && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                            urgency.urgency === 'overdue'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-semibold'
                              : urgency.urgency === 'today'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-semibold'
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
                      <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Deadline: {task.deadline}
                      </span>
                      {task.reminder && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Clock className="w-3 h-3" />
                          Pukul {task.reminder}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
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

                  <button
                    onClick={(e) => handleDelete(task, e)}
                    className="p-1 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-zinc-800/50 transition-colors opacity-70 group-hover:opacity-100"
                    title="Hapus task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tambah Task */}
      {isModalOpen && (
        <div onMouseDown={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md border rounded-2xl p-5 shadow-2xl ${
              isDark ? 'bg-[#15161d] border-[#262836]' : 'bg-white border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-lime-400" />
                <h2 className="text-sm font-semibold">Tambah Tugas & Pengingat</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Judul Tugas *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Kerjakan laporan praktikum"
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden focus:ring-1 focus:ring-lime-500 ${
                    isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Deskripsi
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan detail..."
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden focus:ring-1 focus:ring-lime-500 ${
                    isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-zinc-400">
                    Deadline *
                  </label>
                  {/* Quick Deadline Presets */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuickDeadline(0)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        isDark ? 'border-[#292b3a] text-zinc-400 hover:text-zinc-100' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDeadline(1)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        isDark ? 'border-[#292b3a] text-zinc-400 hover:text-zinc-100' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      Besok
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDeadline(3)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        isDark ? 'border-[#292b3a] text-zinc-400 hover:text-zinc-100' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      +3 Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDeadline(7)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        isDark ? 'border-[#292b3a] text-zinc-400 hover:text-zinc-100' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      +7 Hari
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden ${
                      isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />

                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden ${
                      isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  >
                    <option value="low">Prioritas Rendah (Low)</option>
                    <option value="medium">Prioritas Sedang (Medium)</option>
                    <option value="high">Prioritas Tinggi (High)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Kuliah, Kerja..."
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden ${
                      isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-zinc-400">
                      Waktu Pengingat
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setReminder('09:00')}
                        className="text-[9px] px-1 py-0.2 rounded border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        09:00
                      </button>
                      <button
                        type="button"
                        onClick={() => setReminder('20:00')}
                        className="text-[9px] px-1 py-0.2 rounded border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        20:00
                      </button>
                    </div>
                  </div>
                  <input
                    type="time"
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden ${
                      isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
                </div>
              </div>

              {/* Notification note */}
              <div
                className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                  isDark ? 'bg-[#101116] border-[#20222e] text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
              >
                <Bell className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span>
                  Sistem akan otomatis memunculkan notifikasi dan lonceng peringatan saat deadline mendekat.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-lime-600 hover:bg-lime-500 text-white font-medium shadow-xs shadow-lime-600/30 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Simpan Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
