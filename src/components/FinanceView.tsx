import { getLocalDateString } from '../utils/date';
import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  Wallet,
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

  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    return true;
  });

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    dataService.createTransaction({
      type,
      amount: numAmount,
      category: category.trim() || 'Umum',
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-lime-600 hover:bg-lime-500 text-white shadow-xs shadow-lime-600/30 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Catat Transaksi</span>
        </button>
      </div>

      {/* Summary Row (Minimal, calm, not loud) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div
          className={`p-4 rounded-xl border ${
            isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
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
            isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
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
            isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
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

      {/* Toolbar */}
      <div
        className={`flex items-center justify-between p-2.5 rounded-xl border ${
          isDark ? 'bg-[#14151b] border-[#20222d]' : 'bg-white border-zinc-200 shadow-2xs'
        }`}
      >
        <div
          className={`flex items-center p-0.5 rounded-lg border text-[11px] ${
            isDark ? 'bg-[#101116] border-[#222430]' : 'bg-zinc-100 border-zinc-200'
          }`}
        >
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${
              filterType === 'all'
                ? isDark
                  ? 'bg-[#1f202b] text-white'
                  : 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Semua ({transactions.length})
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${
              filterType === 'income'
                ? isDark
                  ? 'bg-[#1f202b] text-white'
                  : 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Pemasukan
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${
              filterType === 'expense'
                ? isDark
                  ? 'bg-[#1f202b] text-white'
                  : 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Pengeluaran
          </button>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="space-y-1.5">
        {filteredTransactions.length === 0 ? (
          <div
            className={`p-10 text-center rounded-xl border border-dashed text-xs text-zinc-400 ${
              isDark ? 'border-[#222430] bg-[#14151b]' : 'border-zinc-300 bg-white'
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
                  ? 'bg-[#14151b] border-[#20222d] hover:border-zinc-700'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md border rounded-2xl p-5 shadow-2xl ${
              isDark ? 'bg-[#15161d] border-[#262836]' : 'bg-white border-zinc-300'
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
                  isDark ? 'bg-[#101116] border-[#222430]' : 'bg-zinc-100 border-zinc-200'
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
                    isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
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
                    isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
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
                      isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
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
                      isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
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
