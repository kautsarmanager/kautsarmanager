import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { UserAccount } from '../types';

const LOCK_KEY = 'pms_is_app_locked';
const USER_CACHE_KEY = 'pms_auth_user_cache';
const PIN_FLAG_PREFIX = 'pms_app_pin_enabled:';

export interface PinResult {
  success: boolean;
  error?: string;
  isLocked?: boolean;
  remainingLockSeconds?: number;
  attemptsLeft?: number;
}

interface PinRpcResponse {
  ok?: boolean;
  reason?: 'no_pin' | 'locked' | 'wrong_pin' | 'invalid_format';
  retry_after?: number;
  attempts_left?: number;
}

function toUser(user: User | null | undefined): UserAccount | null {
  if (!user?.id) return null;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const username = String(meta.username || user.email?.split('@')[0] || 'Pengguna');
  return {
    id: user.id,
    username,
    email: user.email || '',
    created_at: user.created_at || new Date().toISOString(),
    avatar_url: typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined,
  };
}

function safeSet(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* storage penuh/diblokir */ } }
function safeRemove(key: string) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
function safeGet(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }

class AuthService {
  private listeners = new Set<() => void>();
  private currentUser: UserAccount | null = null;
  private initialized = false;
  private profileRealtimeChannel: RealtimeChannel | null = null;
  private profileRealtimeUserId: string | null = null;
  private pinEnabled = false;

  constructor() {
    if (supabase) {
      supabase.auth.onAuthStateChange((_event, session) => {
        this.currentUser = toUser(session?.user);
        if (this.currentUser) safeSet(USER_CACHE_KEY, JSON.stringify(this.currentUser));
        else { safeRemove(USER_CACHE_KEY); this.pinEnabled = false; }
        this.initialized = true;
        // Callback auth Supabase tidak boleh memanggil request database secara inline.
        window.setTimeout(() => {
          if (this.currentUser) {
            void this.syncAccountProfileFromCloud()
              .then(() => this.syncPinStatus())
              .then(() => { this.startProfileRealtime(); this.notify(); });
          } else {
            this.stopProfileRealtime();
          }
        }, 0);
        this.notify();
      });
    }
  }

  public subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private notify() { this.listeners.forEach((listener) => listener()); }

  public async initialize(): Promise<UserAccount | null> {
    if (!isSupabaseConfigured || !supabase) { this.currentUser = null; this.initialized = true; this.notify(); return null; }
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    this.currentUser = toUser(data.session?.user);
    if (this.currentUser) {
      safeSet(USER_CACHE_KEY, JSON.stringify(this.currentUser));
      await this.syncAccountProfileFromCloud();
      await this.syncPinStatus();
      this.startProfileRealtime();
      if (!this.hasPin()) safeRemove(LOCK_KEY);
    } else {
      safeRemove(USER_CACHE_KEY);
    }
    this.initialized = true; this.notify(); return this.currentUser;
  }

  public isInitialized() { return this.initialized; }
  public getCurrentUser(): UserAccount | null { return this.currentUser; }
  public isConfigured() { return isSupabaseConfigured; }

