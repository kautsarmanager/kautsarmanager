import { getLocalDateString } from '../utils/date';
import React, { useEffect, useState } from 'react';
import {
  User,
  Shield,
  RefreshCw,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile, UserAccount } from '../types';
import { dataService } from '../services/dataService';
import { PWAInstallButton } from './PWAInstallButton';
import { KeyRound, Smartphone, LogOut, LockKeyhole } from 'lucide-react';
import { authService } from '../services/authService';

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
  const [name, setName] = useState(currentUser?.username || profile.name);
  const [savedMessage, setSavedMessage] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinConfigured, setPinConfigured] = useState(authService.hasPin());
  const [pinMessage, setPinMessage] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    const refreshPinStatus = () => setPinConfigured(authService.hasPin());
    const unsubscribe = authService.subscribe(refreshPinStatus);
    refreshPinStatus();
    return unsubscribe;
  }, []);

  useEffect(() => {
    setName(currentUser?.username || profile.name);
  }, [currentUser?.username, profile.name]);

  const isDark = profile.theme !== 'light';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = name.trim();
    if (username.length < 3) {
      setSavedMessage(false);
      window.alert('Username minimal 3 karakter.');
      return;
    }
    if (currentUser && username !== currentUser.username) {
      const result = await authService.updateUsername(username);
      if (!result.success) {
        window.alert(result.error || 'Username akun gagal diperbarui.');
        return;
      }
    }
    dataService.updateProfile({ name: username });
    setName(username);
    setSavedMessage(true);
    window.setTimeout(() => setSavedMessage(false), 3000);
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
          Atur username akun, keamanan, dan cadangan data.
        </p>
      </div>

      {savedMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4" />
          <span>Username berhasil disimpan dan disinkronkan dengan akun.</span>
        </div>
      )}

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
                Username
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={3}
                required
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
                value={currentUser?.email || profile.email}
                readOnly
                aria-readonly="true"
                className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-hidden ${
                  isDark
                    ? 'bg-[#13141b] border-[#292c3a] text-zinc-100 focus:border-lime-400'
                    : 'bg-[#f8f9fc] border-[#e2e5ef] text-zinc-900 focus:border-lime-500'
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
              Simpan Username
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

        <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#13141b] border-[#222432]' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <LockKeyhole className="w-4 h-4 text-lime-400" />
            <p className="font-semibold">PIN kunci aplikasi</p>
            <span className={`ml-auto text-[10px] font-semibold ${pinConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>{pinConfigured ? 'Aktif' : 'Belum diatur'}</span>
          </div>
          <p className="text-[11px] text-zinc-400 mb-3">Gunakan PIN 6 digit untuk membuka aplikasi tanpa mengetik password akun setiap kali aplikasi dikunci. PIN disimpan sebagai hash di akun dan disinkronkan ke perangkat lain.</p>
          <form onSubmit={async (e) => {
            e.preventDefault(); setPinMessage(''); setPinError(false);
            if (!/^\d{6}$/.test(pin)) { setPinMessage('PIN harus terdiri dari 6 angka.'); setPinError(true); return; }
            if (pin !== confirmPin) { setPinMessage('Konfirmasi PIN tidak sama.'); setPinError(true); return; }
            const result = await authService.setPin(pin);
            if (!result.success) { setPinMessage(result.error || 'Gagal menyimpan PIN.'); setPinError(true); return; }
            setPinConfigured(true); setPin(''); setConfirmPin(''); setPinMessage('PIN berhasil disimpan ke akun dan disinkronkan.');
          }} className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input aria-label="PIN baru" inputMode="numeric" autoComplete="new-password" maxLength={6} pattern="[0-9]{6}" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="PIN baru (6 digit)" className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${isDark ? 'bg-[#0d0e14] border-[#303241] text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'}`} />
              <input aria-label="Konfirmasi PIN" inputMode="numeric" autoComplete="new-password" maxLength={6} pattern="[0-9]{6}" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Ulangi PIN" className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${isDark ? 'bg-[#0d0e14] border-[#303241] text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'}`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="px-3 py-2 rounded-lg bg-lime-500 hover:bg-lime-400 text-zinc-950 font-semibold text-xs">{pinConfigured ? 'Ganti PIN' : 'Atur PIN'}</button>
              {pinConfigured && <button type="button" onClick={async () => { if (!window.confirm('Hapus PIN kunci aplikasi dari perangkat ini?')) return; await authService.removePin(); setPinConfigured(false); setPinMessage('PIN berhasil dihapus dari akun dan semua perangkat.'); setPinError(false); }} className="px-3 py-2 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs">Hapus PIN</button>}
            </div>
            {pinMessage && <p className={`text-[11px] ${pinError ? 'text-rose-400' : 'text-emerald-400'}`}>{pinMessage}</p>}
          </form>
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
