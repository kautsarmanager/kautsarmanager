import React, { useEffect, useRef } from 'react';
import { Delete, Lock, ShieldAlert } from 'lucide-react';

interface PinInputProps {
  pin: string;
  onChange: (pin: string) => void;
  onSubmit?: () => void;
  isLocked?: boolean;
  remainingSeconds?: number;
  isDark: boolean;
  error?: string | null;
  length?: number;
}

export const PinInput: React.FC<PinInputProps> = ({
  pin,
  onChange,
  onSubmit,
  isLocked = false,
  remainingSeconds = 0,
  isDark,
  error,
  length = 6,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard number listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return;

      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < length) {
          const next = pin + e.key;
          onChange(next);
          if (next.length === length && onSubmit) {
            setTimeout(onSubmit, 50);
          }
        }
      } else if (e.key === 'Backspace') {
        onChange(pin.slice(0, -1));
      } else if (e.key === 'Enter' && pin.length === length && onSubmit) {
        onSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isLocked, length, onChange, onSubmit]);

  const handleKeyPress = (num: string) => {
    if (isLocked) return;
    if (pin.length < length) {
      const next = pin + num;
      onChange(next);
      if (next.length === length && onSubmit) {
        setTimeout(onSubmit, 80);
      }
    }
  };

  const handleBackspace = () => {
    if (isLocked) return;
    onChange(pin.slice(0, -1));
  };

  const handleClear = () => {
    if (isLocked) return;
    onChange('');
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[280px] mx-auto select-none" ref={containerRef}>
      {/* 6 Dots Indicator */}
      <div className="flex items-center justify-center gap-3 my-3">
        {Array.from({ length }).map((_, idx) => {
          const isFilled = idx < pin.length;
          return (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                isFilled
                  ? 'bg-indigo-500 border-indigo-400 scale-110 shadow-xs shadow-indigo-500/50'
                  : isDark
                  ? 'border-zinc-700 bg-[#161720]'
                  : 'border-zinc-300 bg-zinc-100'
              }`}
            />
          );
        })}
      </div>

      {/* Lockout Banner if Anti-Brute Force triggered */}
      {isLocked ? (
        <div className="w-full my-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs text-center flex flex-col items-center gap-1.5 animate-pulse">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <span className="font-semibold">Anti-Brute Force Aktif</span>
          <span className="text-[11px] opacity-90">
            Terkunci selama <strong className="font-mono text-white text-xs">{remainingSeconds} detik</strong>
          </span>
        </div>
      ) : error ? (
        <p className="text-[11px] text-rose-400 text-center my-1.5 font-medium animate-shake">
          {error}
        </p>
      ) : (
        <p className={`text-[11px] text-center my-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Ketik 6 digit PIN numerik
        </p>
      )}

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-2.5 w-full mt-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            disabled={isLocked}
            onClick={() => handleKeyPress(num)}
            className={`h-12 rounded-xl text-base font-semibold font-mono transition-all flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${
              isDark
                ? 'bg-[#181923] hover:bg-[#202230] text-zinc-100 border border-[#262837]'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200'
            }`}
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          disabled={isLocked || pin.length === 0}
          onClick={handleClear}
          className={`h-12 rounded-xl text-xs font-medium transition-all flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-20 disabled:pointer-events-none ${
            isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Hapus
        </button>

        <button
          type="button"
          disabled={isLocked}
          onClick={() => handleKeyPress('0')}
          className={`h-12 rounded-xl text-base font-semibold font-mono transition-all flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${
            isDark
              ? 'bg-[#181923] hover:bg-[#202230] text-zinc-100 border border-[#262837]'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200'
          }`}
        >
          0
        </button>

        <button
          type="button"
          disabled={isLocked || pin.length === 0}
          onClick={handleBackspace}
          className={`h-12 rounded-xl text-xs font-medium transition-all flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-20 disabled:pointer-events-none ${
            isDark
              ? 'bg-[#181923] hover:bg-[#202230] text-zinc-400 hover:text-zinc-200 border border-[#262837]'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border border-zinc-200'
          }`}
          aria-label="Hapus digit"
        >
          <Delete className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
