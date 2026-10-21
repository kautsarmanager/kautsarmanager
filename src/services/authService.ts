import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { UserAccount } from '../types';

const LOCK_KEY = 'pms_is_app_locked';
const USER_CACHE_KEY = 'pms_auth_user_cache';
const PIN_ATTEMPTS_LIMIT = 5;
const PIN_LOCK_SECONDS = 60;
const PIN_ITERATIONS = 120_000;

function toUser(user: any): UserAccount | null {
  if (!user?.id) return null;
  const username = String(user.user_metadata?.username || user.email?.split('@')[0] || 'Pengguna');
  return { id: user.id, username, email: user.email || '', created_at: user.created_at || new Date().toISOString(), avatar_url: user.user_metadata?.avatar_url };
}

function bytesToHex(bytes: Uint8Array): string { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''); }
function hexToBytes(hex: string): Uint8Array { return new Uint8Array((hex.match(/.{1,2}/g) || []).map((byte) => parseInt(byte, 16))); }

class AuthService {
  private listeners = new Set<() => void>();
  private currentUser: UserAccount | null = null;
  private initialized = false;

  constructor() {
    if (supabase) {
      supabase.auth.onAuthStateChange((_event, session) => {
        this.currentUser = toUser(session?.user);
        if (this.currentUser) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(this.currentUser));
        else localStorage.removeItem(USER_CACHE_KEY);
        this.initialized = true;
        this.notify();
      });
    }
  }

  public subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private notify() { this.listeners.forEach((listener) => listener()); }

  public async initialize(): Promise<UserAccount | null> {
    if (!isSupabaseConfigured || !supabase) { this.currentUser = null; this.initialized = true; this.notify(); return null; }
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    this.currentUser = toUser(data.session?.user);
    if (this.currentUser) { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(this.currentUser)); await this.syncPinFromCloud(); if (!this.hasPin()) localStorage.removeItem(LOCK_KEY); }
    else localStorage.removeItem(USER_CACHE_KEY);
    this.initialized = true; this.notify(); return this.currentUser;
  }

  public isInitialized() { return this.initialized; }
  public getCurrentUser(): UserAccount | null { return this.currentUser; }
  public isConfigured() { return isSupabaseConfigured; }

  public async register(params: { username: string; email: string; password: string }): Promise<{ success: boolean; user?: UserAccount; error?: string; needsEmailConfirmation?: boolean }> {
    if (!supabase || !isSupabaseConfigured) return { success: false, error: 'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env.local.' };
    const username = params.username.trim(); const email = params.email.trim().toLowerCase();
    if (username.length < 3) return { success: false, error: 'Nama pengguna minimal 3 karakter.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'Format email tidak valid.' };
    if (params.password.length < 8) return { success: false, error: 'Password minimal 8 karakter.' };
    const { data, error } = await supabase.auth.signUp({ email, password: params.password, options: { data: { username } } });
    if (error) return { success: false, error: error.message };
    const user = toUser(data.user); if (!user) return { success: false, error: 'Akun belum berhasil dibuat.' };
    if (data.session) { this.currentUser = user; localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user)); this.notify(); return { success: true, user }; }
    return { success: true, user, needsEmailConfirmation: true };
  }

  public async login(email: string, password: string): Promise<{ success: boolean; user?: UserAccount; error?: string; needsEmailConfirmation?: boolean }> {
    if (!supabase || !isSupabaseConfigured) return { success: false, error: 'Supabase belum dikonfigurasi. Periksa file .env.local.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { success: false, error: error.message };
    const user = toUser(data.user); if (!user) return { success: false, error: 'Data akun tidak ditemukan.' };
    this.currentUser = user; localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user)); localStorage.removeItem(LOCK_KEY); await this.syncPinFromCloud(); this.notify();
    return { success: true, user };
  }

  public async updateUsername(usernameValue: string): Promise<{ success: boolean; error?: string; user?: UserAccount }> {
    const username = usernameValue.trim();
    if (username.length < 3) return { success: false, error: 'Username minimal 3 karakter.' };
    if (!supabase || !isSupabaseConfigured) return { success: false, error: 'Koneksi Supabase belum tersedia.' };

    // A cached user is not proof of an active Supabase session. Check the real
    // session first, then try refreshing it before updating auth metadata.
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
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    this.notify();
    return { success: true, user };
  }

  public async logout() {
    if (supabase) await supabase.auth.signOut();
    this.currentUser = null; localStorage.removeItem(USER_CACHE_KEY); localStorage.removeItem(LOCK_KEY); this.notify();
  }

  private pinKey() { return `pms_app_pin:${this.currentUser?.id || 'no-user'}`; }
  private pinAttemptsKey() { return `pms_app_pin_attempts:${this.currentUser?.id || 'no-user'}`; }
  private async syncPinFromCloud(): Promise<void> {
    if (!supabase || !this.currentUser) return;
    const { data, error } = await supabase.from('profiles').select('pin_salt,pin_hash,pin_iterations').eq('id', this.currentUser.id).maybeSingle();
    if (error) { console.warn('PIN sync failed:', error.message); return; }
    if (data?.pin_salt && data?.pin_hash) {
      localStorage.setItem(this.pinKey(), JSON.stringify({ salt: data.pin_salt, hash: data.pin_hash, iterations: data.pin_iterations || PIN_ITERATIONS }));
    } else { localStorage.removeItem(this.pinKey()); }
  }

  public hasPin(): boolean { return !!this.currentUser && !!localStorage.getItem(this.pinKey()); }
  public isAppLocked(): boolean { return !!this.currentUser && localStorage.getItem(LOCK_KEY) === 'true'; }
  public lockApp(): boolean { if (!this.hasPin()) return false; localStorage.setItem(LOCK_KEY, 'true'); this.notify(); return true; }
  public unlockAppWithoutPin() { localStorage.removeItem(LOCK_KEY); this.notify(); }

  private async derivePinHash(pin: string, salt: Uint8Array): Promise<string> {
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PIN_ITERATIONS, hash: 'SHA-256' }, keyMaterial, 256);
    return bytesToHex(new Uint8Array(bits));
  }

  public async setPin(pin: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) return { success: false, error: 'Sesi akun tidak ditemukan.' };
    if (!/^\d{6}$/.test(pin)) return { success: false, error: 'PIN harus terdiri dari 6 angka.' };
    if (!crypto?.subtle) return { success: false, error: 'Browser tidak mendukung penyimpanan PIN aman. Gunakan HTTPS atau localhost.' };
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await this.derivePinHash(pin, salt);
    if (!supabase) return { success: false, error: 'Koneksi akun tidak tersedia; PIN belum dapat disinkronkan.' };
    const pinData = { pin_salt: bytesToHex(salt), pin_hash: hash, pin_iterations: PIN_ITERATIONS };
    const { error } = await supabase.from('profiles').update(pinData).eq('id', this.currentUser.id);
    if (error) return { success: false, error: `PIN gagal disinkronkan: ${error.message}. Pastikan migrasi PIN sudah dijalankan di Supabase.` };
    localStorage.setItem(this.pinKey(), JSON.stringify({ salt: pinData.pin_salt, hash: pinData.pin_hash, iterations: PIN_ITERATIONS }));
    localStorage.removeItem(this.pinAttemptsKey());
    return { success: true };
  }

  public async removePin(): Promise<void> {
    if (supabase && this.currentUser) {
      const { error } = await supabase.from('profiles').update({ pin_salt: null, pin_hash: null, pin_iterations: null }).eq('id', this.currentUser.id);
      if (error) throw new Error(`PIN gagal dihapus dari akun: ${error.message}`);
    }
    localStorage.removeItem(this.pinKey()); localStorage.removeItem(this.pinAttemptsKey());
    localStorage.removeItem(LOCK_KEY); this.notify();
  }

  public getSecurityState() {
    let state = { failedAttempts: 0, lockedUntil: 0 };
    try { state = { ...state, ...JSON.parse(localStorage.getItem(this.pinAttemptsKey()) || '{}') }; } catch { /* Reset malformed local state. */ }
    const remainingLockSeconds = Math.max(0, Math.ceil((Number(state.lockedUntil) - Date.now()) / 1000));
    return { failedAttempts: Number(state.failedAttempts) || 0, isLocked: remainingLockSeconds > 0, remainingLockSeconds, attemptsRemainingBeforeLock: Math.max(0, PIN_ATTEMPTS_LIMIT - (Number(state.failedAttempts) || 0)) };
  }

  public recordFailedPinAttempt() {
    const current = this.getSecurityState();
    if (current.isLocked) return { isLocked: true, remainingLockSeconds: current.remainingLockSeconds, attemptsLeft: 0 };
    const failedAttempts = current.failedAttempts + 1;
    const lockedUntil = failedAttempts >= PIN_ATTEMPTS_LIMIT ? Date.now() + PIN_LOCK_SECONDS * 1000 : 0;
    localStorage.setItem(this.pinAttemptsKey(), JSON.stringify({ failedAttempts: lockedUntil ? 0 : failedAttempts, lockedUntil }));
    return { isLocked: !!lockedUntil, remainingLockSeconds: lockedUntil ? PIN_LOCK_SECONDS : 0, attemptsLeft: lockedUntil ? 0 : PIN_ATTEMPTS_LIMIT - failedAttempts };
  }

  public resetPinSecurity() { localStorage.removeItem(this.pinAttemptsKey()); }

  public async unlockWithPin(pin: string): Promise<{ success: boolean; error?: string; isLocked?: boolean; remainingLockSeconds?: number }> {
    if (!this.currentUser || !this.hasPin()) return { success: false, error: 'PIN belum diatur. Masuk kembali lalu atur PIN di Pengaturan.' };
    const state = this.getSecurityState();
    if (state.isLocked) return { success: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${state.remainingLockSeconds} detik.`, isLocked: true, remainingLockSeconds: state.remainingLockSeconds };
    let stored: { salt: string; hash: string; iterations?: number };
    try { stored = JSON.parse(localStorage.getItem(this.pinKey()) || 'null'); } catch { return { success: false, error: 'Data PIN rusak. Silakan masuk kembali.' }; }
    if (!stored?.salt || !stored?.hash) return { success: false, error: 'Data PIN tidak valid. Silakan masuk kembali.' };
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(stored.salt), iterations: stored.iterations || PIN_ITERATIONS, hash: 'SHA-256' }, keyMaterial, 256);
    const actual = bytesToHex(new Uint8Array(bits));
    if (actual !== stored.hash) {
      const failed = this.recordFailedPinAttempt();
      return { success: false, error: failed.isLocked ? `Terlalu banyak percobaan. Aplikasi terkunci ${failed.remainingLockSeconds} detik.` : `PIN salah. Sisa percobaan: ${failed.attemptsLeft}.`, isLocked: failed.isLocked, remainingLockSeconds: failed.remainingLockSeconds };
    }
    this.resetPinSecurity(); this.unlockAppWithoutPin();
    return { success: true };
  }
}

export const authService = new AuthService();
