import { getLocalDateString } from '../utils/date';
import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { dataService } from '../services/dataService';

interface FinanceViewProps {
  transactions: Transaction[];
  isDark: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  transactions,
  isDark,
  onShowToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [cashflowPeriod, setCashflowPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('today');
  const [selectedDay, setSelectedDay] = useState<string>(getLocalDateString());
  const [customStart, setCustomStart] = useState<string>(getLocalDateString());
  const [customEnd, setCustomEnd] = useState<string>(getLocalDateString());

  // Form State - all strictly empty by default
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(getLocalDateString());

  const formatCurrency = (val: number) => 'Rp' + val.toLocaleString('id-ID');

  const today = getLocalDateString();
  const dateFromLocal = (value: string) => new Date(`${value}T00:00:00`);
  const dateKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const periodRange = useMemo(() => {
    const current = dateFromLocal(today);
    if (cashflowPeriod === 'today') return { start: selectedDay, end: selectedDay };
    if (cashflowPeriod === 'week') {
      const monday = new Date(current);
      monday.setDate(current.getDate() - ((current.getDay() + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: dateKey(monday), end: dateKey(sunday) };
    }
    if (cashflowPeriod === 'month') return { start: dateKey(new Date(current.getFullYear(), current.getMonth(), 1)), end: dateKey(new Date(current.getFullYear(), current.getMonth() + 1, 0)) };
    if (cashflowPeriod === 'year') return { start: `${current.getFullYear()}-01-01`, end: `${current.getFullYear()}-12-31` };
    if (cashflowPeriod === 'custom') return customStart <= customEnd ? { start: customStart, end: customEnd } : { start: customEnd, end: customStart };
    return { start: '', end: '' };
  }, [cashflowPeriod, today, selectedDay, customStart, customEnd]);

  const periodTransactions = useMemo(() => transactions.filter((t) => {
    const day = String(t.transaction_date || '').slice(0, 10);
    return cashflowPeriod === 'all' || (day >= periodRange.start && day <= periodRange.end);
  }), [transactions, cashflowPeriod, periodRange]);
  // Summary totals follow BOTH the selected date range and transaction-type filter.
  const totalIncome = periodTransactions.filter((t) => t.type === 'income' && (filterType === 'all' || filterType === 'income')).reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = periodTransactions.filter((t) => t.type === 'expense' && (filterType === 'all' || filterType === 'expense')).reduce((acc, t) => acc + t.amount, 0);
  const currentBalance = totalIncome - totalExpense;

  const formatDateLong = (value: string) => {
    if (value === today) return 'Hari ini';
    const parsed = dateFromLocal(value);
    return parsed.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  const formatPeriodLabel = () => {
    if (cashflowPeriod === 'today') return selectedDay === today ? 'Hari ini' : formatDateLong(selectedDay);
    if (cashflowPeriod === 'all') return 'Sepanjang waktu';
    if (cashflowPeriod === 'custom') {
      const a = dateFromLocal(periodRange.start); const b = dateFromLocal(periodRange.end);
      const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
      return periodRange.start === periodRange.end ? formatDateLong(periodRange.start) : a.getFullYear() === b.getFullYear() ? (a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${b.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}` : `${a.toLocaleDateString('id-ID', opts)} – ${b.toLocaleDateString('id-ID', { ...opts, year: 'numeric' })}`) : `${a.toLocaleDateString('id-ID', { ...opts, year: 'numeric' })} – ${b.toLocaleDateString('id-ID', { ...opts, year: 'numeric' })}`;
    }
    if (cashflowPeriod === 'week') return `Pekan ${formatDateLong(periodRange.start)} – ${formatDateLong(periodRange.end)}`;
    if (cashflowPeriod === 'month') return dateFromLocal(today).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    if (cashflowPeriod === 'year') return dateFromLocal(today).getFullYear().toString();
    const a = dateFromLocal(periodRange.start); const b = dateFromLocal(periodRange.end);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    return a.getFullYear() === b.getFullYear()
      ? (a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${b.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}` : `${a.toLocaleDateString('id-ID', opts)} – ${b.toLocaleDateString('id-ID', { ...opts, year: 'numeric' })}`)
      : `${a.toLocaleDateString('id-ID', { ...opts, year: 'numeric' })} – ${b.toLocaleDateString('id-ID', { ...opts, year: 'numeric' })}`;
  };

  const filteredTransactions = useMemo(() => periodTransactions
    .filter((t) => filterType === 'all' || t.type === filterType)
    .sort((a, b) => {
      const dateComparison = String(a.transaction_date || '').localeCompare(String(b.transaction_date || ''));
      if (sortMode === 'newest') return -dateComparison || b.amount - a.amount;
      if (sortMode === 'oldest') return dateComparison || b.amount - a.amount;
      if (sortMode === 'highest') return b.amount - a.amount || -dateComparison;
      return a.amount - b.amount || -dateComparison;
    }), [periodTransactions, filterType, sortMode]);

  const selectedDayTransactions = periodTransactions.filter((t) => filterType === 'all' || t.type === filterType);
  const dailyIncome = totalIncome;
  const dailyExpense = totalExpense;
  const dailyNet = currentBalance;
  const surfaceClass = isDark ? 'bg-[#2f2f2f] border-[#424242]' : 'bg-white border-[#e5e5e5]';
  const controlClass = isDark ? 'bg-[#212121] border-[#424242] text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800';

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    dataService.createTransaction({
      type,
      amount: numAmount,
      category: category.trim(),
      description: description.trim() || (type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
      transaction_date: date,
    });

    if (onShowToast) {
      onShowToast(
        `Transaksi Rp${numAmount.toLocaleString('id-ID')} dicatat`,
        'success'
      );
    }

    setAmount('');
    setDescription('');
    setIsModalOpen(false);
  };

  const handleDelete = (tx: Transaction) => {
    if (!window.confirm(`Hapus catatan ${tx.type === 'income' ? 'pemasukan' : 'pengeluaran'} "${tx.description}"?`)) return;
    dataService.deleteTransaction(tx.id);
    if (onShowToast) {
      onShowToast(`Catatan kas "${tx.description}" dihapus`, 'info');
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-lg sm:text-xl font-semibold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Finance
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Pencatatan arus kas, pemasukan, pengeluaran, dan saldo riil.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-lime-600 hover:bg-lime-500 text-white shadow-xs shadow-lime-600/30 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Catat Transaksi</span>
        </button>
      </div>

      {/* Summary Row (Minimal, calm, not loud) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div
          className={`p-4 rounded-xl border ${
            surfaceClass
          }`}
        >
          <p className={`text-[11px] font-sans ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Total Pemasukan
          </p>
          <p className="text-lg font-semibold text-emerald-400 mt-1">
            + {formatCurrency(totalIncome)}
          </p>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            surfaceClass
          }`}
        >
          <p className={`text-[11px] font-sans ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Total Pengeluaran
          </p>
          <p className="text-lg font-semibold text-rose-400 mt-1">
            - {formatCurrency(totalExpense)}
          </p>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            surfaceClass
          }`}
        >
          <p className={`text-[11px] font-sans ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Saldo Bersih
          </p>
          <p className={`text-lg font-semibold mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            = {formatCurrency(currentBalance)}
          </p>
        </div>
      </div>

      {/* Daily cashflow */}
      <section className={`rounded-2xl border p-4 sm:p-5 ${surfaceClass}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Cashflow: {formatPeriodLabel()}</h2>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Ringkasan dan daftar transaksi mengikuti rentang waktu yang dipilih.</p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <div className="flex items-center gap-2" aria-label="Pilih tanggal cashflow">
              <button type="button" onClick={() => { const d = dateFromLocal(selectedDay); d.setDate(d.getDate() - 1); setSelectedDay(dateKey(d)); setCashflowPeriod('today'); }} aria-label="Hari sebelumnya" title="Hari sebelumnya" className={`h-10 w-10 shrink-0 rounded-lg border flex items-center justify-center ${isDark ? 'border-[#424242] bg-[#212121] hover:bg-[#383838]' : 'border-zinc-200 bg-white hover:bg-zinc-100'}`}><ChevronLeft className="h-4 w-4" /></button>
              <div className={`flex h-10 w-[250px] max-w-[calc(100vw-190px)] min-w-0 items-center justify-center rounded-lg border px-3 text-center ${isDark ? 'border-[#424242] bg-[#212121]' : 'border-zinc-200 bg-white'}`}>
                <span className={`truncate text-xs font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>{selectedDay === today ? 'Hari ini' : formatDateLong(selectedDay)}</span>
              </div>
              <button type="button" onClick={() => { const d = dateFromLocal(selectedDay); d.setDate(d.getDate() + 1); setSelectedDay(dateKey(d)); setCashflowPeriod('today'); }} aria-label="Hari berikutnya" title="Hari berikutnya" className={`h-10 w-10 shrink-0 rounded-lg border flex items-center justify-center ${isDark ? 'border-[#424242] bg-[#212121] hover:bg-[#383838]' : 'border-zinc-200 bg-white hover:bg-zinc-100'}`}><ChevronRight className="h-4 w-4" /></button>
              <label className={`relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border ${isDark ? 'border-[#424242] bg-[#212121] hover:bg-[#383838]' : 'border-zinc-200 bg-white hover:bg-zinc-100'}`} title="Pilih tanggal tertentu" aria-label="Pilih tanggal tertentu">
                <Calendar className="h-4 w-4 text-zinc-400" />
                <input type="date" aria-label="Pilih tanggal cashflow" value={selectedDay} onChange={(e) => { if (e.target.value) { setSelectedDay(e.target.value); setCashflowPeriod('today'); } }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </label>
            </div>
            {([['week', 'Minggu ini'], ['month', 'Bulanan'], ['year', 'Tahunan'], ['all', 'All time']] as const).map(([value, label]) => (
              <button key={value} onClick={() => setCashflowPeriod(value)} className={`rounded-lg px-3 py-2 text-xs font-medium ${cashflowPeriod === value ? 'bg-lime-600 text-white' : isDark ? 'bg-[#212121] text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>{label}</button>
            ))}
            <button type="button" onClick={() => setCashflowPeriod('custom')} className={`rounded-lg px-3 py-2 text-xs font-medium ${cashflowPeriod === 'custom' ? 'bg-lime-600 text-white' : isDark ? 'bg-[#212121] text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>Kustom</button>
          </div>
        </div>
        {cashflowPeriod === 'custom' && (
          <div className={`mt-3 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-end ${isDark ? 'border-[#424242] bg-[#212121]' : 'border-zinc-200 bg-zinc-50'}`}>
            <div className="flex-1">
              <label htmlFor="cashflow-custom-start" className="mb-1 block text-xs text-zinc-500">Tanggal awal</label>
              <input id="cashflow-custom-start" type="date" value={customStart} max={customEnd} onChange={(e) => e.target.value && setCustomStart(e.target.value)} className={`w-full rounded-lg border p-2 text-sm ${isDark ? 'border-[#424242] bg-[#303030] text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'}`} />
            </div>
            <div className="flex-1">
              <label htmlFor="cashflow-custom-end" className="mb-1 block text-xs text-zinc-500">Tanggal akhir</label>
              <input id="cashflow-custom-end" type="date" value={customEnd} min={customStart} onChange={(e) => e.target.value && setCustomEnd(e.target.value)} className={`w-full rounded-lg border p-2 text-sm ${isDark ? 'border-[#424242] bg-[#303030] text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'}`} />
            </div>
            <button type="button" onClick={() => { setCustomStart(today); setCustomEnd(today); setSelectedDay(today); setCashflowPeriod('today'); }} className={`rounded-lg px-3 py-2 text-xs font-medium ${isDark ? 'bg-[#383838] text-zinc-200' : 'bg-white text-zinc-700 border border-zinc-200'}`}>Kembali ke hari ini</button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className={`rounded-xl p-3 ${isDark ? 'bg-[#212121]' : 'bg-[#f7f7f7]'}`}>
            <p className="text-xs text-zinc-500">Total pemasukan</p>
            <p className="mt-1 text-base font-semibold text-emerald-500">+ {formatCurrency(dailyIncome)}</p>
          </div>
          <div className={`rounded-xl p-3 ${isDark ? 'bg-[#212121]' : 'bg-[#f7f7f7]'}`}>
            <p className="text-xs text-zinc-500">Total pengeluaran</p>
            <p className="mt-1 text-base font-semibold text-rose-500">− {formatCurrency(dailyExpense)}</p>
          </div>
          <div className={`rounded-xl p-3 ${isDark ? 'bg-[#212121]' : 'bg-[#f7f7f7]'}`}>
            <p className="text-xs text-zinc-500">Arus kas bersih</p>
            <p className={`mt-1 text-base font-semibold ${dailyNet >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{dailyNet >= 0 ? '+' : '−'} {formatCurrency(Math.abs(dailyNet))}</p>
            <p className="text-[11px] text-zinc-500 mt-1">{selectedDayTransactions.length} transaksi</p>
          </div>
        </div>
      </section>

      {/* Filters and sorting */}
      <div className={`flex flex-col gap-3 rounded-2xl border p-3 ${surfaceClass}`}>
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filter & urutkan catatan cashflow
        </div>
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className={`flex flex-wrap items-center gap-1 rounded-xl p-1 ${isDark ? 'bg-[#212121]' : 'bg-[#f7f7f7]'}`}>
            {([
              ['all', `Semua (${periodTransactions.length})`],
              ['income', 'Pemasukan'],
              ['expense', 'Pengeluaran'],
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => setFilterType(value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterType === value ? (isDark ? 'bg-[#424242] text-white' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-500 hover:text-current'}`}>
                {label}
              </button>
            ))}
          </div>
          <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${controlClass}`}>
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            <span className="whitespace-nowrap text-zinc-500">Urutkan</span>
            <select aria-label="Urutkan catatan cashflow" value={sortMode} onChange={(e) => setSortMode(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest')} className="min-w-0 bg-transparent outline-none">
              <option value="newest">Waktu terbaru</option>
              <option value="oldest">Waktu terlama</option>
              <option value="highest">Nominal terbesar</option>
              <option value="lowest">Nominal terkecil</option>
            </select>
          </label>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="space-y-1.5">
        {filteredTransactions.length === 0 ? (
          <div
            className={`p-10 text-center rounded-xl border border-dashed text-xs text-zinc-400 ${
              isDark ? 'border-[#424242] bg-[#2f2f2f]' : 'border-zinc-300 bg-white'
            }`}
          >
            Belum ada transaksi pada kategori ini.
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                isDark
                  ? 'bg-[#2f2f2f] border-[#424242] hover:border-zinc-500'
                  : 'bg-white border-zinc-200 hover:border-zinc-400 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    tx.type === 'income'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {tx.type === 'income' ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-medium truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {tx.description}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                    {tx.category} • {((tx.transaction_date || '').slice(0, 10) === today) ? 'Hari ini' : formatDateLong(String(tx.transaction_date || '').slice(0, 10))}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <span
                  className={`font-mono text-xs font-semibold ${
                    tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                </span>
                <button
                  onClick={() => handleDelete(tx)}
                  className="p-1 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-zinc-800/50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Catat Transaksi */}
      {isModalOpen && (
        <div onMouseDown={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md border rounded-2xl p-5 shadow-2xl ${
              isDark ? 'bg-[#2f2f2f] border-[#424242]' : 'bg-white border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <h2 className="text-sm font-semibold">Catat Transaksi Keuangan</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-3.5 mt-4 text-xs">
              {/* Type Switcher */}
              <div
                className={`grid grid-cols-2 gap-1 p-1 rounded-lg border ${
                  isDark ? 'bg-[#212121] border-[#424242]' : 'bg-zinc-100 border-zinc-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-1.5 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                    type === 'expense'
                      ? 'bg-rose-500/15 text-rose-300 font-semibold shadow-2xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Pengeluaran (-)
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-1.5 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                    type === 'income'
                      ? 'bg-emerald-500/15 text-emerald-300 font-semibold shadow-2xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Pemasukan (+)
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Nominal (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Contoh: 50000"
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-sm focus:outline-hidden focus:ring-1 focus:ring-lime-500 ${
                    isDark ? 'bg-[#212121] border-[#424242] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Keterangan Transaksi *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Makan siang, Gaji Freelance"
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden focus:ring-1 focus:ring-lime-500 ${
                    isDark ? 'bg-[#212121] border-[#424242] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  }`}
                />
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
                    placeholder="Ketik kategori (opsional)"
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden ${
                      isDark ? 'bg-[#212121] border-[#424242] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden ${
                      isDark ? 'bg-[#212121] border-[#424242] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
                </div>
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
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
