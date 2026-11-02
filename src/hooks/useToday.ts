import { useEffect, useState } from 'react';
import { getLocalDateString } from '../utils/date';
import { dataService } from '../services/dataService';

/**
 * Tanggal "hari ini" (YYYY-MM-DD) menurut zona waktu profil, selalu segar.
 * Memperbaiki bug "tertulis hari ini tetapi masih kemarin": nilai tanggal yang dihitung sekali saat
 * komponen dibuka menjadi basi bila aplikasi/PWA dibiarkan terbuka melewati tengah malam.
 * Diperbarui saat: pergantian hari (cek tiap 15 dtk), tab kembali aktif/fokus, online lagi,
 * dan saat pengaturan zona waktu berubah.
 */
export function useToday(): string {
  const [today, setToday] = useState<string>(() => getLocalDateString());
  useEffect(() => {
    const update = () => setToday((previous) => { const next = getLocalDateString(); return next === previous ? previous : next; });
    update();
    const timer = window.setInterval(update, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') update(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', update);
    window.addEventListener('online', update);
    const unsubscribe = dataService.subscribe(update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', update);
      window.removeEventListener('online', update);
      unsubscribe();
    };
  }, []);
  return today;
}
