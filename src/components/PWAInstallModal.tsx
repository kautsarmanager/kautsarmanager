import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isDark,
}) => {
  const { isInstallable, install, isIOS } = usePWAInstall();
  const [platform, setPlatform] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (res) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 sm:p-6 transition-all ${
          isDark
            ? 'bg-[#0E0E10] border-[#26272B] text-zinc-100 shadow-black/80'
            : 'bg-white border-zinc-200 text-zinc-900 shadow-xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-600/15 text-lime-400 flex items-center justify-center border border-lime-500/20">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Pasang Aplikasi di HP</h3>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Jadikan aplikasi layar penuh tanpa browser
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-[#1A1B1E]' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Direct One-Click Install if supported */}
        {isInstallable && (
          <div className="mt-4 p-3.5 rounded-xl border border-lime-500/30 bg-lime-500/10 flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-semibold text-lime-300">Browser Siap Pasang:</span>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Dapat dipasang langsung dalam 1 klik ke ponsel Anda.
              </p>
            </div>
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-lime-600 hover:bg-lime-500 text-white shadow-xs shrink-0 cursor-pointer active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pasang Sekarang</span>
            </button>
          </div>
        )}

        {/* Platform Selector Tabs */}
        <div className="flex items-center gap-1 mt-4 p-1 rounded-xl border border-inherit text-xs font-medium">
          <button
            onClick={() => setPlatform('android')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
              platform === 'android'
                ? isDark
                  ? 'bg-[#1A1B1E] text-white shadow-xs'
                  : 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Android (Chrome)
          </button>
          <button
            onClick={() => setPlatform('ios')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
              platform === 'ios'
                ? isDark
                  ? 'bg-[#1A1B1E] text-white shadow-xs'
                  : 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            iPhone / iPad (Safari)
          </button>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="mt-4 space-y-2.5 text-xs">
          {platform === 'android' ? (
            <>
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  isDark ? 'bg-[#1A1B1E] border-[#26272B]' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-lime-500/20 text-lime-400 font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium text-zinc-200">Buka menu browser Chrome</p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Ketuk ikon titik tiga (⋮) di pojok kanan atas layar browser Anda.
                  </p>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  isDark ? 'bg-[#1A1B1E] border-[#26272B]' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-lime-500/20 text-lime-400 font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium text-zinc-200">
                    Pilih "Tambahkan ke Layar Utama" / "Instal Aplikasi"
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Cari opsi bertuliskan <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install app"</strong>.
                  </p>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  isDark ? 'bg-[#1A1B1E] border-[#26272B]' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-lime-500/20 text-lime-400 font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium text-zinc-200">Konfirmasi Pemasangan</p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Tekan <strong>"Instal"</strong>. Ikon Manager akan langsung tersedia di layar depan HP Anda dan bisa diklik layaknya aplikasi dari Play Store!
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  isDark ? 'bg-[#1A1B1E] border-[#26272B]' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-lime-500/20 text-lime-400 font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium text-zinc-200">Buka menu Bagikan (Share)</p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Pada browser Safari di iPhone/iPad, ketuk tombol <strong>Bagikan (ikon kotak dengan panah atas 📤)</strong> di bar bagian bawah.
                  </p>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  isDark ? 'bg-[#1A1B1E] border-[#26272B]' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-lime-500/20 text-lime-400 font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium text-zinc-200">
                    Pilih "Tambahkan ke Layar Utama"
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Gulir daftar menu ke bawah lalu pilih opsi <strong>"Tambah ke Layar Utama (Add to Home Screen ➕)"</strong>.
                  </p>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  isDark ? 'bg-[#1A1B1E] border-[#26272B]' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-lime-500/20 text-lime-400 font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium text-zinc-200">Tekan "Tambah" di Pojok Kanan Atas</p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Tekan <strong>"Tambah" (Add)</strong>. Aplikasi akan muncul sebagai aplikasi mandiri di homescreen tanpa URL bar browser!
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Benefits Footnote */}
        <div
          className={`mt-4 p-3 rounded-xl border text-[11px] flex items-center gap-2.5 ${
            isDark ? 'bg-[#1A1B1E] border-[#26272B] text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Bekerja offline, loading instan dengan cache lokal, dan notifikasi deadline otomatis aktif.
          </span>
        </div>

        {/* Close Button */}
        <div className="mt-4 pt-3 border-t border-inherit flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-lg bg-lime-600 hover:bg-lime-500 text-white cursor-pointer active:scale-98 transition-all"
          >
            Mengerti & Siap Pasang
          </button>
        </div>
      </div>
    </div>
  );
};
