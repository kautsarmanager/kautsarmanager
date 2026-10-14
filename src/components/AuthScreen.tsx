import React, { useState } from 'react';
import { ShieldCheck, Mail, LockKeyhole, UserRound, AlertCircle, LoaderCircle, ArrowRight } from 'lucide-react';
import { authService } from '../services/authService';
import type { UserAccount } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (user: UserAccount) => void;
  isDark: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, isDark, onShowToast }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailReady, setEmailReady] = useState(false);
  const [passwordReady, setPasswordReady] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const inputClass = `w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none focus:border-lime-500 ${isDark ? 'bg-[#0c0d12] border-[#292c3a] text-zinc-100 placeholder:text-zinc-600' : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'}`;
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setErrorMessage(''); setNotice(''); setIsLoading(true);
    try {
      if (tab === 'register' && password !== confirmPassword) { setErrorMessage('Konfirmasi password tidak sama.'); return; }
      const result = tab === 'register'
        ? await authService.register({ username, email, password })
        : await authService.login(email, password);
      if (!result.success) { setErrorMessage(result.error || 'Autentikasi gagal.'); return; }
      if (result.needsEmailConfirmation) {
        setNotice('Akun berhasil dibuat. Periksa email untuk konfirmasi, lalu masuk kembali.');
        onShowToast?.('Akun dibuat; konfirmasi email jika diminta.', 'info');
        setTab('login'); setPassword(''); setConfirmPassword(''); return;
      }
      if (result.user) {
        onShowToast?.(`Berhasil masuk sebagai ${result.user.username}.`, 'success');
        onAuthSuccess(result.user);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.');
    } finally { setIsLoading(false); }
  };

  return <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#0a0b0e] text-zinc-100' : 'bg-[#f4f5f8] text-zinc-900'}`}>
    <div className={`w-full max-w-md rounded-2xl border p-6 sm:p-8 shadow-2xl ${isDark ? 'bg-[#121319] border-[#222432] shadow-black/80' : 'bg-white border-zinc-200 shadow-xl'}`}>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-lime-600/15 border border-lime-500/30 flex items-center justify-center text-lime-400 mb-3"><ShieldCheck className="w-6 h-6" /></div>
        <h1 className="text-lg font-bold tracking-tight">Manager</h1>
        <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Satu akun untuk semua perangkat dan data Anda</p>
      </div>
      <div className={`flex p-1 rounded-xl border text-xs font-medium mb-5 ${isDark ? 'bg-[#0c0d12] border-[#1e202c]' : 'bg-zinc-100 border-zinc-200'}`}>
        {(['login', 'register'] as const).map((value) => <button key={value} type="button" onClick={() => { setTab(value); setErrorMessage(''); setNotice(''); setEmail(''); setPassword(''); setConfirmPassword(''); setUsername(''); setEmailReady(false); setPasswordReady(false); }} className={`flex-1 py-2 rounded-lg ${tab === value ? (isDark ? 'bg-[#252635] text-white' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-500'}`}>{value === 'login' ? 'Masuk' : 'Daftar akun'}</button>)}
      </div>
      {errorMessage && <div role="alert" className="mb-4 p-3 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400 text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMessage}</span></div>}
      {notice && <div role="status" className="mb-4 p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-xs">{notice}</div>}
      {!authService.isConfigured() && <div className="mb-4 p-3 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300 text-xs">Supabase belum dikonfigurasi. Buat <code>.env.local</code> dari <code>.env.example</code>, isi URL dan publishable/anon key, lalu restart server.</div>}
      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
        {tab === 'register' && <div className="relative"><UserRound className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" /><input autoComplete="name" required minLength={3} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nama pengguna" className={inputClass} /></div>}
        <div className="relative"><Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" /><input type="email" autoComplete="off" autoCapitalize="none" spellCheck={false} readOnly={!emailReady} onFocus={() => setEmailReady(true)} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputClass} /></div>
        <div className="relative"><LockKeyhole className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" /><input type="password" autoComplete="new-password" readOnly={!passwordReady} onFocus={() => setPasswordReady(true)} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (minimal 8 karakter)" className={inputClass} /></div>
        {tab === 'register' && <div className="relative"><LockKeyhole className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" /><input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password" className={inputClass} /></div>}
        <button disabled={isLoading || !authService.isConfigured()} type="submit" className="w-full flex items-center justify-center gap-2 rounded-xl py-3 bg-lime-600 hover:bg-lime-500 text-white text-sm font-semibold disabled:opacity-50">
          {isLoading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <>{tab === 'login' ? 'Masuk ke aplikasi' : 'Buat akun'} <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
      <p className={`text-[11px] text-center mt-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Data disimpan per akun. Jangan gunakan password yang sama dengan akun penting lainnya.</p>
    </div>
  </div>;
};
