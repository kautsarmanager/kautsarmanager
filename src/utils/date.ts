import { getUserPreferences } from './preferences';

/** Tanggal kalender "hari ini" (YYYY-MM-DD) menurut zona waktu pada profil. */
export function getLocalDateString(date = new Date()): string {
  const timezone = getUserPreferences().timezone;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value || '00';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Jam saat ini (HH:MM, 24 jam) menurut zona waktu pada profil. */
export function getLocalTimeString(date = new Date()): string {
  const timezone = getUserPreferences().timezone;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value || '00';
  const hour = part('hour') === '24' ? '00' : part('hour');
  return `${hour}:${part('minute')}`;
}

/** Tambah/kurang hari pada tanggal kalender YYYY-MM-DD, tanpa terpengaruh zona waktu atau DST. */
export function shiftDateString(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, (day || 1) + days, 12)).toISOString().slice(0, 10);
}
