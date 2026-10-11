import React from 'react';
import { Lock, LogOut, ArrowRight } from 'lucide-react';
import type { UserAccount } from '../types';

interface AppLockScreenProps {
  currentUser: UserAccount;
  onUnlocked: () => void;
  onLogout: () => void;
  isDark: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({ currentUser, onUnlocked, onLogout, isDark }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? 'bg-[#0a0b0e] text-zinc-100' : 'bg-[#f4f5f8] text-zinc-900'}`}>
    <div className={`w-full max-w-sm rounded-2xl border p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center ${isDark ? 'bg-[#121319] border-[#222432]' : 'bg-white border-zinc-200'}`}>
      <div className="w-14 h-14 rounded-full bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3"><Lock className="w-6 h-6" /></div>
      <h2 className="text-base font-bold">Aplikasi dijeda</h2>
      <p className={`text-xs mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Sesi aktif: <strong className="text-indigo-400">{currentUser.email || currentUser.username}</strong></p>
      <p className={`text-xs mt-3 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>Ini hanya kunci layar lokal, bukan pengganti autentikasi akun.</p>
      <div className="flex items-center gap-3 w-full mt-6">
        <button type="button" onClick={onLogout} className="flex-1 py-2.5 text-xs font-medium rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 flex items-center justify-center gap-2"><LogOut className="w-3.5 h-3.5" />Keluar</button>
        <button type="button" onClick={onUnlocked} className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2">Lanjutkan<ArrowRight className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  </div>
);
