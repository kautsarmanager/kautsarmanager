import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { UserAccount } from '../types';

const LOCK_KEY = 'pms_is_app_locked';
const USER_CACHE_KEY = 'pms_auth_user_cache';

function toUser(user: any): UserAccount | null {
  if (!user?.id) return null;
  const username = String(user.user_metadata?.username || user.email?.split('@')[0] || 'Pengguna');
  return {
    id: user.id,
    username,
    email: user.email || '',
    created_at: user.created_at || new Date().toISOString(),
    avatar_url: user.user_metadata?.avatar_url,
  };
}

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

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() { this.listeners.forEach((listener) => listener()); }

  public async initialize(): Promise<UserAccount | null> {
    if (!isSupabaseConfigured || !supabase) {
      this.currentUser = null;
      this.initialized = true;
      this.notify();
      return null;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    this.currentUser = toUser(data.session?.user);
    if (this.currentUser) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(this.currentUser));
    else localStorage.removeItem(USER_CACHE_KEY);
    this.initialized = true;
    this.notify();
    return this.currentUser;
  }

  public isInitialized() { return this.initialized; }
  public getCurrentUser(): UserAccount | null { return this.currentUser; }
  public isConfigured() { return isSupabaseConfigured; }

  public async register(params: { username: string; email: string; password: string }): Promise<{ success: boolean; user?: UserAccount; error?: string; needsEmailConfirmation?: boolean }> {
    if (!supabase || !isSupabaseConfigured) return { success: false, error: 'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env.local.' };
    const username = params.username.trim();
    const email = params.email.trim().toLowerCase();
    if (username.length < 3) return { success: false, error: 'Nama pengguna minimal 3 karakter.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'Format email tidak valid.' };
    if (params.password.length < 8) return { success: false, error: 'Password minimal 8 karakter.' };
    const { data, error } = await supabase.auth.signUp({ email, password: params.password, options: { data: { username } } });
    if (error) return { success: false, error: error.message };
    const user = toUser(data.user);
    if (!user) return { success: false, error: 'Akun belum berhasil dibuat.' };
    if (data.session) {
      this.currentUser = user;
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      this.notify();
      return { success: true, user };
    }
    return { success: true, user, needsEmailConfirmation: true };
  }

  public async login(email: string, password: string): Promise<{ success: boolean; user?: UserAccount; error?: string; needsEmailConfirmation?: boolean }> {
    if (!supabase || !isSupabaseConfigured) return { success: false, error: 'Supabase belum dikonfigurasi. Periksa file .env.local.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { success: false, error: error.message };
    const user = toUser(data.user);
    if (!user) return { success: false, error: 'Data akun tidak ditemukan.' };
    this.currentUser = user;
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    localStorage.removeItem(LOCK_KEY);
    this.notify();
    return { success: true, user };
  }

  public async logout() {
    if (supabase) await supabase.auth.signOut();
    this.currentUser = null;
    localStorage.removeItem(USER_CACHE_KEY);
    localStorage.removeItem(LOCK_KEY);
    this.notify();
  }

  // This is a convenience screen lock only, not a replacement for account authentication.
  public isAppLocked(): boolean { return !!this.currentUser && localStorage.getItem(LOCK_KEY) === 'true'; }
  public lockApp() { localStorage.setItem(LOCK_KEY, 'true'); this.notify(); }
  public unlockAppWithoutPin() { localStorage.removeItem(LOCK_KEY); this.notify(); }
  public async unlockWithPin(_pin: string) { this.unlockAppWithoutPin(); return { success: true }; }
  public getSecurityState() { return { failedAttempts: 0, isLocked: false, remainingLockSeconds: 0, attemptsRemainingBeforeLock: 5 }; }
  public recordFailedPinAttempt() { return { isLocked: false, remainingLockSeconds: 0, attemptsLeft: 5 }; }
  public resetPinSecurity() {}
}


export const authService = new AuthService();
