import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  isDark: boolean;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  isDark,
  compact = false,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running standalone on homescreen
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (!res) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer active:scale-95 ${
          compact ? 'p-1.5' : 'px-2.5 py-1.5'
        } ${
          isDark
            ? 'bg-[#14151b] border-[#252735] text-zinc-300 hover:text-white hover:border-lime-500/50 hover:bg-[#1a1b24]'
            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:border-zinc-300 hover:bg-zinc-100'
        }`}
        title="Pasang aplikasi di layar utama HP (PWA)"
        aria-label="Pasang Aplikasi"
      >
        <Download className="w-3.5 h-3.5 text-lime-400 shrink-0" />
        {!compact && <span>Pasang App</span>}
      </button>

      <PWAInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isDark={isDark}
      />
    </>
  );
};
