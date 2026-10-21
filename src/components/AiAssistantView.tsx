import { formatCurrency } from '../utils/preferences';
import { getLocalDateString } from '../utils/date';
import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Wallet,
  CheckSquare,
  Heart,
  FolderArchive,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { Task, Transaction, WishlistItem, FileItem, DashboardSummary, UserProfile } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AiAssistantViewProps {
  isDark: boolean;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({ isDark }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      sender: 'assistant',
      text: 'Halo! Saya Asisten Analisis Personal Anda. Pilih salah satu Pesan Cepat di bawah untuk mendapatkan analisis otomatis tugas, deadline, keuangan, atau target wishlist Anda secara instan.',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (feedRef.current) feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, isLoading]);

  const quickActions = [
    {
      id: 'tasks',
      label: 'Tugas & Deadline Hari Ini',
      icon: CheckSquare,
      color: 'text-lime-400',
    },
    {
      id: 'finance',
      label: 'Status Saldo & Arus Kas',
      icon: Wallet,
      color: 'text-emerald-400',
    },
    {
      id: 'wishlist',
      label: 'Progres Tabungan Wishlist',
      icon: Heart,
      color: 'text-rose-400',
    },
    {
      id: 'files',
      label: 'Cek Dokumen & File Kuliah',
      icon: FolderArchive,
      color: 'text-sky-400',
    },
    {
      id: 'recommendations',
      label: 'Saran & Jadwal Produktivitas',
      icon: Zap,
      color: 'text-amber-400',
    },
  ];

  const generateAnswer = (actionId: string): string => {
    const tasks: Task[] = dataService.getTasks();
    const transactions: Transaction[] = dataService.getTransactions();
    const wishlist: WishlistItem[] = dataService.getWishlist();
    const files: FileItem[] = dataService.getFiles();
    const summary: DashboardSummary = dataService.getDashboardSummary();
    const profile: UserProfile = dataService.getProfile();
    const todayStr = getLocalDateString();

    if (actionId === 'tasks') {
      const todayTasks = tasks.filter((t) => t.deadline === todayStr && t.status !== 'completed');
      const highTasks = tasks.filter((t) => t.status !== 'completed' && t.priority === 'high');
      const overdueTasks = tasks.filter((t) => t.status !== 'completed' && t.deadline && t.deadline < todayStr);

      let res = `📋 **Analisis Tugas & Deadline (${profile.name}):**\n\n`;

      if (overdueTasks.length > 0) {
        res += `🚨 **PERINGATAN: ${overdueTasks.length} Tugas Lewat Deadline:**\n`;
        overdueTasks.forEach((t) => {
          res += `• **${t.title}** (Batas: ${t.deadline}) [${t.priority.toUpperCase()}]\n`;
        });
        res += `\n`;
      }

      if (todayTasks.length > 0) {
        res += `⏰ **Jatuh Tempo HARI INI (${todayTasks.length} tugas):**\n`;
        todayTasks.forEach((t) => {
          res += `• **${t.title}** (${t.category})${t.reminder ? ` - Jam ${t.reminder}` : ''}\n`;
        });
        res += `\n`;
      } else {
        res += `✅ Tidak ada tugas yang jatuh tempo hari ini.\n\n`;
      }

      if (highTasks.length > 0) {
        res += `🔥 **Tugas Prioritas Tinggi yang Aktif:**\n`;
        highTasks.forEach((t) => {
          res += `• ${t.title} (Deadline: ${t.deadline})\n`;
        });
      }

      res += `\n💡 **Saran:** Selesaikan tugas yang paling dekat batas waktunya terlebih dahulu.`;
      return res;
    }

    if (actionId === 'finance') {
      const expenses = transactions.filter((t) => t.type === 'expense');
      const incomes = transactions.filter((t) => t.type === 'income');

      let res = `💰 **Ringkasan Finansial & Arus Kas:**\n\n`;
      res += `• **Saldo Bersih Total:** ${formatCurrency(summary.current_balance)}\n`;
      res += `• **Total Pemasukan:** +${formatCurrency(summary.total_income)} (${incomes.length} transaksi)\n`;
      res += `• **Total Pengeluaran:** -${formatCurrency(summary.total_expense)} (${expenses.length} transaksi)\n`;
      res += `• **Pemasukan Hari Ini:** +${formatCurrency(summary.income_today)}\n`;
      res += `• **Pengeluaran Hari Ini:** -${formatCurrency(summary.expense_today)}\n\n`;

      if (transactions.length === 0) {
        res += `Catatan kas Anda masih kosong. Silakan catat transaksi pertama Anda di tab Finance!\n`;
      } else {
        res += `💡 **Status Keuangan:** Arus kas Anda ${
          summary.current_balance >= 0 ? 'dalam kondisi aman dan surplus' : 'perlu dievaluasi pengeluarannya'
        }.`;
      }
      return res;
    }

    if (actionId === 'wishlist') {
      if (wishlist.length === 0) {
        return '🎯 **Wishlist:** Belum ada target wishlist yang dicatat. Buka menu Wishlist untuk menambahkan barang impian Anda!';
      }

      let res = `🎯 **Progres Tabungan Wishlist (Rata-rata: ${summary.wishlist_progress_average}%):**\n\n`;
      wishlist.forEach((w, i) => {
        const pct = Math.min(100, Math.round((w.saved_amount / (w.target_price || 1)) * 100));
        const sisa = Math.max(0, w.target_price - w.saved_amount);
        res += `${i + 1}. **${w.name}** [${pct}%]\n`;
        res += `   • Terkumpul: ${formatCurrency(w.saved_amount)} / ${formatCurrency(w.target_price)}\n`;
        res += `   • Sisa yang dibutuhkan: ${formatCurrency(sisa)}\n`;
      });

      res += `\n💡 **Tips:** Lakukan setoran tabungan rutin ${formatCurrency(50000)} setiap ada sisa dana di tab Wishlist!`;
      return res;
    }

    if (actionId === 'files') {
      if (files.length === 0) {
        return '📁 **Berkas:** Belum ada file yang diunggah ke repositori lokal Anda.';
      }

      let res = `📁 **Status Berkas & Dokumen (${files.length} file tersimpan):**\n\n`;
      files.slice(0, 5).forEach((f, i) => {
        res += `${i + 1}. **${f.name}** (${f.category} • ${(f.file_size / 1024 / 1024).toFixed(2)} MB)\n`;
      });

      res += `\nSemua berkas aman dan terindeks dalam sistem penyimpanan Anda.`;
      return res;
    }

    if (actionId === 'recommendations') {
      const pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
      return `⚡ **Rekomendasi Produktivitas Hari Ini:**\n\n1. Anda memiliki **${pendingTasks} tugas pending**. Luangkan waktu fokus 45 menit tanpa gangguan untuk menyelesaikan tugas prioritas tertinggi.\n2. Cek apakah ada pengeluaran harian yang bisa ditekan untuk mempercepat pencapaian target wishlist.\n3. Pastikan notifikasi browser tetap aktif agar pengingat deadline berbunyi tepat waktu.`;
    }

    return 'Perintah siap diproses.';
  };

  const handleQuickClick = (action: (typeof quickActions)[0]) => {
    if (isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: action.label,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    setTimeout(() => {
      const responseText = generateAnswer(action.id);
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
    }, 350);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'm-reset',
        sender: 'assistant',
        text: 'Riwayat percakapan telah dibersihkan. Silakan pilih salah satu Pesan Cepat di bawah untuk meminta analisis.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-lg sm:text-xl font-semibold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              AI Personal Assistant
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-lime-500/15 text-lime-400 border border-lime-500/20 font-medium">
              Mode Pesan Cepat
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Analisis data tugas, deadline, keuangan, dan wishlist Anda dengan sekali klik.
          </p>
        </div>

        <button
          onClick={handleClearChat}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto ${
            isDark
              ? 'border-[#424242] text-zinc-400 hover:text-zinc-200 hover:bg-[#161720]'
              : 'border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Bersihkan Chat</span>
        </button>
      </div>

      {/* Chat Container */}
      <div
        className={`rounded-2xl border flex flex-col h-[580px] shadow-xs overflow-hidden transition-all ${
          isDark ? 'bg-[#121319] border-[#222432]' : 'bg-white border-zinc-200'
        }`}
      >
        {/* Messages Feed */}
        <div ref={feedRef} className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs ${
                m.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.sender === 'assistant' && (
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                    isDark
                      ? 'bg-[#2f2f2f] border-[#2a2c3d] text-lime-400'
                      : 'bg-lime-50 border-lime-200 text-lime-600'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl ${
                  m.sender === 'user'
                    ? 'bg-lime-600 text-white rounded-tr-xs'
                    : isDark
                    ? 'bg-[#171822] border border-[#232533] text-zinc-200 rounded-tl-xs shadow-2xs'
                    : 'bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-tl-xs'
                }`}
              >
                <div className="leading-relaxed whitespace-pre-line text-xs font-sans">
                  {m.text}
                </div>
                <div
                  className={`text-[10px] mt-2 font-mono text-right ${
                    m.sender === 'user' ? 'text-lime-200' : 'text-zinc-500'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 text-xs justify-start">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                  isDark
                    ? 'bg-[#2f2f2f] border-[#2a2c3d] text-lime-400'
                    : 'bg-lime-50 border-lime-200 text-lime-600'
                }`}
              >
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 ${
                  isDark ? 'bg-[#171822] border-[#232533] text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] font-mono">Memproses analisis...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Message Actions Panel (No Typing Bar) */}
        <div
          className={`p-3.5 border-t ${
            isDark ? 'border-[#424242] bg-[#0d0e13]' : 'border-zinc-200 bg-zinc-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Pilih Pesan Cepat:
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Analisis instan data riil
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickClick(action)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer active:scale-98 disabled:opacity-40 ${
                    isDark
                      ? 'bg-[#14151e] hover:bg-[#1c1d29] border-[#252737] text-zinc-200 hover:border-lime-500/40'
                      : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-800 hover:border-zinc-300 shadow-2xs'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${action.color}`} />
                  <span className="truncate">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
