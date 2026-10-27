import { formatCurrency } from '../utils/preferences';
import { getLocalDateString } from '../utils/date';
import {
  Task,
  Transaction,
  FileItem,
  WishlistItem,
  UserProfile,
  ActivityItem,
  DashboardSummary,
} from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEYS = {
  TASKS: 'pms_tasks',
  TRANSACTIONS: 'pms_transactions',
  FILES: 'pms_files',
  WISHLIST: 'pms_wishlist',
  PROFILE: 'pms_profile',
  ACTIVITIES: 'pms_activities',
  CACHE_TIMESTAMP: 'pms_cache_timestamp',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_AMOUNT = 9_999_999_999_999; // batas numeric(15,2)
const MAX_SYNC_ATTEMPTS = 10;
const PERMANENT_ERROR_CODES = new Set(['22P02', '22003', '22007', '23502', '23503', '23514', '42501', 'PGRST204', 'PGRST102']);
const ALLOWED_UPLOAD_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'docx', 'pptx', 'xlsx']);

interface OutboxEntry {
  queueId: string;
  table: string;
  operation: 'upsert' | 'delete' | 'soft_delete' | 'storage_delete';
  payload?: unknown;
  recordId?: string;
  attempts?: number;
  lastError?: string;
}

function cleanText(value: unknown, max: number, fallback = ''): string {
  return String(value ?? '').trim().slice(0, max) || fallback;
}

function cleanAmount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n * 100) / 100, MAX_AMOUNT);
}

const EMPTY_PROFILE = (userId: string, username: string, email = ''): UserProfile => ({
  id: userId,
  name: username,
  email,
  currency: 'IDR',
  timezone: 'Asia/Jakarta (WIB)',
  theme: 'light',
  is_online: true,
  sync_status: 'pending',
  last_synced_at: undefined,
});

class DataService {
  private listeners: Array<() => void> = [];
  private activeUserId: string | null = null;
  // Cloud writes are enabled when a valid Supabase session/configuration exists.
  // LocalStorage remains a cache; durable offline queue is a later phase.
  private cloudWritesEnabled = true;
  private realtimeChannel: RealtimeChannel | null = null;
  private isFlushingOutbox = false;

