import { getLocalDateString } from '../utils/date';
import React, { useState } from 'react';
import {
  User,
  Shield,
  Database,
  Moon,
  Sun,
  Clock,
  Coins,
  RefreshCw,
  Download,
  CheckCircle2,
  Palette,
} from 'lucide-react';
import { UserProfile, UserAccount } from '../types';
import { dataService } from '../services/dataService';
import { PWAInstallButton } from './PWAInstallButton';
import { KeyRound, Smartphone, LogOut } from 'lucide-react';

interface SettingsViewProps {
  profile: UserProfile;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  currentUser,
  onLogout,
}) => {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [currency, setCurrency] = useState(profile.currency);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [theme, setTheme] = useState<'dark' | 'light'>(profile.theme || 'dark');
  const [savedMessage, setSavedMessage] = useState(false);

  const isDark = profile.theme !== 'light';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    dataService.updateProfile({
      name,
      email,
      currency,
      timezone,
      theme,
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin menghapus data lokal untuk akun ini? Pastikan data cloud sudah tersinkron dan Anda memiliki cadangan. Tindakan ini tidak dapat dibatalkan.'
      )
    ) {
      dataService.resetData();
    }
  };

  const handleExportJSON = () => {
    const backup = {
      profile: dataService.getProfile(),
      tasks: dataService.getTasks(),
      transactions: dataService.getTransactions(),
      files: dataService.getFiles(),
      wishlist: dataService.getWishlist(),
      activities: dataService.getActivities(),
      exported_at: new Date().toISOString(),
      legacy_local_data: Object.fromEntries(
        Object.keys(localStorage)
          .filter((key) => /^pms_(tasks|transactions|files|wishlist|profile|activities)(:.*)?$/.test(key))
          .map((key) => [key, localStorage.getItem(key)])
      ),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pms-backup-${getLocalDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          Pengaturan & Preferensi
        </h2>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Konfigurasi tema tampilan, profil pengguna, dan manajemen cadangan data.
        </p>
      </div>

      {savedMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4" />
          <span>Pengaturan profil dan tema berhasil disimpan!</span>
        </div>
      )}

      {/* Theme Quick Switcher Card */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#171822] border-[#272938]' : 'bg-white border-[#e5e7ef] shadow-xs'
        }`}
      >
        <div className={`flex items-center gap-2 pb-3 mb-4 border-b ${isDark ? 'border-[#242634]' : 'border-[#e8ebf2]'}`}>
          <Palette className="w-4 h-4 text-lime-400" />
          <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Mode Tampilan (Tema)
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              dataService.updateProfile({ theme: 'dark' });
            }}
            className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border font-semibold text-xs transition-all ${
              theme === 'dark'
                ? 'bg-zinc-800 text-white border-zinc-500 shadow-xs'
                : isDark
                ? 'bg-[#121319] text-zinc-400 border-[#262837] hover:text-white'
                : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-black'
            }`}
          >
            <Moon className="w-4 h-4 text-lime-400" />
            <span>Mode Gelap (Dark Grey)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('light');
              dataService.updateProfile({ theme: 'light' });
            }}
            className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border font-semibold text-xs transition-all ${
              theme === 'light'
                ? 'bg-lime-50 text-lime-900 border-lime-300 shadow-xs'
                : isDark
                ? 'bg-[#121319] text-zinc-400 border-[#262837] hover:text-white'
                : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-black'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Mode Cerah (Light Mode)</span>
          </button>
        </div>
      </div>

      {/* Profile Form */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#171822] border-[#272938]' : 'bg-white border-[#e5e7ef] shadow-xs'
        }`}
      >
        <div className={`flex items-center gap-2 pb-3 mb-4 border-b ${isDark ? 'border-[#242634]' : 'border-[#e8ebf2]'}`}>
          <User className="w-4 h-4 text-zinc-400" />
          <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Profil Pengguna
          </h3>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-hidden ${
                  isDark
                    ? 'bg-[#13141b] border-[#292c3a] text-zinc-100 focus:border-lime-400'
                    : 'bg-[#f8f9fc] border-[#e2e5ef] text-zinc-900 focus:border-lime-500'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-hidden ${
                  isDark
                    ? 'bg-[#13141b] border-[#292c3a] text-zinc-100 focus:border-lime-400'
                    : 'bg-[#f8f9fc] border-[#e2e5ef] text-zinc-900 focus:border-lime-500'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Mata Uang
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-hidden ${
                  isDark
                    ? 'bg-[#13141b] border-[#292c3a] text-zinc-100'
                    : 'bg-[#f8f9fc] border-[#e2e5ef] text-zinc-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Zona Waktu
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-hidden ${
                  isDark
                    ? 'bg-[#13141b] border-[#292c3a] text-zinc-100'
                    : 'bg-[#f8f9fc] border-[#e2e5ef] text-zinc-900'
                }`}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className={`px-4 py-2 rounded-xl font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer ${
                isDark
                  ? 'bg-zinc-100 hover:bg-white text-zinc-950'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white'
              }`}
            >
              Simpan Profil
            </button>
          </div>
        </form>
      </div>

      {/* Account, Referral & PIN Security Section */}
      <div
        className={`p-5 rounded-2xl border text-xs space-y-4 transition-all ${
          isDark ? 'bg-[#171822] border-[#272938]' : 'bg-white border-[#e5e7ef] shadow-xs'
        }`}
      >
        <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-[#242634]' : 'border-[#e8ebf2]'}`}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-lime-400" />
            <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Keamanan Akun
            </h3>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-medium cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar Akun</span>
            </button>
          )}
        </div>

        <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#13141b] border-[#222432]' : 'bg-zinc-50 border-zinc-200'}`}>
          <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Akun aktif</p>
          <p className="text-sm font-bold text-lime-400 mt-1">{currentUser?.email || profile.email || 'Belum tersedia'}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Autentikasi dan sesi dikelola oleh Supabase Auth.</p>
        </div>

        {/* PWA Mobile App Section */}
        <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isDark ? 'bg-[#13141b] border-[#222432]' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-lime-500/15 text-lime-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">Aplikasi Mobile (PWA)</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Pasang langsung ke layar utama Android atau iPhone tanpa Play Store.
              </p>
            </div>
          </div>
          <PWAInstallButton isDark={isDark} />
        </div>
      </div>

      {/* Backup & Reset Data */}
      <div
        className={`p-5 rounded-2xl border text-xs space-y-4 transition-all ${
          isDark ? 'bg-[#171822] border-[#272938]' : 'bg-white border-[#e5e7ef] shadow-xs'
        }`}
      >
        <div className={`flex items-center gap-2 pb-3 border-b ${isDark ? 'border-[#242634]' : 'border-[#e8ebf2]'}`}>
          <Shield className="w-4 h-4 text-amber-500" />
          <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Cadangan & Reset Data
          </h3>
        </div>

        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-xl border ${
            isDark
              ? 'bg-[#13141b] border-[#252837]'
              : 'bg-[#f8f9fc] border-[#e2e5ef]'
          }`}
        >
          <div>
            <p className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              Ekspor Cadangan (Backup JSON)
            </p>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Unduh salinan seluruh data offline Anda ke file JSON di komputer.
            </p>
          </div>
          <button
            onClick={handleExportJSON}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh JSON</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <div>
            <p className="font-semibold text-rose-400">Reset ke Data Demo Awal</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Mengembalikan tugas, keuangan, file, dan wishlist ke contoh data awal.
            </p>
          </div>
          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
