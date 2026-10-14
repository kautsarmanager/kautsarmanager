import React, { useState } from 'react';
import {
  Heart,
  Plus,
  Coins,
  CheckCircle2,
  Trash2,
  X,
} from 'lucide-react';
import { WishlistItem } from '../types';
import { dataService } from '../services/dataService';

interface WishlistViewProps {
  wishlist: WishlistItem[];
  isDark: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({ wishlist, isDark, onShowToast }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [depositModalItem, setDepositModalItem] = useState<WishlistItem | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('100000');

  // New wishlist state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [initialSaved, setInitialSaved] = useState('0');
  const [deadline, setDeadline] = useState('');

  const formatCurrency = (val: number) => 'Rp' + val.toLocaleString('id-ID');

  const handleCreateWishlist = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetPrice);
    const saved = parseFloat(initialSaved || '0');
    if (!name.trim() || isNaN(target) || target <= 0) return;

    dataService.createWishlistItem({
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      target_price: target,
      saved_amount: isNaN(saved) ? 0 : saved,
      deadline: deadline || undefined,
    });

    if (onShowToast) {
      onShowToast(`Target "${name.trim()}" ditambahkan`, 'success');
    }

    setName('');
    setDescription('');
    setTargetPrice('');
    setInitialSaved('0');
    setDeadline('');
    setIsModalOpen(false);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalItem) return;
    const add = parseFloat(depositAmount);
    if (isNaN(add) || add <= 0) return;

    dataService.updateWishlistDeposit(depositModalItem.id, add);
    if (onShowToast) {
      onShowToast(
        `Tabungan +Rp${add.toLocaleString('id-ID')} untuk "${depositModalItem.name}"`,
        'success'
      );
    }
    setDepositModalItem(null);
    setDepositAmount('100000');
  };

  const handleDelete = (item: WishlistItem) => {
    if (!window.confirm(`Hapus target wishlist "${item.name}"?`)) return;
    dataService.deleteWishlistItem(item.id);
    if (onShowToast) {
      onShowToast(`Target "${item.name}" dihapus`, 'info');
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-lg sm:text-xl font-semibold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Wishlist & Target
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Pantau progres tabungan barang dan target yang ingin Anda beli.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-lime-600 hover:bg-lime-500 text-white shadow-xs shadow-lime-600/30 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Target</span>
        </button>
      </div>

      {/* Grid items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {wishlist.length === 0 ? (
          <div
            className={`col-span-full p-10 text-center rounded-xl border border-dashed text-xs text-zinc-400 ${
              isDark ? 'border-[#222430] bg-[#14151b]' : 'border-zinc-300 bg-white'
            }`}
          >
            Belum ada target wishlist yang dicatat.
          </div>
        ) : (
          wishlist.map((item) => {
            const pct = Math.min(100, Math.round((item.saved_amount / (item.target_price || 1)) * 100));
            const isCompleted = item.completed || pct >= 100;
            const remaining = Math.max(0, item.target_price - item.saved_amount);

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  isDark
                    ? 'bg-[#14151b] border-[#20222d] hover:border-zinc-700'
                    : 'bg-white border-zinc-200 hover:border-zinc-400 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                        isDark ? 'bg-[#101116] text-zinc-400 border-[#222430]' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                      }`}
                    >
                      {item.category}
                    </span>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Tercapai
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-lime-400">{pct}%</span>
                    )}
                  </div>

                  <h3 className={`text-xs font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className={`text-[11px] mt-1 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {item.description}
                    </p>
                  )}

                  {/* Clean Minimal Progress Bar */}
                  <div
                    className={`w-full h-1.5 rounded-full mt-3 overflow-hidden ${
                      isDark ? 'bg-zinc-800' : 'bg-zinc-200'
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-400' : 'bg-lime-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-inherit text-xs font-mono">
                    <div>
                      <p className="text-[10px] text-zinc-500">Terkumpul</p>
                      <p className="font-semibold text-emerald-400">
                        {formatCurrency(item.saved_amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500">Target</p>
                      <p className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                        {formatCurrency(item.target_price)}
                      </p>
                    </div>
                  </div>

                  {!isCompleted && (
                    <p className="text-[10px] font-mono text-zinc-500 mt-1.5">
                      Kurang {formatCurrency(remaining)}
                      {item.deadline ? ` (Target: ${item.deadline})` : ''}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-inherit">
                  <button
                    onClick={() => setDepositModalItem(item)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>+ Tabungan</span>
                  </button>

                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-zinc-800/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tabungan / Deposit */}
      {depositModalItem && (
        <div onMouseDown={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm border rounded-2xl p-5 shadow-2xl ${
              isDark ? 'bg-[#15161d] border-[#262836]' : 'bg-white border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <h2 className="text-sm font-semibold">Tambah Tabungan</h2>
              <button
                onClick={() => setDepositModalItem(null)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4 mt-4 text-xs">
              <p className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                Alokasi untuk: <span className="font-semibold">{depositModalItem.name}</span>
              </p>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Nominal Tambahan (Rp)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-sm focus:outline-hidden focus:ring-1 focus:ring-lime-500 ${
                    isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  }`}
                />
              </div>

              <div className="flex gap-1.5">
                {[50000, 100000, 250000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt.toString())}
                    className={`flex-1 py-1 rounded-md border text-[10px] font-mono transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-[#101116] border-[#222430] text-zinc-300 hover:text-white'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-black'
                    }`}
                  >
                    +{(amt / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setDepositModalItem(null)}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-lime-600 hover:bg-lime-500 text-white font-medium shadow-xs shadow-lime-600/30 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Simpan Tabungan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Buat Target Wishlist Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md border rounded-2xl p-5 shadow-2xl ${
              isDark ? 'bg-[#15161d] border-[#262836]' : 'bg-white border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <h2 className="text-sm font-semibold">Tambah Target Wishlist</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWishlist} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Nama Barang / Target *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Laptop Baru"
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
                  placeholder="Kebutuhan atau catatan spesifikasi..."
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden focus:ring-1 focus:ring-lime-500 ${
                    isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Target Harga (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="10000000"
                    className={`w-full px-3 py-2 rounded-lg border font-mono focus:outline-hidden ${
                      isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Tabungan Awal (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={initialSaved}
                    onChange={(e) => setInitialSaved(e.target.value)}
                    placeholder="0"
                    className={`w-full px-3 py-2 rounded-lg border font-mono focus:outline-hidden ${
                      isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
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
                    placeholder="Elektronik, Kuliah..."
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden ${
                      isDark ? 'bg-[#101116] border-[#242633] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Target Tanggal
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
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
                  Simpan Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