  constructor() {
    // Data is initialized only after a user session is known.
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { void this.flushOutbox().then(() => this.syncFromSupabaseBackground()); });
      // Realtime delivery depends on the Supabase project's publication/RLS configuration.
      // Poll as a safe fallback so another device's changes still appear if Realtime is not enabled.
      window.addEventListener('focus', () => { void this.syncFromSupabaseBackground(); });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void this.syncFromSupabaseBackground();
      });
      window.setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine && this.activeUserId) {
          void this.syncFromSupabaseBackground();
        }
      }, 30000);
    }
  }

  private key(baseKey: string): string {
    return this.activeUserId ? `${baseKey}:${this.activeUserId}` : baseKey;
  }

  public setActiveUser(user: { id: string; username: string; email?: string } | null) {
    if (!user) {
      if (this.realtimeChannel && supabase) { void supabase.removeChannel(this.realtimeChannel); this.realtimeChannel = null; }
      this.activeUserId = null;
      this.notify();
      return;
    }

    const previousUserId = this.activeUserId;
    this.activeUserId = user.id;

    // Never auto-assign legacy global data to an account: it could belong to another person.
    // Keep legacy keys untouched so the user can export/restore them deliberately.
    if (!localStorage.getItem(this.key(STORAGE_KEYS.PROFILE))) {
      this.initDefaultsForUser(user);
    } else {
      this.ensureProfileMatchesUser(user);
    }

    if (previousUserId !== user.id && isSupabaseConfigured && supabase) {
      if (this.realtimeChannel) void supabase.removeChannel(this.realtimeChannel);
      void this.flushOutbox().then(() => this.syncFromSupabaseBackground());
      this.realtimeChannel = supabase.channel(`pms-user-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, () => void this.syncFromSupabaseBackground())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => void this.syncFromSupabaseBackground())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: `user_id=eq.${user.id}` }, () => void this.syncFromSupabaseBackground())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_items', filter: `user_id=eq.${user.id}` }, () => void this.syncFromSupabaseBackground())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => void this.syncFromSupabaseBackground())
        .subscribe((status: string, error?: Error) => {
          if (status === 'SUBSCRIBED') {
            // Fetch a fresh snapshot after joining, covering changes made before subscription.
            void this.syncFromSupabaseBackground();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`Supabase Realtime Wishlist/data channel status: ${status}`, error || '');
            // The periodic foreground sync above remains the fallback if Realtime cannot connect.
          }
        });
    }
    this.notify();
  }

  private initDefaultsForUser(user: { id: string; username: string; email?: string }) {
    const defaults: Array<[string, unknown]> = [
      [STORAGE_KEYS.PROFILE, EMPTY_PROFILE(user.id, user.username, user.email || '')],
      [STORAGE_KEYS.TASKS, []],
      [STORAGE_KEYS.TRANSACTIONS, []],
      [STORAGE_KEYS.FILES, []],
      [STORAGE_KEYS.WISHLIST, []],
      [STORAGE_KEYS.ACTIVITIES, []],
    ];
    defaults.forEach(([key, value]) => localStorage.setItem(this.key(key), JSON.stringify(value)));
    localStorage.setItem(this.key(STORAGE_KEYS.CACHE_TIMESTAMP), Date.now().toString());
  }

  private ensureProfileMatchesUser(user: { id: string; username: string; email?: string }) {
    const current = this.getProfile();
    const updated = {
      ...current,
      id: user.id,
      name: user.username,
      email: user.email || current.email || '',
    };
    localStorage.setItem(this.key(STORAGE_KEYS.PROFILE), JSON.stringify(updated));
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // --- Background Cache Synchronization with Supabase ---
  private async syncFromSupabaseBackground() {
    if (!supabase || !this.activeUserId || !navigator.onLine) return;
    const userId = this.activeUserId;
    try {
      const [profileRes, tasksRes, txRes, filesRes, wishlistRes] = await Promise.all([
        // Kolom dipilih eksplisit agar tidak ada kolom sensitif yang ikut tersimpan di cache lokal.
        supabase.from('profiles').select('id,name,email,currency,timezone,theme').eq('id', userId).maybeSingle(),
        supabase.from('tasks').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_id', userId).is('deleted_at', null).order('transaction_date', { ascending: false }),
        supabase.from('files').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('wishlist_items').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }),
      ]);
      const errors = [profileRes.error, tasksRes.error, txRes.error, filesRes.error, wishlistRes.error].filter(Boolean);
      if (errors.length) throw errors[0];
      if (this.activeUserId !== userId) return;

      const pending = this.readPendingState(userId);
      const hasPendingProfile = pending.upserts.profiles.size > 0;
      if (profileRes.data && !hasPendingProfile) {
        const localProfile = this.getProfile();
        this.writeJson(this.key(STORAGE_KEYS.PROFILE), { ...localProfile, ...profileRes.data, id: userId, name: profileRes.data.name || localProfile.name, email: profileRes.data.email || localProfile.email });
      }

      const snapshotKey = `${this.key(STORAGE_KEYS.CACHE_TIMESTAMP)}:cloud_snapshot`;
      const hadCloudSnapshot = localStorage.getItem(snapshotKey) === 'true';

      const applyCloud = <T extends { id: string }>(
        storageKey: string, table: 'tasks' | 'transactions' | 'files' | 'wishlist_items',
        cloud: T[] | null, compare: (a: T, b: T) => number, uploadLocalOnly: boolean,
      ) => {
        if (!cloud) return;
        const local = this.readArray<T>(storageKey);
        const pendingUpserts = pending.upserts[table];
        const pendingDeletes = pending.deletes[table];
        // Perubahan lokal yang belum terkirim TIDAK boleh ditimpa snapshot cloud.
        const merged = cloud
          .filter((item) => !pendingDeletes.has(item.id))
          .map((item) => (pendingUpserts.has(item.id) ? (local.find((l) => l.id === item.id) ?? item) : item));
        for (const item of local) {
          if (pendingUpserts.has(item.id) && !pendingDeletes.has(item.id) && !merged.some((m) => m.id === item.id)) merged.push(item);
        }
        // Koneksi pertama: data yang hanya ada di perangkat ini dipertahankan dan diantrekan untuk diunggah.
        if (!hadCloudSnapshot && cloud.length === 0 && local.length > 0) {
          if (uploadLocalOnly) {
            for (const item of local) {
              if (UUID_RE.test(item.id) && !pendingUpserts.has(item.id)) this.enqueueMutation({ table, operation: 'upsert', payload: item }, false);
            }
          }
          return;
        }
        merged.sort(compare);
        this.writeJson(this.key(storageKey), merged);
      };

      const byCreatedDesc = <T extends { created_at: string }>(a: T, b: T) => String(b.created_at).localeCompare(String(a.created_at));
      applyCloud<Task>(STORAGE_KEYS.TASKS, 'tasks', tasksRes.data as Task[] | null, byCreatedDesc, true);
      applyCloud<Transaction>(STORAGE_KEYS.TRANSACTIONS, 'transactions', txRes.data as Transaction[] | null,
        (a, b) => String(b.transaction_date).localeCompare(String(a.transaction_date)) || byCreatedDesc(a, b), true);
      // URL bertanda tangan dibuat saat file dibuka (getFileUrl); tidak dibuat massal tiap sinkronisasi.
      applyCloud<FileItem>(STORAGE_KEYS.FILES, 'files', filesRes.data as FileItem[] | null, byCreatedDesc, false);
      applyCloud<WishlistItem>(STORAGE_KEYS.WISHLIST, 'wishlist_items', wishlistRes.data as WishlistItem[] | null, byCreatedDesc, true);

      localStorage.setItem(snapshotKey, 'true');
      localStorage.setItem(this.key(STORAGE_KEYS.CACHE_TIMESTAMP), Date.now().toString());
      this.notify();
      if (this.activeUserId === userId) void this.flushOutbox();
    } catch (error) {
      console.warn('Sinkronisasi cloud belum berhasil; cache lokal dipertahankan.', error);
    }
  }

  private writeJson(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.error('Penyimpanan lokal penuh atau diblokir; segera ekspor cadangan data.', error); }
  }

  private readArray<T>(key: string): T[] {
    try { const raw = localStorage.getItem(this.key(key)); const value = raw ? JSON.parse(raw) : []; return Array.isArray(value) ? value : []; }
    catch { return []; }
  }

  private outboxKey(userId = this.activeUserId) { return userId ? `pms_sync_outbox:${userId}` : 'pms_sync_outbox'; }
  private deadKey(userId = this.activeUserId) { return userId ? `pms_sync_dead:${userId}` : 'pms_sync_dead'; }

  private readOutbox(userId = this.activeUserId): OutboxEntry[] {
    try { const parsed = JSON.parse(localStorage.getItem(this.outboxKey(userId)) || '[]'); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  }

  private readPendingState(userId: string) {
    const tables = ['tasks', 'transactions', 'files', 'wishlist_items', 'profiles'] as const;
    const upserts = Object.fromEntries(tables.map((t) => [t, new Set<string>()])) as Record<(typeof tables)[number], Set<string>>;
    const deletes = Object.fromEntries(tables.map((t) => [t, new Set<string>()])) as Record<(typeof tables)[number], Set<string>>;
    for (const entry of this.readOutbox(userId)) {
      if (!(entry.table in upserts)) continue;
      const table = entry.table as (typeof tables)[number];
      if (entry.operation === 'upsert') { const id = (entry.payload as { id?: string } | undefined)?.id; if (id) { upserts[table].add(id); deletes[table].delete(id); } }
      else if ((entry.operation === 'soft_delete' || entry.operation === 'delete') && entry.recordId) { deletes[table].add(entry.recordId); upserts[table].delete(entry.recordId); }
    }
    return { upserts, deletes };
  }

  private enqueueMutation(entry: Omit<OutboxEntry, 'queueId' | 'attempts'>, flush = true) {
    if (!this.activeUserId) return;
    const key = this.outboxKey();
    const queue = this.readOutbox();
    queue.push({ ...entry, queueId: crypto.randomUUID(), attempts: 0 });
    try { localStorage.setItem(key, JSON.stringify(queue)); }
    catch (error) { console.error('Antrean sinkronisasi penuh; segera ekspor cadangan data.', error); return; }
    if (flush) void this.flushOutbox();
  }

  /** Susun payload sesuai kolom tabel yang sebenarnya; user_id SELALU dari sesi aktif, bukan dari cache. */
  private buildPayload(table: string, source: Record<string, unknown>, userId: string): Record<string, unknown> | null {
    const now = new Date().toISOString();
    switch (table) {
      case 'tasks':
        return {
          id: source.id, user_id: userId, title: cleanText(source.title, 200, 'Tanpa judul'), description: cleanText(source.description, 5000),
          deadline: source.deadline || getLocalDateString(), priority: ['low', 'medium', 'high'].includes(String(source.priority)) ? source.priority : 'medium',
          status: ['pending', 'in_progress', 'completed'].includes(String(source.status)) ? source.status : 'pending',
          category: cleanText(source.category, 60, 'Umum'), reminder: source.reminder ? String(source.reminder).slice(0, 16) : null, // null agar pengingat yang dihapus ikut terhapus di cloud
          created_at: source.created_at || now, updated_at: now,
        };
      case 'transactions':
        return {
          id: source.id, user_id: userId, type: source.type === 'income' ? 'income' : 'expense', amount: cleanAmount(source.amount),
          category: cleanText(source.category, 60, 'Umum'), description: cleanText(source.description, 500, '-'),
          transaction_date: source.transaction_date || getLocalDateString(), created_at: source.created_at || now, updated_at: now,
        };
      case 'files':
        return {
          id: source.id, user_id: userId, name: cleanText(source.name, 255, 'file'), category: cleanText(source.category, 60, 'Umum'),
          storage_path: String(source.storage_path || ''), file_type: cleanText(source.file_type, 20, 'file'),
          file_size: Math.max(0, Math.floor(Number(source.file_size) || 0)), created_at: source.created_at || now,
        };
      case 'wishlist_items':
        return {
          id: source.id, user_id: userId, name: cleanText(source.name, 200, 'Target'), description: cleanText(source.description, 2000),
          category: cleanText(source.category, 60, 'Umum'), target_price: cleanAmount(source.target_price),
          base_target_price: cleanAmount(source.base_target_price ?? source.target_price),
          subtasks: Array.isArray(source.subtasks) ? source.subtasks : [], saved_amount: cleanAmount(source.saved_amount),
          deadline: source.deadline || null, completed: Boolean(source.completed), created_at: source.created_at || now, updated_at: now,
        };
      case 'profiles':
        return {
          id: userId, name: cleanText(source.name, 80, 'Pengguna'), email: cleanText(source.email, 320), currency: cleanText(source.currency, 8, 'IDR'),
          timezone: cleanText(source.timezone, 64, 'Asia/Jakarta'), theme: source.theme === 'dark' ? 'dark' : 'light',
        };
      default: return null;
    }
  }

  private async flushOutbox() {
    if (!supabase || !this.activeUserId || !navigator.onLine || this.isFlushingOutbox) return;
    const userId = this.activeUserId;
    const key = this.outboxKey(userId);
    const queue = this.readOutbox(userId);
    if (queue.length === 0) return;
    this.isFlushingOutbox = true;
    const originalIds = new Set(queue.map((item) => item.queueId));
    const remaining: OutboxEntry[] = [];
    const dead: OutboxEntry[] = [];
    try {
      for (const item of queue) {
        if (this.activeUserId !== userId) return;
        try {
          let error: { message?: string; code?: string } | null = null;
          if (item.operation === 'upsert') {
            const payload = this.buildPayload(item.table, (item.payload || {}) as Record<string, unknown>, userId);
            if (!payload) throw new Error(`Tabel tidak dikenal: ${item.table}`);
            const result = await supabase.from(item.table).upsert(payload, { onConflict: 'id' });
            error = result.error;
          } else if (item.operation === 'delete') {
            const result = await supabase.from(item.table).delete().eq('id', item.recordId ?? '').eq(item.table === 'profiles' ? 'id' : 'user_id', userId);
            error = result.error;
          } else if (item.operation === 'soft_delete') {
            const result = await supabase.from(item.table).update({ deleted_at: new Date().toISOString() }).eq('id', item.recordId ?? '').eq('user_id', userId);
            error = result.error;
          } else if (item.operation === 'storage_delete') {
            const path = String(item.recordId || '');
            // Hanya hapus objek milik pengguna ini.
            if (!path.startsWith(`${userId}/`)) throw Object.assign(new Error('Path storage bukan milik pengguna.'), { code: '42501' });
            const result = await supabase.storage.from('pms-files').remove([path]);
            error = result.error;
          }
          if (error) throw error;
        } catch (error) {
          const code = (error as { code?: string })?.code || '';
          const attempts = (item.attempts || 0) + 1;
          const permanent = PERMANENT_ERROR_CODES.has(code) || attempts >= MAX_SYNC_ATTEMPTS;
          console.warn(permanent ? 'Perubahan dipindahkan ke daftar gagal permanen:' : 'Perubahan masih menunggu sinkronisasi:', error);
          if (permanent) dead.push({ ...item, attempts, lastError: String((error as { message?: string })?.message || error).slice(0, 300) });
          else remaining.push({ ...item, attempts });
        }
      }
      if (this.activeUserId === userId) {
        // Pertahankan entri yang ditambahkan selama batch berjalan; jangan menimpa antrean yang lebih baru.
        const latest = this.readOutbox(userId);
        const newlyQueued = latest.filter((item) => !originalIds.has(item.queueId));
        this.writeJson(key, [...remaining, ...newlyQueued]);
        if (dead.length) {
          let existing: OutboxEntry[] = [];
          try { const parsed = JSON.parse(localStorage.getItem(this.deadKey(userId)) || '[]'); if (Array.isArray(parsed)) existing = parsed; } catch { /* abaikan */ }
          this.writeJson(this.deadKey(userId), [...existing, ...dead].slice(-100));
        }
      }
    } finally {
      this.isFlushingOutbox = false;
    }
    if (this.activeUserId === userId && navigator.onLine && remaining.length === 0 && this.readOutbox(userId).length > 0) void this.flushOutbox();
  }

  /** Dipanggil sebelum logout: kirim sisa antrean, lalu bersihkan cache perangkat jika semuanya sudah tersinkron. */
  public async prepareForSignOut(): Promise<{ pending: number }> {
    const userId = this.activeUserId;
    if (!userId) return { pending: 0 };
    for (let i = 0; i < 25 && this.isFlushingOutbox; i += 1) await new Promise((resolve) => setTimeout(resolve, 200));
    await this.flushOutbox();
    const pending = this.readOutbox(userId).length;
    if (pending === 0) {
      [...Object.values(STORAGE_KEYS)].forEach((base) => localStorage.removeItem(`${base}:${userId}`));
      localStorage.removeItem(`${STORAGE_KEYS.CACHE_TIMESTAMP}:${userId}:cloud_snapshot`);
      localStorage.removeItem(this.outboxKey(userId));
      localStorage.removeItem(this.deadKey(userId));
    }
    return { pending };
  }

  public getSyncStatus(): { pending: number; failed: number } {
    let failed = 0;
    try { const parsed = JSON.parse(localStorage.getItem(this.deadKey()) || '[]'); failed = Array.isArray(parsed) ? parsed.length : 0; } catch { /* abaikan */ }
    return { pending: this.readOutbox().length, failed };
  }


  // --- Profile & User ---
  public getProfile(): UserProfile {
    try {
      const data = localStorage.getItem(this.key(STORAGE_KEYS.PROFILE));
      if (data) return JSON.parse(data);
      if (this.activeUserId) return EMPTY_PROFILE(this.activeUserId, 'Pengguna');
      return EMPTY_PROFILE('', 'Pengguna');
    } catch {
      return EMPTY_PROFILE(this.activeUserId || '', 'Pengguna');
    }
  }

  public updateProfile(updates: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const updated = { ...current, ...updates };
    this.writeJson(this.key(STORAGE_KEYS.PROFILE), updated);
    if (supabase && this.activeUserId && this.cloudWritesEnabled) {
      this.enqueueMutation({ table: 'profiles', operation: 'upsert', payload: { id: this.activeUserId, name: updated.name, email: updated.email, currency: updated.currency, timezone: updated.timezone, theme: updated.theme } }); // buildPayload membatasi kolom
    }
    this.notify();
    return updated;
  }

  // --- Tasks (Cache-First) ---
  public getTasks(): Task[] {
    try {
      const data = localStorage.getItem(this.key(STORAGE_KEYS.TASKS));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public createTask(taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Task {
    const tasks = this.getTasks();
    const profile = this.getProfile();
    const newTask: Task = {
      ...taskData,
      title: cleanText(taskData.title, 200, 'Tanpa judul'),
      description: cleanText(taskData.description, 5000),
      category: cleanText(taskData.category, 60, 'Umum'),
      id: crypto.randomUUID(),
      user_id: this.activeUserId || profile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    localStorage.setItem(this.key(STORAGE_KEYS.TASKS), JSON.stringify(tasks));
    this.logActivity('task', `Menambahkan tugas: "${newTask.title}"`, 'created');
    this.notify();

    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      this.enqueueMutation({ table: 'tasks', operation: 'upsert', payload: newTask });
    }

    return newTask;
  }

  public updateTask(id: string, updates: Partial<Task>): Task | null {
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const safeUpdates: Partial<Task> = { ...updates };
    if (safeUpdates.title !== undefined) safeUpdates.title = cleanText(safeUpdates.title, 200, tasks[index].title);
    if (safeUpdates.description !== undefined) safeUpdates.description = cleanText(safeUpdates.description, 5000);
    if (safeUpdates.category !== undefined) safeUpdates.category = cleanText(safeUpdates.category, 60, 'Umum');
    tasks[index] = {
      ...tasks[index],
      ...safeUpdates,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(this.key(STORAGE_KEYS.TASKS), JSON.stringify(tasks));
    this.notify();

    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      this.enqueueMutation({ table: 'tasks', operation: 'upsert', payload: tasks[index] });
    }

    return tasks[index];
  }

  public toggleTaskStatus(id: string): Task | null {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === id);
    if (!task) return null;

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updated = this.updateTask(id, { status: newStatus });
    if (updated) {
      this.logActivity(
        'task',
        newStatus === 'completed' ? `Menyelesaikan tugas "${task.title}"` : `Membuka kembali tugas "${task.title}"`,
        newStatus === 'completed' ? 'completed' : 'updated'
      );
    }
    return updated;
  }

  public deleteTask(id: string): boolean {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === id);
    const filtered = tasks.filter((t) => t.id !== id);
    localStorage.setItem(this.key(STORAGE_KEYS.TASKS), JSON.stringify(filtered));
    if (task) {
      this.logActivity('task', `Menghapus tugas "${task.title}"`, 'deleted');
    }
    this.notify();

    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      this.enqueueMutation({ table: 'tasks', operation: 'soft_delete', recordId: id });
    }

    return true;
  }

  // --- Transactions ---
  public getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(this.key(STORAGE_KEYS.TRANSACTIONS));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public createTransaction(
    txData: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Transaction {
    const list = this.getTransactions();
    const profile = this.getProfile();
    const amount = cleanAmount(txData.amount);
    if (amount <= 0) throw new Error('Nominal transaksi harus lebih dari 0 dan tidak melebihi batas yang didukung.');
    const newTx: Transaction = {
      ...txData,
      amount,
      category: cleanText(txData.category, 60, 'Umum'),
      description: cleanText(txData.description, 500, '-'),
      id: crypto.randomUUID(),
      user_id: this.activeUserId || profile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    list.unshift(newTx);
    localStorage.setItem(this.key(STORAGE_KEYS.TRANSACTIONS), JSON.stringify(list));
    this.logActivity(
      'finance',
      `Catatan ${newTx.type === 'income' ? 'pemasukan' : 'pengeluaran'}: ${formatCurrency(newTx.amount)} (${newTx.description})`,
      'created'
    );
    this.notify();

    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      this.enqueueMutation({ table: 'transactions', operation: 'upsert', payload: newTx });
    }

    return newTx;
  }

  public deleteTransaction(id: string): boolean {
    const list = this.getTransactions();
    const item = list.find((t) => t.id === id);
    const filtered = list.filter((t) => t.id !== id);
    localStorage.setItem(this.key(STORAGE_KEYS.TRANSACTIONS), JSON.stringify(filtered));
    if (item) {
      this.logActivity('finance', `Menghapus catatan keuangan: ${item.description}`, 'deleted');
    }
    this.notify();

    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      this.enqueueMutation({ table: 'transactions', operation: 'soft_delete', recordId: id });
    }

    return true;
  }

  // --- Files ---
  public getFiles(): FileItem[] {
    try {
      const data = localStorage.getItem(this.key(STORAGE_KEYS.FILES));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public createFileMetadata(
    fileData: Omit<FileItem, 'id' | 'user_id' | 'created_at'>
  ): FileItem {
    const list = this.getFiles();
    const profile = this.getProfile();
    const newFile: FileItem = {
      ...fileData,
      id: crypto.randomUUID(),
      user_id: this.activeUserId || profile.id,
      created_at: new Date().toISOString(),
    };
    list.unshift(newFile);
    localStorage.setItem(this.key(STORAGE_KEYS.FILES), JSON.stringify(list));
    this.logActivity('file', `Mengunggah file: "${newFile.name}"`, 'created');
    this.notify();

    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      this.enqueueMutation({ table: 'files', operation: 'upsert', payload: newFile });
    }

    return newFile;
  }

  public async uploadRealFile(file: File, category: string): Promise<FileItem> {
    const userId = this.activeUserId;
    if (!userId) throw new Error('Sesi pengguna belum siap. Silakan masuk kembali.');
    if (file.size <= 0) throw new Error('File kosong tidak dapat diunggah.');
    if (file.size > 20 * 1024 * 1024) throw new Error('Ukuran file maksimal 20 MB.');
    const dot = file.name.lastIndexOf('.');
    const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '';
    if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
      throw new Error('Jenis file tidak didukung. Gunakan PDF, PNG, JPG, WEBP, TXT, DOCX, PPTX, atau XLSX.');
    }
    const fileId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '').slice(-120) || `file.${ext}`;
    const storagePath = `${userId}/${fileId}/${safeName}`;
    let fileUrl: string | undefined;

    if (this.cloudWritesEnabled && supabase) {
      if (!navigator.onLine) throw new Error('Upload file memerlukan koneksi internet. Coba lagi saat online.');
      const { error: uploadError } = await supabase.storage
        .from('pms-files')
        .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) {
        console.warn('Supabase storage upload error:', uploadError.message);
        throw new Error(`Upload file ke cloud gagal: ${uploadError.message}`);
      }
      const { data: urlData, error: signedUrlError } = await supabase.storage.from('pms-files').createSignedUrl(storagePath, 60 * 60);
      if (!signedUrlError && urlData?.signedUrl) fileUrl = urlData.signedUrl;
      else console.warn('Signed URL gagal dibuat:', signedUrlError?.message);
    } else {
      try { fileUrl = URL.createObjectURL(file); } catch { fileUrl = undefined; }
    }

    const newFileItem: FileItem = {
      id: fileId,
      user_id: userId,
      name: cleanText(file.name, 255, safeName),
      category: cleanText(category, 60, 'Kuliah'),
      storage_path: storagePath,
      file_type: ext,
      file_size: file.size,
      created_at: new Date().toISOString(),
      url: fileUrl,
    };

    const list = this.getFiles();
    list.unshift(newFileItem);
    this.writeJson(this.key(STORAGE_KEYS.FILES), list);
    this.logActivity('file', `Mengunggah file: "${newFileItem.name}"`, 'created');
    this.notify();

    if (this.cloudWritesEnabled && supabase) {
      this.enqueueMutation({ table: 'files', operation: 'upsert', payload: newFileItem });
    }
    return newFileItem;
  }


  public async getFileUrl(file: FileItem): Promise<string | null> {
    if (!supabase || !this.activeUserId || !file.storage_path) return file.url && file.url !== '#' ? file.url : null;
    if (!file.storage_path.startsWith(`${this.activeUserId}/`)) throw new Error('File ini bukan milik akun yang sedang aktif.');
    const { data, error } = await supabase.storage.from('pms-files').createSignedUrl(file.storage_path, 60 * 60);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  }

  public deleteFile(id: string): boolean {
    const list = this.getFiles();
    const item = list.find((f) => f.id === id);
    const filtered = list.filter((f) => f.id !== id);
    localStorage.setItem(this.key(STORAGE_KEYS.FILES), JSON.stringify(filtered));
    if (item) {
      this.logActivity('file', `Menghapus file: "${item.name}"`, 'deleted');
    }
    this.notify();

    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      if (item?.storage_path) this.enqueueMutation({ table: 'pms-files', operation: 'storage_delete', recordId: item.storage_path });
      this.enqueueMutation({ table: 'files', operation: 'soft_delete', recordId: id });
    }

    return true;
  }

  private async persistWishlistMutation(entry: { operation: 'upsert' | 'soft_delete'; payload?: WishlistItem; recordId?: string }): Promise<void> {
    const userId = this.activeUserId;
    if (!userId) throw new Error('Sesi pengguna belum siap. Silakan masuk kembali.');
    if (!supabase || !isSupabaseConfigured) {
      this.enqueueMutation({ table: 'wishlist_items', ...entry });
      throw new Error('Supabase belum dikonfigurasi. Perubahan disimpan di perangkat dan menunggu sinkronisasi; periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
    }
    if (!navigator.onLine) {
      this.enqueueMutation({ table: 'wishlist_items', ...entry });
      throw new Error('Perangkat sedang offline. Perubahan disimpan lokal dan masuk antrean sinkronisasi.');
    }
    try {
      let error: { message?: string } | null = null;
      if (entry.operation === 'upsert' && entry.payload) {
        // Hanya kirim kolom yang ada di public.wishlist_items; user_id selalu dari sesi aktif.
        const payload = this.buildPayload('wishlist_items', entry.payload as unknown as Record<string, unknown>, userId);
        if (!payload) throw new Error('Data wishlist tidak valid.');
        const result = await supabase.from('wishlist_items').upsert(payload, { onConflict: 'id' }).select('id');
        error = result.error;
        if (!error && (!result.data || result.data.length === 0)) error = new Error('Supabase tidak mengembalikan baris tersimpan; periksa kebijakan RLS dan hak akses.');
      } else if (entry.operation === 'soft_delete' && entry.recordId) {
        const result = await supabase.from('wishlist_items').update({ deleted_at: new Date().toISOString() })
          .eq('id', entry.recordId).eq('user_id', userId).select('id');
        error = result.error;
        if (!error && (!result.data || result.data.length === 0)) error = new Error('Target tidak ditemukan atau akses ditolak oleh kebijakan RLS.');
      }
      if (error) throw error;
      // Remove stale queued mutations for this record only after the direct write succeeded.
      const key = this.outboxKey(userId);
      try {
        const queue = JSON.parse(localStorage.getItem(key) || '[]') as Array<{ table: string; recordId?: string; payload?: WishlistItem; queueId: string }>;
        const recordId = entry.recordId || entry.payload?.id;
        const filteredQueue = queue.filter((q) => q.table !== 'wishlist_items' || (q.recordId !== recordId && q.payload?.id !== recordId));
        localStorage.setItem(key, JSON.stringify(filteredQueue));
      } catch { /* Outbox cleanup must not invalidate a confirmed cloud write. */ }
    } catch (error) {
      this.enqueueMutation({ table: 'wishlist_items', ...entry });
      const detail = error instanceof Error ? error.message : String((error as { message?: string })?.message || error);
      throw new Error(`Sinkronisasi Wishlist ke Supabase gagal; perubahan lokal dipertahankan dan masuk antrean. ${detail}`);
    }
  }

  // --- Wishlist ---
  public getWishlist(): WishlistItem[] {
    try {
      const data = localStorage.getItem(this.key(STORAGE_KEYS.WISHLIST));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public async createWishlistItem(
    wishData: Omit<WishlistItem, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed'>
  ): Promise<WishlistItem> {
    const list = this.getWishlist();
    const profile = this.getProfile();
    const newItem: WishlistItem = {
      ...wishData,
      name: cleanText(wishData.name, 200, 'Target'),
      description: cleanText(wishData.description, 2000),
      category: cleanText(wishData.category, 60, 'Umum'),
      target_price: cleanAmount(wishData.target_price),
      saved_amount: cleanAmount(wishData.saved_amount),
      id: crypto.randomUUID(),
      user_id: this.activeUserId || profile.id,
      completed: cleanAmount(wishData.saved_amount) >= cleanAmount(wishData.target_price) && cleanAmount(wishData.target_price) > 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    list.unshift(newItem);
    localStorage.setItem(this.key(STORAGE_KEYS.WISHLIST), JSON.stringify(list));
    this.logActivity('wishlist', `Menambah target impian: "${newItem.name}"`, 'created');
    this.notify();
    await this.persistWishlistMutation({ operation: 'upsert', payload: newItem });
    return newItem;
  }

  public async updateWishlistItem(id: string, updates: Partial<WishlistItem>): Promise<WishlistItem | null> {
    const list = this.getWishlist();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const merged = { ...list[index], ...updates, updated_at: new Date().toISOString() };
    merged.name = cleanText(merged.name, 200, list[index].name);
    merged.target_price = cleanAmount(merged.target_price);
    merged.saved_amount = cleanAmount(merged.saved_amount);
    merged.completed = merged.target_price > 0 && merged.saved_amount >= merged.target_price;
    list[index] = merged;
    localStorage.setItem(this.key(STORAGE_KEYS.WISHLIST), JSON.stringify(list));
    this.logActivity('wishlist', `Memperbarui target impian: "${merged.name}"`, 'updated');
    this.notify();
    await this.persistWishlistMutation({ operation: 'upsert', payload: merged });
    return merged;
  }

  public async toggleWishlistSubtask(id: string, subtaskId: string): Promise<WishlistItem | null> {
    const item = this.getWishlist().find((entry) => entry.id === id);
    if (!item) return null;
    const subtasks = (item.subtasks || []).map((subtask) => subtask.id === subtaskId
      ? { ...subtask, completed: !subtask.completed }
      : subtask);
    return this.updateWishlistItem(id, { subtasks });
  }

  public async updateWishlistDeposit(id: string, additionalAmount: number): Promise<WishlistItem | null> {
    const list = this.getWishlist();
    const index = list.findIndex((w) => w.id === id);
    if (index === -1) return null;

    const current = list[index];
    if (!Number.isFinite(additionalAmount)) throw new Error('Nominal tabungan tidak valid.');
    const newSaved = cleanAmount(current.saved_amount + additionalAmount);
    const isCompleted = current.target_price > 0 && newSaved >= current.target_price;

    list[index] = {
      ...current,
      saved_amount: newSaved,
      completed: isCompleted,
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(this.key(STORAGE_KEYS.WISHLIST), JSON.stringify(list));
    this.logActivity(
      'wishlist',
      `Menambah tabungan untuk "${current.name}": +${formatCurrency(additionalAmount)}`,
      'updated'
    );
    this.notify();
    await this.persistWishlistMutation({ operation: 'upsert', payload: list[index] });
    return list[index];
  }

  public async deleteWishlistItem(id: string): Promise<boolean> {
    const list = this.getWishlist();
    const item = list.find((w) => w.id === id);
    const filtered = list.filter((w) => w.id !== id);
    localStorage.setItem(this.key(STORAGE_KEYS.WISHLIST), JSON.stringify(filtered));
    if (item) {
      this.logActivity('wishlist', `Menghapus impian: "${item.name}"`, 'deleted');
    }
    this.notify();
    if (item) await this.persistWishlistMutation({ operation: 'soft_delete', recordId: id });
    return true;
  }

  // --- Activities ---
  public getActivities(): ActivityItem[] {
    try {
      const data = localStorage.getItem(this.key(STORAGE_KEYS.ACTIVITIES));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private logActivity(
    type: ActivityItem['type'],
    title: string,
    action: ActivityItem['action']
  ) {
    const list = this.getActivities();
    const item: ActivityItem = {
      id: crypto.randomUUID(),
      type,
      title,
      action,
      timestamp: new Date().toISOString(),
    };
    list.unshift(item);
    if (list.length > 30) list.pop();
    localStorage.setItem(this.key(STORAGE_KEYS.ACTIVITIES), JSON.stringify(list));
  }

  // --- Dashboard Calculation ---
  public getDashboardSummary(): DashboardSummary {
    const tasks = this.getTasks();
    const txs = this.getTransactions();
    const files = this.getFiles();
    const wishlist = this.getWishlist();

    const todayStr = getLocalDateString();
    const todayTasks = tasks.filter((t) => t.deadline === todayStr);
    const pendingTasks = tasks.filter((t) => t.status !== 'completed');
    const completedTasks = tasks.filter((t) => t.status === 'completed');

    let incomeToday = 0;
    let expenseToday = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    txs.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
        if (tx.transaction_date === todayStr) incomeToday += tx.amount;
      } else {
        totalExpense += tx.amount;
        if (tx.transaction_date === todayStr) expenseToday += tx.amount;
      }
    });

    const balance = totalIncome - totalExpense;

    let wishlistSumPct = 0;
    if (wishlist.length > 0) {
      wishlist.forEach((w) => {
        const pct = Math.min(100, Math.round((w.saved_amount / (w.target_price || 1)) * 100));
        wishlistSumPct += pct;
      });
      wishlistSumPct = Math.round(wishlistSumPct / wishlist.length);
    }

    return {
      today_tasks_count: todayTasks.length,
      pending_tasks_count: pendingTasks.length,
      completed_tasks_count: completedTasks.length,
      income_today: incomeToday,
      expense_today: expenseToday,
      total_income: totalIncome,
      total_expense: totalExpense,
      current_balance: balance,
      files_count: files.length,
      wishlist_progress_average: wishlistSumPct,
    };
  }

  // --- Global Search ---
  public globalSearch(query: string) {
    const q = query.toLowerCase().trim();
    if (!q) return { tasks: [], transactions: [], files: [], wishlist: [] };

    const tasks = this.getTasks().filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );

    const transactions = this.getTransactions().filter(
      (tx) =>
        tx.description.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.amount.toString().includes(q)
    );

    const files = this.getFiles().filter(
      (f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
    );

    const wishlist = this.getWishlist().filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q)
    );

    return { tasks, transactions, files, wishlist };
  }

  /** Menghapus SEMUA data akun ini (perangkat ini dan cloud, sehingga ikut hilang di perangkat lain). */
  public resetData() {
    // Queue cloud deletions before clearing the local cache, so the reset reaches other devices.
    for (const item of this.getTasks()) this.enqueueMutation({ table: 'tasks', operation: 'delete', recordId: item.id });
    for (const item of this.getTransactions()) this.enqueueMutation({ table: 'transactions', operation: 'delete', recordId: item.id });
    for (const item of this.getFiles()) {
      if (item.storage_path) this.enqueueMutation({ table: 'pms-files', operation: 'storage_delete', recordId: item.storage_path });
      this.enqueueMutation({ table: 'files', operation: 'delete', recordId: item.id });
    }
    for (const item of this.getWishlist()) this.enqueueMutation({ table: 'wishlist_items', operation: 'delete', recordId: item.id });
    [STORAGE_KEYS.TASKS, STORAGE_KEYS.TRANSACTIONS, STORAGE_KEYS.FILES, STORAGE_KEYS.WISHLIST, STORAGE_KEYS.ACTIVITIES]
      .forEach((key) => localStorage.setItem(this.key(key), '[]'));
    this.notify();
  }
}

export const dataService = new DataService();
