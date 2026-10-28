import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  type?: 'success' | 'info' | 'error';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  isDark: boolean;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss, isDark }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border text-xs font-medium shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200 ${
            isDark
              ? 'bg-[#1A1B1E] border-[#26272B] text-zinc-100 shadow-black/50'
              : 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-300/40'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-lime-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="break-words" role={toast.type === 'error' ? 'alert' : 'status'}>{toast.title}</span>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className={`p-1 rounded-md transition-colors ${
              isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-700'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
