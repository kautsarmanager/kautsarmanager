import React, { useEffect, useRef, useState } from 'react';
import { Lock, LogIn, LogOut } from 'lucide-react';
import type { UserAccount } from '../types';
import { PinInput } from './PinInput';
import { authService } from '../services/authService';

interface AppLockScreenProps {
  currentUser: UserAccount;
  onUnlocked: () => void;
  onForgotPin?: () => void;
  isDark: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({ currentUser, onUnlocked, onForgotPin, isDark, onShowToast }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const isLocked = remainingSeconds > 0;

  // Hitung mundur lokal; batas percobaan sebenarnya dikelola server.
  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = window.setTimeout(() => setRemainingSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [remainingSeconds]);

  const submitPin = async (value: string) => {
    if (value.length !== 6 || isLocked || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const result = await authService.unlockWithPin(value);
      if (result.success) { setPin(''); setError(null); onUnlocked(); return; }
      setPin(''); setError(result.error || 'PIN tidak benar.');
      if (result.isLocked) {
        setRemainingSeconds(result.remainingLockSeconds || 60);
        onShowToast?.(result.error || 'Aplikasi terkunci sementara.', 'error');
      }
    } finally { busyRef.current = false; setBusy(false); }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? 'bg-[#090a0d] text-zinc-100' : 'bg-[#f4f5f8] text-zinc-900'}`}>
      <div className={`w-full max-w-sm rounded-3xl p-7 sm:p-8 shadow-2xl flex flex-col items-center text-center ${isDark ? 'bg-[#17191f]' : 'bg-white'}`}>
        <div className="w-14 h-14 rounded-2xl bg-lime-400/15 flex items-center justify-center text-lime-500 mb-4"><Lock className="w-6 h-6" /></div>
        <h2 className="text-lg font-bold">Aplikasi terkunci</h2>
        <p className={`text-sm mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Akun: <strong>{currentUser.email || currentUser.username}</strong></p>
        <p className={`text-sm mt-3 leading-6 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Masukkan PIN 6 digit untuk membuka aplikasi.</p>
        <div className="w-full mt-3">
          <PinInput pin={pin} onChange={setPin} onSubmit={(value) => { void submitPin(value); }} isLocked={isLocked || busy} remainingSeconds={remainingSeconds} isDark={isDark} error={error} />
        </div>
        <button type="button" onClick={() => { void submitPin(pin); }} disabled={pin.length !== 6 || isLocked || busy} className="w-full mt-5 py-3 text-sm font-semibold rounded-xl bg-lime-500 text-zinc-950 hover:bg-lime-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"><LogIn className="w-4 h-4" />Masuk</button>
        {onForgotPin && (
          <button type="button" onClick={onForgotPin} className={`mt-3 text-xs flex items-center gap-1.5 ${isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'}`}>
            <LogOut className="w-3.5 h-3.5" />Lupa PIN? Keluar dan masuk dengan password
          </button>
        )}
      </div>
    </div>
  );
};
