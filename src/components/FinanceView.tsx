import { getLocalDateString } from '../utils/date';
import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
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
  const [cashflowDate, setCashflowDate] = useState<string>(getLocalDateString());

  // Form State - all strictly empty by default
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(getLocalDateString());

  const formatCurrency = (val: number) => 'Rp' + val.toLocaleString('id-ID');

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const currentBalance = totalIncome - totalExpense;

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => filterType === 'all' || t.type === filterType)
      .sort((a, b) => {
        const dateComparison = String(a.transaction_date || '').localeCompare(String(b.transaction_date || ''));
        if (sortMode === 'newest') return -dateComparison || b.amount - a.amount;
        if (sortMode === 'oldest') return dateComparison || b.amount - a.amount;
        if (sortMode === 'highest') return b.amount - a.amount || -dateComparison;
        return a.amount - b.amount || -dateComparison;
      });
  }, [transactions, filterType, sortMode]);

  const selectedDayTransactions = useMemo(
    () => transactions.filter((t) => t.transaction_date === cashflowDate),
    [transactions, cashflowDate]
  );
  const dailyIncome = selectedDayTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const dailyExpense = selectedDayTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const dailyNet = dailyIncome - dailyExpense;
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
              <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Cashflow Harian</h2>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Ringkasan pemasukan dan pengeluaran pada tanggal yang dipilih.</p>
          </div>
          <input
            type="date"
            aria-label="Pilih tanggal cashflow harian"
            value={cashflowDate}
            onChange={(e) => setCashflowDate(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 ${controlClass}`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className={`rounded-xl p-3 ${isDark ? 'bg-[#212121]' : 'bg-[#f7f7f7]'}`}>
            <p className="text-xs text-zinc-500">Pemasukan hari itu</p>
            <p className="mt-1 text-base font-semibold text-emerald-500">+ {formatCurrency(dailyIncome)}</p>
          </div>
          <div className={`rounded-xl p-3 ${isDark ? 'bg-[#212121]' : 'bg-[#f7f7f7]'}`}>
            <p className="text-xs text-zinc-500">Pengeluaran hari itu</p>
            <p className="mt-1 text-base font-semibold text-rose-500">− {formatCurrency(dailyExpense)}</p>
          </div>
          <div className={`rounded-xl p-3 ${isDark ? 'bg-[#212121]' : 'bg-[#f7f7f7]'}`}>
            <p className="text-xs text-zinc-500">Arus kas bersih</p>
            <p className={`mt-1 text-base font-semibold ${dailyNet >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{dailyNet >= 0 ? '+' : '−'} {formatCurrency(Math.abs(dailyNet))}</p>
            <p className="text-[11px] text-zinc-500 mt-1">{selectedDayTransactions.length} transaksi</p>
          </div>
        </div>
        <div className={`mt-4 rounded-xl border overflow-hidden ${isDark ? 'border-[#424242]' : 'border-zinc-200'}`}>
          <div className={`px-3 py-2 text-xs font-medium ${isDark ? 'bg-[#212121] text-zinc-300' : 'bg-[#f7f7f7] text-zinc-600'}`}>
            Catatan pada {cashflowDate}
          </div>
          {selectedDayTransactions.length === 0 ? (
            <p className="px-3 py-4 text-xs text-zinc-500">Belum ada transaksi pada tanggal ini.</p>
          ) : (
            <div className="divide-y divide-zinc-500/10">
              {[...selectedDayTransactions].sort((a, b) => b.amount - a.amount).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{tx.description}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">{tx.category || 'Tanpa kategori'}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {tx.type === 'income' ? '+' : '−'} {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
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
              ['all', `Semua (${transactions.length})`],
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
                    {tx.category} • {tx.transaction_date}
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
