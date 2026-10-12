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

const EMPTY_PROFILE = (userId: string, username: string, email = ''): UserProfile => ({
  id: userId,
  name: username,
  email,
  currency: 'IDR',
  timezone: 'Asia/Jakarta (WIB)',
  theme: 'dark',
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
  private realtimeChannel: any = null;
  private isFlushingOutbox = false;

  constructor() {
    // Data is initialized only after a user session is known.
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { void this.flushOutbox().then(() => this.syncFromSupabaseBackground()); });
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, (payload) => {
  console.log('[Realtime tasks]', payload.eventType, payload);
  void this.syncFromSupabaseBackground();
})
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => void this.syncFromSupabaseBackground())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: `user_id=eq.${user.id}` }, () => void this.syncFromSupabaseBackground())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_items', filter: `user_id=eq.${user.id}` }, () => void this.syncFromSupabaseBackground())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => void this.syncFromSupabaseBackground())
        .subscribe();
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
    if (!supabase || !this.activeUserId) return;
    const userId = this.activeUserId;
    try {
      const [profileRes, tasksRes, txRes, filesRes, wishlistRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('tasks').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_id', userId).is('deleted_at', null).order('transaction_date', { ascending: false }),
        supabase.from('files').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('wishlist_items').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }),
      ]);
      const errors = [profileRes.error, tasksRes.error, txRes.error, filesRes.error, wishlistRes.error].filter(Boolean);
      if (errors.length) throw errors[0];
      if (this.activeUserId !== userId) return;
      if (profileRes.data) {
        const localProfile = this.getProfile();
        localStorage.setItem(this.key(STORAGE_KEYS.PROFILE), JSON.stringify({ ...localProfile, ...profileRes.data, id: userId, name: profileRes.data.name || localProfile.name, email: profileRes.data.email || localProfile.email }));
      }
      const snapshotKey = `${this.key(STORAGE_KEYS.CACHE_TIMESTAMP)}:cloud_snapshot`;
      const hadCloudSnapshot = localStorage.getItem(snapshotKey) === 'true';
      const applyCloud = <T>(key: string, cloud: T[] | null) => {
        if (!cloud) return;
        const local = this.readArray<T>(key);
        // On first connection, do not erase existing local-only data if the cloud is empty.
        // After a cloud snapshot exists, the cloud becomes authoritative (including deletions).
        if (cloud.length > 0 || hadCloudSnapshot || local.length === 0) {
          localStorage.setItem(this.key(key), JSON.stringify(cloud));
        }
      };
      applyCloud<Task>(STORAGE_KEYS.TASKS, tasksRes.data as Task[]);
      applyCloud<Transaction>(STORAGE_KEYS.TRANSACTIONS, txRes.data as Transaction[]);
      const cloudFiles = await Promise.all(((filesRes.data || []) as FileItem[]).map(async (file) => {
        const { data } = await supabase!.storage.from('pms-files').createSignedUrl(file.storage_path, 60 * 60);
        return { ...file, url: data?.signedUrl || undefined };
      }));
      applyCloud<FileItem>(STORAGE_KEYS.FILES, cloudFiles);
      applyCloud<WishlistItem>(STORAGE_KEYS.WISHLIST, wishlistRes.data as WishlistItem[]);
      localStorage.setItem(snapshotKey, 'true');
      localStorage.setItem(this.key(STORAGE_KEYS.CACHE_TIMESTAMP), Date.now().toString());
      this.notify();
    } catch (error) {
      console.warn('Sinkronisasi cloud belum berhasil; cache lokal dipertahankan.', error);
    }
  }

  private readArray<T>(key: string): T[] {
    try { const raw = localStorage.getItem(this.key(key)); const value = raw ? JSON.parse(raw) : []; return Array.isArray(value) ? value : []; }
    catch { return []; }
  }

  private outboxKey(userId = this.activeUserId) { return userId ? `pms_sync_outbox:${userId}` : 'pms_sync_outbox'; }

  private enqueueMutation(entry: { table: string; operation: 'upsert' | 'delete' | 'storage_delete'; payload?: any; recordId?: string }) {
    if (!this.activeUserId) return;
    const key = this.outboxKey();
    let queue: Array<typeof entry & { queueId: string }> = [];
    try { queue = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(queue)) queue = []; } catch { queue = []; }
    queue.push({ ...entry, queueId: crypto.randomUUID() });
    try { localStorage.setItem(key, JSON.stringify(queue)); }
    catch (error) { console.error('Antrean sinkronisasi penuh; segera ekspor cadangan data.', error); return; }
    void this.flushOutbox();
  }

  private async flushOutbox() {
    if (!supabase || !this.activeUserId || !navigator.onLine || this.isFlushingOutbox) return;
    const userId = this.activeUserId;
    const key = this.outboxKey(userId);
    let queue: Array<{ queueId: string; table: string; operation: 'upsert' | 'delete' | 'storage_delete'; payload?: any; recordId?: string }>;
    try { queue = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(queue) || queue.length === 0) return; } catch { return; }
    this.isFlushingOutbox = true;
    const originalIds = new Set(queue.map((item) => item.queueId));
    const remaining = [] as typeof queue;
    try {
      for (const item of queue) {
        if (this.activeUserId !== userId) return;
        try {
          let error: any = null;
          if (item.operation === 'upsert') {
            const result = await supabase.from(item.table).upsert(item.payload, { onConflict: 'id' });
            error = result.error;
          } else if (item.operation === 'delete') {
            const ownerColumn = item.table === 'profiles' ? 'id' : 'user_id';
            const query = supabase.from(item.table).delete().eq('id', item.recordId);
            const result = await (ownerColumn === 'id' ? query : query.eq('user_id', userId));
            error = result.error;
          } else if (item.operation === 'storage_delete') {
            const result = await supabase.storage.from('pms-files').remove([String(item.recordId || '')]);
            error = result.error;
          }
          if (error) throw error;
        } catch (error) {
          console.warn('Perubahan masih menunggu sinkronisasi:', error);
          remaining.push(item);
        }
      }
      if (this.activeUserId === userId) {
        // Keep entries added while this batch was uploading; never overwrite a newer queue.
        let latest: typeof queue = [];
        try { latest = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(latest)) latest = []; } catch { latest = []; }
        const newlyQueued = latest.filter((item) => !originalIds.has(item.queueId));
        const nextQueue = [...remaining, ...newlyQueued];
        localStorage.setItem(key, JSON.stringify(nextQueue));
      }
    } finally {
      this.isFlushingOutbox = false;
    }
    if (this.activeUserId === userId && navigator.onLine) {
      let pending = false;
      try { pending = JSON.parse(localStorage.getItem(key) || '[]').length > 0; } catch { /* no-op */ }
      if (pending && remaining.length === 0) void this.flushOutbox();
    }
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
    localStorage.setItem(this.key(STORAGE_KEYS.PROFILE), JSON.stringify(updated));
    if (supabase && this.activeUserId && this.cloudWritesEnabled) {
      this.enqueueMutation({ table: 'profiles', operation: 'upsert', payload: { id: this.activeUserId, name: updated.name, email: updated.email, currency: updated.currency, timezone: updated.timezone, theme: updated.theme } });
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
      id: crypto.randomUUID(),
      user_id: profile.id,
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

    tasks[index] = {
      ...tasks[index],
      ...updates,
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
      this.enqueueMutation({ table: 'tasks', operation: 'delete', recordId: id });
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
    const newTx: Transaction = {
      ...txData,
      id: crypto.randomUUID(),
      user_id: profile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    list.unshift(newTx);
    localStorage.setItem(this.key(STORAGE_KEYS.TRANSACTIONS), JSON.stringify(list));
    this.logActivity(
      'finance',
      `Catatan ${newTx.type === 'income' ? 'pemasukan' : 'pengeluaran'}: Rp${newTx.amount.toLocaleString('id-ID')} (${newTx.description})`,
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
      this.enqueueMutation({ table: 'transactions', operation: 'delete', recordId: id });
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
      user_id: profile.id,
      created_at: new Date().toISOString(),
    };
    list.unshift(newFile);
    localStorage.setItem(this.key(STORAGE_KEYS.FILES), JSON.stringify(list));
    this.logActivity('file', `Mengunggah file: "${newFile.name}"`, 'created');
    this.notify();

    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      this.enqueueMutation({ table: 'files', operation: 'upsert', payload: { id: newFile.id, user_id: newFile.user_id, name: newFile.name, category: newFile.category, storage_path: newFile.storage_path, file_type: newFile.file_type, file_size: newFile.file_size, created_at: newFile.created_at } });
    }

    return newFile;
  }

  public async uploadRealFile(file: File, category: string): Promise<FileItem> {
    const profile = this.getProfile();
    const safeExt = file.name.split('.').pop()?.toLowerCase() || 'file';
    if (file.size > 20 * 1024 * 1024) throw new Error('Ukuran file maksimal 20 MB.');
    const fileId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${profile.id}/${fileId}/${safeName}`;
    let fileUrl = '#';

    // Upload to Supabase Storage bucket 'pms-files' if configured
    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      if (!navigator.onLine) throw new Error('Upload file memerlukan koneksi internet. Coba lagi saat online.');
      try {
        const { error: uploadError } = await supabase.storage
          .from('pms-files')
          .upload(storagePath, file, { upsert: true });

        if (!uploadError) {
          const { data: urlData, error: signedUrlError } = await supabase.storage
            .from('pms-files').createSignedUrl(storagePath, 60 * 60);
          if (!signedUrlError && urlData?.signedUrl) fileUrl = urlData.signedUrl;
          else console.warn('Signed URL gagal dibuat:', signedUrlError?.message);
        } else {
          console.warn('Supabase storage upload error:', uploadError.message);
          throw uploadError;
        }
      } catch (err) {
        console.warn('Supabase storage upload gagal:', err);
        throw new Error(err instanceof Error ? err.message : 'Upload file ke cloud gagal. Coba lagi.');
      }
    }

    // Fallback to local session object URL if offline/not yet configured
    if (fileUrl === '#') {
      try {
        fileUrl = URL.createObjectURL(file);
      } catch {
        fileUrl = '#';
      }
    }

    const newFileItem: FileItem = {
      id: fileId,
      user_id: profile.id,
      name: file.name,
      category: category.trim() || 'Kuliah',
      storage_path: storagePath,
      file_type: safeExt,
      file_size: file.size,
      created_at: new Date().toISOString(),
      url: fileUrl,
    };

    const list = this.getFiles();
    list.unshift(newFileItem);
    localStorage.setItem(this.key(STORAGE_KEYS.FILES), JSON.stringify(list));
    this.logActivity('file', `Mengunggah file: "${newFileItem.name}"`, 'created');
    this.notify();

    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      this.enqueueMutation({ table: 'files', operation: 'upsert', payload: { id: newFileItem.id, user_id: newFileItem.user_id, name: newFileItem.name, category: newFileItem.category, storage_path: newFileItem.storage_path, file_type: newFileItem.file_type, file_size: newFileItem.file_size, created_at: newFileItem.created_at } });
    }

    return newFileItem;
  }


  public async getFileUrl(file: FileItem): Promise<string | null> {
    if (!supabase || !this.activeUserId || !file.storage_path) return file.url && file.url !== '#' ? file.url : null;
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
      this.enqueueMutation({ table: 'files', operation: 'delete', recordId: id });
    }

    return true;
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

  public createWishlistItem(
    wishData: Omit<WishlistItem, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed'>
  ): WishlistItem {
    const list = this.getWishlist();
    const profile = this.getProfile();
    const newItem: WishlistItem = {
      ...wishData,
      id: crypto.randomUUID(),
      user_id: profile.id,
      completed: wishData.saved_amount >= wishData.target_price,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    list.unshift(newItem);
    localStorage.setItem(this.key(STORAGE_KEYS.WISHLIST), JSON.stringify(list));
    this.logActivity('wishlist', `Menambah target impian: "${newItem.name}"`, 'created');
    this.notify();

    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      this.enqueueMutation({ table: 'wishlist_items', operation: 'upsert', payload: newItem });
    }

    return newItem;
  }

  public updateWishlistDeposit(id: string, additionalAmount: number): WishlistItem | null {
    const list = this.getWishlist();
    const index = list.findIndex((w) => w.id === id);
    if (index === -1) return null;

    const current = list[index];
    const newSaved = Math.max(0, current.saved_amount + additionalAmount);
    const isCompleted = newSaved >= current.target_price;

    list[index] = {
      ...current,
      saved_amount: newSaved,
      completed: isCompleted,
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(this.key(STORAGE_KEYS.WISHLIST), JSON.stringify(list));
    this.logActivity(
      'wishlist',
      `Menambah tabungan untuk "${current.name}": +Rp${additionalAmount.toLocaleString('id-ID')}`,
      'updated'
    );
    this.notify();

    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      this.enqueueMutation({ table: 'wishlist_items', operation: 'upsert', payload: list[index] });
    }

    return list[index];
  }

  public deleteWishlistItem(id: string): boolean {
    const list = this.getWishlist();
    const item = list.find((w) => w.id === id);
    const filtered = list.filter((w) => w.id !== id);
    localStorage.setItem(this.key(STORAGE_KEYS.WISHLIST), JSON.stringify(filtered));
    if (item) {
      this.logActivity('wishlist', `Menghapus impian: "${item.name}"`, 'deleted');
    }
    this.notify();

    if (this.cloudWritesEnabled && supabase && this.activeUserId) {
      this.enqueueMutation({ table: 'wishlist_items', operation: 'delete', recordId: id });
    }

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