  public async register(params: { username: string; email: string; password: string }): Promise<{ success: boolean; user?: UserAccount; error?: string; needsEmailConfirmation?: boolean }> {
    if (!supabase || !isSupabaseConfigured) return { success: false, error: 'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env.local.' };
    const username = params.username.trim(); const email = params.email.trim().toLowerCase();
    if (username.length < 3 || username.length > 80) return { success: false, error: 'Nama pengguna harus 3–80 karakter.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'Format email tidak valid.' };
    if (params.password.length < 8) return { success: false, error: 'Password minimal 8 karakter.' };
    if (params.password.length > 128) return { success: false, error: 'Password maksimal 128 karakter.' };
    const { data, error } = await supabase.auth.signUp({ email, password: params.password, options: { data: { username } } });
    if (error) return { success: false, error: error.message };
    const user = toUser(data.user); if (!user) return { success: false, error: 'Akun belum berhasil dibuat.' };
    if (data.session) { this.currentUser = user; safeSet(USER_CACHE_KEY, JSON.stringify(user)); this.notify(); return { success: true, user }; }
    return { success: true, user, needsEmailConfirmation: true };
  }

  public async login(email: string, password: string): Promise<{ success: boolean; user?: UserAccount; error?: string; needsEmailConfirmation?: boolean }> {
    if (!supabase || !isSupabaseConfigured) return { success: false, error: 'Supabase belum dikonfigurasi. Periksa file .env.local.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { success: false, error: error.message };
    const user = toUser(data.user); if (!user) return { success: false, error: 'Data akun tidak ditemukan.' };
    this.currentUser = user;
    await this.syncAccountProfileFromCloud();
    safeSet(USER_CACHE_KEY, JSON.stringify(this.currentUser || user));
    safeRemove(LOCK_KEY); // login dengan password sudah membuktikan identitas
    await this.syncPinStatus();
    this.startProfileRealtime();
    this.notify();
    return { success: true, user: this.currentUser || user };
  }

  public async updateUsername(usernameValue: string): Promise<{ success: boolean; error?: string; user?: UserAccount }> {
    const username = usernameValue.trim();
    if (username.length < 3 || username.length > 80) return { success: false, error: 'Username harus 3–80 karakter.' };
    if (!supabase || !isSupabaseConfigured) return { success: false, error: 'Koneksi Supabase belum tersedia.' };

    // User dalam cache bukan bukti sesi aktif: periksa sesi nyata, lalu coba refresh.
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return { success: false, error: `Gagal memeriksa sesi login: ${sessionError.message}` };
    if (!sessionData.session) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session) {
        return { success: false, error: 'Sesi login tidak aktif. Silakan login kembali dengan email dan password, lalu simpan username.' };
      }
    }

    const { data, error } = await supabase.auth.updateUser({ data: { username } });
    if (error) {
      const message = error.message === 'Auth session missing!'
        ? 'Sesi login tidak aktif. Silakan login kembali dengan email dan password, lalu simpan username.'
        : error.message;
      return { success: false, error: message };
    }
    const user = toUser(data.user);
    if (!user) return { success: false, error: 'Username diperbarui tetapi data akun tidak dapat dibaca.' };
    this.currentUser = user;
    const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id, name: username, email: user.email }, { onConflict: 'id' });
    if (profileError) return { success: false, error: `Username akun berubah, tetapi profil cloud gagal disinkronkan: ${profileError.message}` };
    safeSet(USER_CACHE_KEY, JSON.stringify(user));
    this.startProfileRealtime();
    this.notify();
    return { success: true, user };
  }

  public async logout() {
    this.stopProfileRealtime();
    const userId = this.currentUser?.id;
    if (supabase) {
      try { await supabase.auth.signOut(); } catch (error) { console.warn('Sign out gagal; sesi lokal tetap dibersihkan.', error); }
    }
    this.currentUser = null; this.pinEnabled = false;
    safeRemove(USER_CACHE_KEY); safeRemove(LOCK_KEY);
    if (userId) safeRemove(PIN_FLAG_PREFIX + userId);
    this.notify();
  }

  private startProfileRealtime() {
    if (!supabase || !this.currentUser || !isSupabaseConfigured) return;
    const userId = this.currentUser.id;
    if (this.profileRealtimeUserId === userId && this.profileRealtimeChannel) return;
    this.stopProfileRealtime();
    this.profileRealtimeUserId = userId;
    this.profileRealtimeChannel = supabase
      .channel(`pms-profile-auth-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => {
        void (async () => {
          await this.syncAccountProfileFromCloud();
          await this.syncPinStatus();
          this.notify();
        })();
      })
      .subscribe((status: string, error?: Error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`Profile realtime status: ${status}`, error || '');
        }
      });
  }

  private stopProfileRealtime() {
    if (this.profileRealtimeChannel && supabase) void supabase.removeChannel(this.profileRealtimeChannel);
    this.profileRealtimeChannel = null;
    this.profileRealtimeUserId = null;
  }

  private pinFlagKey() { return `${PIN_FLAG_PREFIX}${this.currentUser?.id || 'no-user'}`; }

  private async syncAccountProfileFromCloud(): Promise<void> {
    if (!supabase || !this.currentUser) return;
    const { data, error } = await supabase.from('profiles').select('name,email').eq('id', this.currentUser.id).maybeSingle();
    if (error) { console.warn('Profile sync failed:', error.message); return; }
    if (data?.name?.trim()) {
      this.currentUser = { ...this.currentUser, username: data.name.trim(), email: data.email || this.currentUser.email };
      safeSet(USER_CACHE_KEY, JSON.stringify(this.currentUser));
    }
  }

  /** Status PIN (ada/tidak) diambil dari server; hash PIN tidak pernah dikirim ke klien. */
  private async syncPinStatus(): Promise<void> {
    if (!supabase || !this.currentUser) return;
    const { data, error } = await supabase.rpc('has_app_pin');
    if (error) { console.warn('Status PIN gagal disinkronkan:', error.message); this.pinEnabled = safeGet(this.pinFlagKey()) === 'true'; return; }
    this.pinEnabled = data === true;
    if (this.pinEnabled) safeSet(this.pinFlagKey(), 'true'); else { safeRemove(this.pinFlagKey()); safeRemove(LOCK_KEY); }
  }

  public hasPin(): boolean {
    return !!this.currentUser && (this.pinEnabled || safeGet(this.pinFlagKey()) === 'true');
  }
  public isAppLocked(): boolean { return !!this.currentUser && safeGet(LOCK_KEY) === 'true'; }
  public lockApp(): boolean { if (!this.hasPin()) return false; safeSet(LOCK_KEY, 'true'); this.notify(); return true; }
  public unlockAppWithoutPin() { safeRemove(LOCK_KEY); this.notify(); }

  private mapPinResponse(res: PinRpcResponse | null): PinResult {
    if (!res) return { success: false, error: 'Respons server tidak valid.' };
    if (res.ok) return { success: true };
    switch (res.reason) {
      case 'locked': {
        const wait = Number(res.retry_after) || 60;
        return { success: false, isLocked: true, remainingLockSeconds: wait, error: `Terlalu banyak percobaan. Coba lagi dalam ${wait} detik.` };
      }
      case 'wrong_pin': {
        const left = Number(res.attempts_left ?? 0);
        return { success: false, attemptsLeft: left, error: `PIN salah. Sisa percobaan: ${left}.` };
      }
      case 'invalid_format': return { success: false, error: 'PIN harus terdiri dari 6 angka.' };
      case 'no_pin': return { success: false, error: 'PIN belum diatur untuk akun ini.' };
      default: return { success: false, error: 'PIN tidak dapat diverifikasi.' };
    }
  }

  private async callPinRpc(fn: 'verify_app_pin' | 'set_app_pin' | 'remove_app_pin', args: Record<string, string | null>): Promise<PinResult> {
    if (!supabase || !this.currentUser) return { success: false, error: 'Sesi akun tidak ditemukan.' };
    if (!navigator.onLine) return { success: false, error: 'Verifikasi PIN memerlukan koneksi internet. Sambungkan perangkat atau masuk dengan password.' };
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      const missing = /function|schema cache|does not exist/i.test(error.message);
      return { success: false, error: missing ? 'Fitur PIN belum aktif di server. Jalankan migrasi 202610280001_server_side_pin_and_hardening.sql.' : `Gagal memproses PIN: ${error.message}` };
    }
    return this.mapPinResponse(data as PinRpcResponse);
  }

  public async setPin(pin: string, currentPin?: string): Promise<PinResult> {
    if (!/^\d{6}$/.test(pin)) return { success: false, error: 'PIN harus terdiri dari 6 angka.' };
    if (this.hasPin() && !/^\d{6}$/.test(currentPin || '')) return { success: false, error: 'Masukkan PIN saat ini untuk mengganti PIN.' };
    const result = await this.callPinRpc('set_app_pin', { p_new: pin, p_current: currentPin || null });
    if (result.success) { this.pinEnabled = true; safeSet(this.pinFlagKey(), 'true'); this.notify(); }
    return result;
  }

  public async removePin(currentPin: string): Promise<PinResult> {
    if (!/^\d{6}$/.test(currentPin)) return { success: false, error: 'Masukkan PIN saat ini (6 digit).' };
    const result = await this.callPinRpc('remove_app_pin', { p_current: currentPin });
    if (result.success) { this.pinEnabled = false; safeRemove(this.pinFlagKey()); safeRemove(LOCK_KEY); this.notify(); }
    return result;
  }

  public async unlockWithPin(pin: string): Promise<PinResult> {
    if (!this.currentUser || !this.hasPin()) return { success: false, error: 'PIN belum diatur. Masuk kembali lalu atur PIN di Pengaturan.' };
    if (!/^\d{6}$/.test(pin)) return { success: false, error: 'PIN harus terdiri dari 6 angka.' };
    const result = await this.callPinRpc('verify_app_pin', { p_pin: pin });
    if (result.success) this.unlockAppWithoutPin();
    return result;
  }
}

export const authService = new AuthService();
