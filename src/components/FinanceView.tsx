import { formatCurrency } from '../utils/preferences';
import { shiftDateString } from '../utils/date';
import { useToday } from '../hooks/useToday';
import { compareChrono, mergeVisibleOrder } from '../utils/transactions';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  GripVertical,
  X,
} from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { dataService } from '../services/dataService';

interface FinanceViewProps {
  transactions: Transaction[];
  isDark: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const LONG_PRESS_MS = 450;      // tahan selama ini sebelum catatan "terangkat"
const MOVE_CANCEL_PX = 10;      // bergeser sebelum itu = pengguna sedang scroll, bukan drag
const dayOfTx = (t: { transaction_date: string }) => String(t.transaction_date || '').slice(0, 10);

export const FinanceView: React.FC<FinanceViewProps> = ({
  transactions,
  isDark,
  onShowToast,
}) => {
  // "Hari ini" selalu segar (zona waktu profil) dan memicu render ulang saat hari berganti.
  const today = useToday();
  const yesterday = shiftDateString(today, -1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [cashflowPeriod, setCashflowPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('today');
  // null = "ikuti hari ini": otomatis pindah ke hari baru saat tengah malam, tidak tertinggal di kemarin.
  const [dayOverride, setDayOverride] = useState<string | null>(null);
  const [customStartRaw, setCustomStart] = useState<string | null>(null);
  const [customEndRaw, setCustomEnd] = useState<string | null>(null);
  const selectedDay = dayOverride ?? today;
  const customStart = customStartRaw ?? today;
  const customEnd = customEndRaw ?? today;
  const setSelectedDay = (value: string) => setDayOverride(value === today ? null : value);

  // Form State - selalu dikosongkan setiap kali modal dibuka (lihat openCreateModal)
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(today);

  const openCreateModal = () => {
    setType('expense');
    setAmount('');
    setCategory('');          // kategori TIDAK mewarisi isian transaksi sebelumnya
    setDescription('');
    setDate(today);           // tanggal diambil segar saat modal dibuka, bukan nilai saat halaman dimuat
    setIsModalOpen(true);
  };

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
  // Ringkasan Finance di bagian atas selalu menghitung seluruh transaksi,
  // tanpa terpengaruh filter periode Cashflow maupun filter jenis transaksi.
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const currentBalance = totalIncome - totalExpense;

  // Ringkasan Cashflow di bawah mengikuti rentang tanggal yang dipilih.
  const dailyIncome = periodTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const dailyExpense = periodTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const dailyNet = dailyIncome - dailyExpense;

  const formatDateAbs = (value: string) => dateFromLocal(value).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  // Label relatif: "Hari ini" hanya untuk tanggal yang benar-benar hari ini menurut zona waktu profil.
  const formatDateLong = (value: string) => {
    if (value === today) return 'Hari ini';
    if (value === yesterday) return 'Kemarin';
    return formatDateAbs(value);
  };
  const formatPeriodLabel = () => {
    if (cashflowPeriod === 'today') return formatDateLong(selectedDay);
    if (cashflowPeriod === 'all') return 'Sepanjang waktu';
    if (cashflowPeriod === 'custom') {
      const a = dateFromLocal(periodRange.start); const b = dateFromLocal(periodRange.end);
      const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
      return periodRange.start === periodRange.end ? formatDateLong(periodRange.start) : a.getFullYear() === b.getFullYear() ? (a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${b.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}` : `${a.toLocaleDateString('id-ID', opts)} – ${b.toLocaleDateString('id-ID', { ...opts, year: 'numeric' })}`) : `${a.toLocaleDateString('id-ID', { ...opts, year: 'numeric' })} – ${b.toLocaleDateString('id-ID', { ...opts, year: 'numeric' })}`;
    }
    if (cashflowPeriod === 'week') return `Pekan ${formatDateAbs(periodRange.start)} – ${formatDateAbs(periodRange.end)}`;
    if (cashflowPeriod === 'month') return dateFromLocal(today).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return dateFromLocal(today).getFullYear().toString();
  };

  // Urutan waktu: tanggal, lalu urutan dalam hari (bisa diatur manual dengan geser). Mode nominal mengabaikan urutan manual.
  const filteredTransactions = useMemo(() => periodTransactions
    .filter((t) => filterType === 'all' || t.type === filterType)
    .sort((a, b) => {
      if (sortMode === 'newest') return compareChrono(b, a);
      if (sortMode === 'oldest') return compareChrono(a, b);
      if (sortMode === 'highest') return b.amount - a.amount || compareChrono(b, a);
      return a.amount - b.amount || compareChrono(b, a);
    }), [periodTransactions, filterType, sortMode]);

  const selectedDayTransactions = periodTransactions.filter((t) => filterType === 'all' || t.type === filterType);
  const surfaceClass = isDark ? 'bg-[#1A1B1E] border-[#26272B]' : 'bg-white border-[#e5e5e5]';
  const controlClass = isDark ? 'bg-[#0A0A0B] border-[#26272B] text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800';

  // ---------------------------------------------------------------------------
  // Geser untuk mengubah urutan waktu (tekan lama lalu seret; Alt+↑/↓ di keyboard)
  // ---------------------------------------------------------------------------
  const canReorder = (sortMode === 'newest' || sortMode === 'oldest') && filteredTransactions.length > 1;
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const draggingRef = useRef<string | null>(null);
  const dragOrderRef = useRef<string[] | null>(null);
  const pressRef = useRef<{ timer: number; id: string; x: number; y: number } | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  // Data terbaru untuk listener window (dibuat sekali) agar tidak memakai nilai usang.
  const latest = useRef({ filteredTransactions, transactions, sortMode, canReorder, onShowToast });
  latest.current = { filteredTransactions, transactions, sortMode, canReorder, onShowToast };

  const commitOrder = (draggedId: string, displayOrder: string[]) => {
    const { transactions: all, sortMode: mode, onShowToast: toast } = latest.current;
    const dragged = all.find((t) => t.id === draggedId);
    if (!dragged) return;
    const day = dayOfTx(dragged);
    const byId = new Map(all.map((t) => [t.id, t] as const));
    // Catatan hari itu yang terlihat (setelah filter), sesuai urutan tampilan baru -> kronologis naik.
    const visibleDay = displayOrder.filter((id) => { const t = byId.get(id); return t && dayOfTx(t) === day; });
    const visibleChrono = mode === 'newest' ? [...visibleDay].reverse() : visibleDay;
    // Urutan lengkap hari itu (termasuk yang tersaring filter): yang tersaring tetap di slot-nya.
    const fullChrono = all.filter((t) => dayOfTx(t) === day).sort(compareChrono).map((t) => t.id);
    const result = mergeVisibleOrder(fullChrono, visibleChrono);
    if (result.every((id, i) => id === fullChrono[i])) return;
    const ok = dataService.reorderTransactions(result);
    toast?.(ok ? 'Urutan waktu catatan diperbarui' : 'Urutan tidak dapat diubah', ok ? 'success' : 'error');
  };

  const stopLoop = () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = 0; };

  /** Bandingkan posisi pointer dengan baris di bawahnya; bila perlu, tukar posisi catatan yang sedang diseret. */
  const applyHover = () => {
    const activeId = draggingRef.current;
    const current = dragOrderRef.current;
    if (!activeId || !current) return;
    const { x, y } = pointerRef.current;
    // Hit-test geometris pada kotak tiap baris (bukan elementFromPoint): tetap akurat walau ada anak elemen meluap/menimpa.
    const over = (Array.from(document.querySelectorAll('[data-tx-id]')) as HTMLElement[]).find((row) => {
      const r = row.getBoundingClientRect();
      return y >= r.top && y <= r.bottom && x >= r.left - 24 && x <= r.right + 24;
    }) ?? null;
    const overId = over?.dataset.txId;
    if (!over || !overId || overId === activeId) return;
    const from = current.indexOf(activeId);
    const to = current.indexOf(overId);
    const map = new Map(latest.current.transactions.map((t) => [t.id, t] as const));
    const activeTx = map.get(activeId);
    const overTx = map.get(overId);
    // Hanya boleh bertukar di dalam hari yang sama (tanggal transaksi tidak diubah oleh fitur ini).
    if (from < 0 || to < 0 || !activeTx || !overTx || dayOfTx(activeTx) !== dayOfTx(overTx)) return;
    const rect = over.getBoundingClientRect();
    // Histeresis: baru bertukar setelah melewati ±40% tinggi baris (mencegah berkedip).
    const passed = to > from ? y >= rect.top + rect.height * 0.4 : y <= rect.bottom - rect.height * 0.4;
    if (!passed) return;
    const next = [...current];
    next.splice(from, 1);
    next.splice(to, 0, activeId);
    dragOrderRef.current = next;
    setDragOrder(next);
  };

  const dragLoop = () => {
    if (!draggingRef.current) return;
    const { y } = pointerRef.current;
    // Gulir otomatis saat jari/kursor dekat tepi layar.
    const edge = 90;
    if (y < edge) window.scrollBy(0, -Math.ceil((edge - y) / 5));
    else if (y > window.innerHeight - edge) window.scrollBy(0, Math.ceil((y - (window.innerHeight - edge)) / 5));
    applyHover(); // juga saat layar bergulir sementara jari diam
    rafRef.current = requestAnimationFrame(dragLoop);
  };

  const beginDrag = (id: string) => {
    pressRef.current = null;
    if (!latest.current.canReorder) return;
    const order = latest.current.filteredTransactions.map((t) => t.id);
    draggingRef.current = id;
    dragOrderRef.current = order;
    setDragOrder(order);
    setDragId(id);
    try { navigator.vibrate?.(25); } catch { /* tidak semua perangkat mendukung getar */ }
    stopLoop();
    rafRef.current = requestAnimationFrame(dragLoop);
  };

  const finishDrag = (commit: boolean) => {
    if (pressRef.current) { window.clearTimeout(pressRef.current.timer); pressRef.current = null; }
    const id = draggingRef.current;
    if (!id) return;
    const finalOrder = dragOrderRef.current;
    draggingRef.current = null;
    dragOrderRef.current = null;
    stopLoop();
    setDragId(null);
    setDragOrder(null);
    if (commit && finalOrder) commitOrder(id, finalOrder);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      if (draggingRef.current) { applyHover(); return; } // respons langsung, tanpa menunggu frame animasi
      const press = pressRef.current;
      // Bergeser sebelum tahan lama selesai = pengguna sedang scroll: batalkan, jangan drag.
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > MOVE_CANCEL_PX) {
        window.clearTimeout(press.timer);
        pressRef.current = null;
      }
    };
    const onUp = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      if (draggingRef.current) applyHover(); // evaluasi terakhir tepat di titik lepas
      finishDrag(true);
    };
    const onCancel = () => finishDrag(false);
    // Saat drag aktif, cegah halaman ikut ter-scroll oleh sentuhan.
    const onTouchMove = (e: TouchEvent) => { if (draggingRef.current) e.preventDefault(); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('touchmove', onTouchMove);
      stopLoop();
      if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    };
  }, []);

  // Pindah mode urut/filter saat drag = batalkan.
  useEffect(() => { if (!canReorder) finishDrag(false); }, [canReorder]);

  const startPress = (e: React.PointerEvent, tx: Transaction) => {
    if (!canReorder) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    pointerRef.current = { x: e.clientX, y: e.clientY };
    if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    pressRef.current = { id: tx.id, x: e.clientX, y: e.clientY, timer: window.setTimeout(() => beginDrag(tx.id), LONG_PRESS_MS) };
  };

  // Alternatif keyboard: Alt+↑ / Alt+↓ menggeser satu langkah (di tampilan) dalam hari yang sama.
  const handleRowKeyDown = (e: React.KeyboardEvent, tx: Transaction) => {
    if (!canReorder || !e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const ids = filteredTransactions.map((t) => t.id);
    const from = ids.indexOf(tx.id);
    const to = from + (e.key === 'ArrowUp' ? -1 : 1);
    const neighbor = filteredTransactions[to];
    if (!neighbor || dayOfTx(neighbor) !== dayOfTx(tx)) { onShowToast?.('Urutan hanya dapat diubah di dalam hari yang sama.', 'info'); return; }
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, tx.id);
    commitOrder(tx.id, next);
  };

  const displayedTransactions = useMemo(() => {
    if (!dragOrder) return filteredTransactions;
    const byId = new Map(filteredTransactions.map((t) => [t.id, t] as const));
    return dragOrder.map((id) => byId.get(id)).filter((t): t is Transaction => Boolean(t));
  }, [dragOrder, filteredTransactions]);

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) return;
    if (numAmount > 9_999_999_999_999) { onShowToast?.('Nominal terlalu besar.', 'error'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { onShowToast?.('Tanggal transaksi tidak valid.', 'error'); return; }

    try {
      dataService.createTransaction({
        type,
        amount: numAmount,
        category: category.trim(),
        description: description.trim() || (type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
        transaction_date: date,
      });
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : 'Transaksi gagal dicatat.', 'error');
      return;
    }

    if (onShowToast) {
      onShowToast(
        `Transaksi ${formatCurrency(numAmount)} dicatat`,
        'success'
      );
    }

    setAmount('');
    setDescription('');
    setCategory('');
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
          onClick={openCreateModal}
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
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto" aria-label="Pilih tanggal cashflow">
              <button type="button" onClick={() => { setSelectedDay(shiftDateString(selectedDay, -1)); setCashflowPeriod('today'); }} aria-label="Hari sebelumnya" title="Hari sebelumnya" className={`h-10 w-10 shrink-0 rounded-lg border flex items-center justify-center ${isDark ? 'border-[#26272B] bg-[#0A0A0B] hover:bg-[#232428]' : 'border-zinc-200 bg-white hover:bg-zinc-100'}`}><ChevronLeft className="h-4 w-4" /></button>
              <div className={`flex h-10 flex-1 sm:flex-none sm:w-[250px] min-w-0 items-center justify-center rounded-lg border px-3 text-center ${isDark ? 'border-[#26272B] bg-[#0A0A0B]' : 'border-zinc-200 bg-white'}`}>
                <span className={`truncate text-xs font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>{formatDateLong(selectedDay)}</span>
              </div>
              <button type="button" onClick={() => { setSelectedDay(shiftDateString(selectedDay, 1)); setCashflowPeriod('today'); }} aria-label="Hari berikutnya" title="Hari berikutnya" className={`h-10 w-10 shrink-0 rounded-lg border flex items-center justify-center ${isDark ? 'border-[#26272B] bg-[#0A0A0B] hover:bg-[#232428]' : 'border-zinc-200 bg-white hover:bg-zinc-100'}`}><ChevronRight className="h-4 w-4" /></button>
              <label className={`relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border ${isDark ? 'border-[#26272B] bg-[#0A0A0B] hover:bg-[#232428]' : 'border-zinc-200 bg-white hover:bg-zinc-100'}`} title="Pilih tanggal tertentu" aria-label="Pilih tanggal tertentu">
                <Calendar className="h-4 w-4 text-zinc-400" />
                <input type="date" aria-label="Pilih tanggal cashflow" value={selectedDay} onChange={(e) => { if (e.target.value) { setSelectedDay(e.target.value); setCashflowPeriod('today'); } }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </label>
            </div>
            {([['week', 'Minggu ini'], ['month', 'Bulanan'], ['year', 'Tahunan'], ['all', 'All time']] as const).map(([value, label]) => (
              <button key={value} onClick={() => setCashflowPeriod(value)} className={`rounded-lg px-3 py-2 text-xs font-medium ${cashflowPeriod === value ? 'bg-lime-600 text-white' : isDark ? 'bg-[#0A0A0B] text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>{label}</button>
            ))}
            <button type="button" onClick={() => setCashflowPeriod('custom')} className={`rounded-lg px-3 py-2 text-xs font-medium ${cashflowPeriod === 'custom' ? 'bg-lime-600 text-white' : isDark ? 'bg-[#0A0A0B] text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>Kustom</button>
          </div>
        </div>
        {cashflowPeriod === 'custom' && (
          <div className={`mt-3 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-end ${isDark ? 'border-[#26272B] bg-[#0A0A0B]' : 'border-zinc-200 bg-zinc-50'}`}>
            <div className="flex-1">
              <label htmlFor="cashflow-custom-start" className="mb-1 block text-xs text-zinc-500">Tanggal awal</label>
              <input id="cashflow-custom-start" type="date" value={customStart} max={customEnd} onChange={(e) => e.target.value && setCustomStart(e.target.value)} className={`w-full rounded-lg border p-2 text-sm ${isDark ? 'border-[#26272B] bg-[#1F2024] text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'}`} />
            </div>
            <div className="flex-1">
              <label htmlFor="cashflow-custom-end" className="mb-1 block text-xs text-zinc-500">Tanggal akhir</label>
              <input id="cashflow-custom-end" type="date" value={customEnd} min={customStart} onChange={(e) => e.target.value && setCustomEnd(e.target.value)} className={`w-full rounded-lg border p-2 text-sm ${isDark ? 'border-[#26272B] bg-[#1F2024] text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'}`} />
            </div>
            <button type="button" onClick={() => { setCustomStart(null); setCustomEnd(null); setDayOverride(null); setCashflowPeriod('today'); }} className={`rounded-lg px-3 py-2 text-xs font-medium ${isDark ? 'bg-[#232428] text-zinc-200' : 'bg-white text-zinc-700 border border-zinc-200'}`}>Kembali ke hari ini</button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className={`rounded-xl p-3 ${isDark ? 'bg-[#0A0A0B]' : 'bg-[#f7f7f7]'}`}>
            <p className="text-xs text-zinc-500">Total pemasukan</p>
            <p className="mt-1 text-base font-semibold text-emerald-500">+ {formatCurrency(dailyIncome)}</p>
          </div>
          <div className={`rounded-xl p-3 ${isDark ? 'bg-[#0A0A0B]' : 'bg-[#f7f7f7]'}`}>
            <p className="text-xs text-zinc-500">Total pengeluaran</p>
            <p className="mt-1 text-base font-semibold text-rose-500">− {formatCurrency(dailyExpense)}</p>
          </div>
          <div className={`rounded-xl p-3 ${isDark ? 'bg-[#0A0A0B]' : 'bg-[#f7f7f7]'}`}>
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
          <div className={`flex flex-wrap items-center gap-1 rounded-xl p-1 ${isDark ? 'bg-[#0A0A0B]' : 'bg-[#f7f7f7]'}`}>
            {([
              ['all', `Semua (${periodTransactions.length})`],
              ['income', 'Pemasukan'],
              ['expense', 'Pengeluaran'],
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => setFilterType(value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterType === value ? (isDark ? 'bg-[#26272B] text-white' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-500 hover:text-current'}`}>
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

      {/* Petunjuk geser urutan */}
      <p className="text-[11px] text-zinc-500 -mb-2 px-1">
        {canReorder
          ? ''
          : sortMode === 'highest' || sortMode === 'lowest'
            ? 'Urutan manual aktif saat diurutkan berdasarkan waktu (terbaru/terlama).'
            : ''}
      </p>

      {/* Transactions Table / List */}
      <div className="space-y-1.5">
        {filteredTransactions.length === 0 ? (
          <div
            className={`p-10 text-center rounded-xl border border-dashed text-xs text-zinc-400 ${
              isDark ? 'border-[#26272B] bg-[#1A1B1E]' : 'border-zinc-300 bg-white'
            }`}
          >
            Belum ada transaksi pada kategori ini.
          </div>
        ) : (
          displayedTransactions.map((tx, index) => {
            const isDragging = dragId === tx.id;
            const day = dayOfTx(tx);
            const showDayHeader = cashflowPeriod !== 'today' && (index === 0 || dayOfTx(displayedTransactions[index - 1]) !== day);
            return (
            <React.Fragment key={tx.id}>
            {showDayHeader && (
              <p className={`pt-2 px-1 text-[11px] font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{formatDateLong(day)}</p>
            )}
            <div
              data-tx-id={tx.id}
              tabIndex={canReorder ? 0 : undefined}
              onPointerDown={(e) => startPress(e, tx)}
              onKeyDown={(e) => handleRowKeyDown(e, tx)}
              onContextMenu={(e) => { if (draggingRef.current || pressRef.current) e.preventDefault(); }}
              style={canReorder ? { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } : undefined}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${canReorder ? 'cursor-grab' : ''} ${
                isDragging
                  ? 'relative z-10 scale-[1.02] shadow-xl ring-2 ring-lime-400 cursor-grabbing'
                  : isDark
                    ? 'bg-[#1A1B1E] border-[#26272B] hover:border-zinc-500'
                    : 'bg-white border-zinc-200 hover:border-zinc-400 shadow-2xs'
              } ${isDragging ? (isDark ? 'bg-[#232428] border-[#26272B]' : 'bg-white border-zinc-300') : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {canReorder && <GripVertical aria-hidden="true" className="w-4 h-4 shrink-0 text-zinc-500" />}
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
                    {tx.category || 'Tanpa kategori'} • {formatDateLong(day)}
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
                  aria-label="Hapus catatan"
                  className="p-1 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-zinc-800/50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            </React.Fragment>
            );
          })
        )}
      </div>

      {/* Modal Catat Transaksi */}
      {isModalOpen && (
        <div onMouseDown={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md border rounded-2xl p-5 shadow-2xl ${
              isDark ? 'bg-[#1A1B1E] border-[#26272B]' : 'bg-white border-zinc-300'
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
                  isDark ? 'bg-[#0A0A0B] border-[#26272B]' : 'bg-zinc-100 border-zinc-200'
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
                  Nominal *
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
                    isDark ? 'bg-[#0A0A0B] border-[#26272B] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
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
                    isDark ? 'bg-[#0A0A0B] border-[#26272B] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
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
                      isDark ? 'bg-[#0A0A0B] border-[#26272B] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-zinc-400">Tanggal</label>
                    <button
                      type="button"
                      onClick={() => setDate(today)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        isDark ? 'border-[#26272B] text-zinc-400 hover:text-zinc-100' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      Hari ini
                    </button>
                  </div>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden ${
                      isDark ? 'bg-[#0A0A0B] border-[#26272B] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    }`}
                  />
                  <p className={`mt-1 text-[10px] ${date === today ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {date === today ? 'Hari ini' : `${date === yesterday ? 'Kemarin' : 'Bukan hari ini'} · hari ini: ${today}`}
                  </p>
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
