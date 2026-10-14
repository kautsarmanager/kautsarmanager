import React from 'react';
import { Lock, LogOut } from 'lucide-react';
import type { UserAccount } from '../types';

interface AppLockScreenProps {
  currentUser: UserAccount;
  onUnlocked: () => void;
  onLogout: () => void;
  isDark: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({ currentUser, onLogout, isDark }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? 'bg-[#090a0d] text-zinc-100' : 'bg-[#f4f5f8] text-zinc-900'}`}>
    <div className={`w-full max-w-sm rounded-3xl p-7 sm:p-8 shadow-2xl flex flex-col items-center text-center ${isDark ? 'bg-[#17191f]' : 'bg-white'}`}>
      <div className="w-14 h-14 rounded-2xl bg-lime-400/15 flex items-center justify-center text-lime-500 mb-4"><Lock className="w-6 h-6" /></div>
      <h2 className="text-lg font-bold">Sesi dikunci</h2>
      <p className={`text-sm mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Akun: <strong>{currentUser.email || currentUser.username}</strong></p>
      <p className={`text-sm mt-3 leading-6 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Untuk melanjutkan dengan aman, keluar dari sesi ini lalu masuk kembali menggunakan akun dan kata sandi Anda.</p>
      <button type="button" onClick={onLogout} className="w-full mt-6 py-3 text-sm font-semibold rounded-xl bg-lime-400 text-zinc-950 hover:bg-lime-300 flex items-center justify-center gap-2"><LogOut className="w-4 h-4" />Keluar dan masuk kembali</button>
    </div>
  </div>
);
