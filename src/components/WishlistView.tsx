import { formatCurrency } from '../utils/preferences';
import React, { useState } from 'react';
import {
  Heart,
  Plus,
  Coins,
  CheckCircle2,
  Trash2,
  X,
  Pencil,
} from 'lucide-react';
import { WishlistItem, WishlistSubTarget } from '../types';
import { dataService } from '../services/dataService';

interface WishlistViewProps {
  wishlist: WishlistItem[];
  isDark: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({ wishlist, isDark, onShowToast }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [subtargets, setSubtargets] = useState<WishlistSubTarget[]>([]);
  const [depositModalItem, setDepositModalItem] = useState<WishlistItem | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('100000');

  // New wishlist state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [initialSaved, setInitialSaved] = useState('');
  const [deadline, setDeadline] = useState('');


  const handleCreateWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = Math.max(0, Number(targetPrice) || 0);
    const saved = Math.max(0, Number(initialSaved) || 0);
    if (!name.trim()) return;

    const cleanSubtargets = subtargets.filter((subtarget) => subtarget.title.trim()).map((subtarget) => ({ ...subtarget, title: subtarget.title.trim(), amount: subtarget.amount === null || subtarget.amount === undefined ? null : Math.max(0, Number(subtarget.amount) || 0) }));
    const totalTarget = target + cleanSubtargets.reduce((sum, subtarget) => sum + (Number(subtarget.amount) || 0), 0);
    try {
      if (editingItem) {
        await dataService.updateWishlistItem(editingItem.id, {
          name: name.trim(), description: description.trim(), category: category.trim(),
          base_target_price: target, target_price: totalTarget, saved_amount: isNaN(saved) ? 0 : saved,
          deadline: deadline || null, subtasks: cleanSubtargets,
        });
        onShowToast?.(`Target "${name.trim()}" tersimpan di Supabase`, 'success');
      } else {
        await dataService.createWishlistItem({
          name: name.trim(), description: description.trim(), category: category.trim(),
          base_target_price: target, target_price: totalTarget, saved_amount: isNaN(saved) ? 0 : saved,
          deadline: deadline || null, subtasks: cleanSubtargets,
        });
        onShowToast?.(`Target "${name.trim()}" tersimpan di Supabase`, 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operasi Wishlist gagal.';
      onShowToast?.(message, 'error');
    }

    setName('');
    setDescription('');
    setTargetPrice('');
    setInitialSaved('');
    setDeadline('');
    setSubtargets([]);
    setEditingItem(null);
    setIsModalOpen(false);
  };

  const openEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setName(item.name); setDescription(item.description || ''); setCategory(item.category || '');
    setTargetPrice((item.base_target_price ?? Math.max(0, item.target_price - (item.subtasks || []).reduce((sum, subtarget) => sum + (Number(subtarget.amount) || 0), 0))) ? String(item.base_target_price ?? Math.max(0, item.target_price - (item.subtasks || []).reduce((sum, subtarget) => sum + (Number(subtarget.amount) || 0), 0))) : ''); setInitialSaved(item.saved_amount ? String(item.saved_amount) : '');
    setDeadline(item.deadline || '');
    setSubtargets((item.subtasks || []).map((subtask) => ({ ...subtask, amount: Number(subtask.amount) || 0 })));
    setIsModalOpen(true);
  };

  const closeWishlistModal = () => {
    setIsModalOpen(false); setEditingItem(null); setName(''); setDescription(''); setCategory('');
    setTargetPrice(''); setInitialSaved(''); setDeadline(''); setSubtargets([]);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalItem) return;
    const add = parseFloat(depositAmount);
    if (isNaN(add) || add <= 0) return;

    try {
      await dataService.updateWishlistDeposit(depositModalItem.id, add);
      onShowToast?.(`Tabungan +${formatCurrency(add)} untuk "${depositModalItem.name}" tersimpan di Supabase`, 'success');
      setDepositModalItem(null);
      setDepositAmount('100000');
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : 'Gagal menyimpan tabungan.', 'error');
    }
  };

  const handleDelete = async (item: WishlistItem) => {
    if (!window.confirm(`Hapus target wishlist "${item.name}"?`)) return;
    try {
      await dataService.deleteWishlistItem(item.id);
      onShowToast?.(`Target "${item.name}" dihapus dari Supabase`, 'success');
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : 'Gagal menghapus target.', 'error');
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
              isDark ? 'border-[#424242] bg-[#2f2f2f]' : 'border-zinc-300 bg-white'
            }`}
          >
            Belum ada target wishlist yang dicatat.
          </div>
        ) : (
          wishlist.map((item) => {
            const pct = item.target_price > 0 ? Math.min(100, Math.round((item.saved_amount / item.target_price) * 100)) : 0;
            const isCompleted = item.completed || pct >= 100;
            const remaining = Math.max(0, item.target_price - item.saved_amount);

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  isDark
                    ? 'bg-[#2f2f2f] border-[#424242] hover:border-zinc-700'
                    : 'bg-white border-zinc-200 hover:border-zinc-400 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                        isDark ? 'bg-[#171717] text-zinc-400 border-[#424242]' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
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

                  {(item.subtasks || []).length > 0 && (
                    <div className={`mt-3 rounded-lg p-2.5 space-y-2 ${isDark ? 'bg-[#171717]' : 'bg-zinc-50'}`}>
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">Rincian sub-target</p>
                      {(item.subtasks || []).map((subtarget) => (
                        <div key={subtarget.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <label className="flex min-w-0 items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={subtarget.completed} onChange={() => { void dataService.toggleWishlistSubtask(item.id, subtarget.id).then(() => onShowToast?.('Status sub-target tersimpan di Supabase', 'success')).catch((error) => onShowToast?.(error instanceof Error ? error.message : 'Gagal menyimpan status sub-target.', 'error')); }} className="accent-lime-500" />
                            <span className={subtarget.completed ? 'line-through opacity-60' : ''}>{subtarget.title}</span>
                          </label>
                          <span className="shrink-0 font-mono text-zinc-400">{formatCurrency(subtarget.amount || 0)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-inherit pt-2 text-[10px] text-zinc-500"><span>Dana utama + sub-target</span><span className="font-semibold text-lime-400">{formatCurrency(item.target_price)}</span></div>
                    </div>
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

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(item)}
                      title="Edit target"
                      className="p-1 text-zinc-500 hover:text-lime-400 rounded-md hover:bg-zinc-800/50 transition-colors"
                    ><Pencil className="w-3.5 h-3.5" /></button>
                    <button
                    onClick={() => handleDelete(item)}
                    className="p-1 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-zinc-800/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tabungan / Deposit */}
      {depositModalItem && (
        <div onMouseDown={(e) => { if (e.target === e.currentTarget) setDepositModalItem(null); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm border rounded-2xl p-5 shadow-2xl ${
              isDark ? 'bg-[#2f2f2f] border-[#424242]' : 'bg-white border-zinc-300'
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
                  Nominal Tambahan
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-sm focus:outline-hidden focus:ring-1 focus:ring-lime-500 ${
                    isDark ? 'bg-[#171717] border-[#424242] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
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
                        ? 'bg-[#171717] border-[#424242] text-zinc-300 hover:text-white'
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
        <div onMouseDown={(e) => { if (e.target === e.currentTarget) closeWishlistModal(); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md border rounded-2xl p-5 shadow-2xl ${
              isDark ? 'bg-[#2f2f2f] border-[#424242]' : 'bg-white border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <h2 className="text-sm font-semibold">{editingItem ? 'Edit Target Wishlist' : 'Tambah Target Wishlist'}</h2>
              <button
                onClick={closeWishlistModal}
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
                  placeholder="Contoh: Liburan ke Bali"
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden focus:ring-1 focus:ring-lime-500 ${
                    isDark ? 'bg-[#171717] border-[#424242] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
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
                    isDark ? 'bg-[#171717] border-[#424242] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Dana utama — opsional
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="Kosongkan jika tidak ada"
                    className={`w-full px-3 py-2 rounded-lg border font-mono focus:outline-hidden ${
                      isDark ? 'bg-[#171717] border-[#424242] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Tabungan Awal
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={initialSaved}
                    onChange={(e) => setInitialSaved(e.target.value)}
                    placeholder="Kosong"
                    className={`w-full px-3 py-2 rounded-lg border font-mono focus:outline-hidden ${
                      isDark ? 'bg-[#171717] border-[#424242] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
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
                      isDark ? 'bg-[#171717] border-[#424242] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
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
                      isDark ? 'bg-[#171717] border-[#424242] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
                </div>
              </div>

              <div className={`rounded-xl border p-3 space-y-3 ${isDark ? 'border-[#292c3a] bg-[#171717]' : 'border-zinc-200 bg-zinc-50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div><label className="block text-[11px] font-semibold text-zinc-300">Sub-target dan dana</label><p className="text-[10px] text-zinc-500">Total target otomatis menjumlahkan dana utama dan seluruh sub-target.</p></div>
                  <button type="button" onClick={() => setSubtargets((current) => [...current, { id: crypto.randomUUID(), title: '', amount: null, completed: false }])} className="shrink-0 rounded-lg bg-lime-600 px-2.5 py-1.5 text-[11px] font-semibold text-white">+ Tambah</button>
                </div>
                {subtargets.length === 0 && <p className="text-[11px] text-zinc-500">Belum ada sub-target. Contoh: Dana bensin, dana logistik.</p>}
                {subtargets.map((subtarget, index) => (
                  <div key={subtarget.id} className="grid grid-cols-[minmax(0,1fr)_120px_28px] gap-2 items-center">
                    <input value={subtarget.title} onChange={(e) => setSubtargets((current) => current.map((entry) => entry.id === subtarget.id ? { ...entry, title: e.target.value } : entry))} placeholder={index === 0 ? 'Dana bensin' : 'Nama sub-target'} className={`min-w-0 px-2.5 py-2 rounded-lg border text-xs ${isDark ? 'bg-[#0c0d12] border-[#292c3a] text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`} />
                    <input type="number" min="0" step="1000" value={subtarget.amount ?? ''} onChange={(e) => setSubtargets((current) => current.map((entry) => entry.id === subtarget.id ? { ...entry, amount: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) } : entry))} placeholder="Nominal dana" aria-label={`Dana sub-target ${index + 1}`} className={`w-full px-2 py-2 rounded-lg border text-xs font-mono ${isDark ? 'bg-[#0c0d12] border-[#292c3a] text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`} />
                    <button type="button" onClick={() => setSubtargets((current) => current.filter((entry) => entry.id !== subtarget.id))} title="Hapus sub-target" className="p-1 text-zinc-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <div className="flex justify-between border-t border-inherit pt-2 text-xs"><span className="text-zinc-500">Total dana target</span><strong className="font-mono text-lime-400">{formatCurrency((Number(targetPrice) || 0) + subtargets.reduce((sum, subtarget) => sum + (Number(subtarget.amount) || 0), 0))}</strong></div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-inherit">
                <button
                  type="button"
                  onClick={closeWishlistModal}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-lime-600 hover:bg-lime-500 text-white font-medium shadow-xs shadow-lime-600/30 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
