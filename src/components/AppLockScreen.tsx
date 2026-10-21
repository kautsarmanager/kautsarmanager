import React, { useEffect, useState } from 'react';
import { Lock, LogIn } from 'lucide-react';
import type { UserAccount } from '../types';
import { PinInput } from './PinInput';
import { authService } from '../services/authService';

interface AppLockScreenProps {
  currentUser: UserAccount;
  onUnlocked: () => void;
  isDark: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({ currentUser, onUnlocked, isDark, onShowToast }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(authService.getSecurityState().remainingLockSeconds);
  const isLocked = remainingSeconds > 0;

  useEffect(() => {
    const timer = window.setInterval(() => setRemainingSeconds(authService.getSecurityState().remainingLockSeconds), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const submitPin = async () => {
    if (pin.length !== 6 || isLocked) return;
    const result = await authService.unlockWithPin(pin);
    if (result.success) {
      setPin(''); setError(null); onUnlocked();
      return;
    }
    setPin(''); setError(result.error || 'PIN tidak benar.');
    setRemainingSeconds(result.remainingLockSeconds || authService.getSecurityState().remainingLockSeconds);
    if (result.isLocked) onShowToast?.(result.error || 'Aplikasi terkunci sementara.', 'error');
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? 'bg-[#090a0d] text-zinc-100' : 'bg-[#f4f5f8] text-zinc-900'}`}>
      <div className={`w-full max-w-sm rounded-3xl p-7 sm:p-8 shadow-2xl flex flex-col items-center text-center ${isDark ? 'bg-[#17191f]' : 'bg-white'}`}>
        <div className="w-14 h-14 rounded-2xl bg-lime-400/15 flex items-center justify-center text-lime-500 mb-4"><Lock className="w-6 h-6" /></div>
        <h2 className="text-lg font-bold">Aplikasi terkunci</h2>
        <p className={`text-sm mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Akun: <strong>{currentUser.email || currentUser.username}</strong></p>
        <p className={`text-sm mt-3 leading-6 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Masukkan PIN 6 digit untuk membuka aplikasi.</p>
        <div className="w-full mt-3">
          <PinInput pin={pin} onChange={setPin} onSubmit={() => { void submitPin(); }} isLocked={isLocked} remainingSeconds={remainingSeconds} isDark={isDark} error={error} />
        </div>
        <button type="button" onClick={() => { void submitPin(); }} disabled={pin.length !== 6 || isLocked} className="w-full mt-5 py-3 text-sm font-semibold rounded-xl bg-lime-500 text-zinc-950 hover:bg-lime-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"><LogIn className="w-4 h-4" />Masuk</button>
      </div>
    </div>
  );
};
