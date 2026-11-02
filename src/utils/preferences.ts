export interface UserPreferences {
  currency: string;
  timezone: string; // sudah di-resolve ke zona IANA yang valid (mis. "Asia/Jakarta")
}

/** Nilai khusus: ikuti zona waktu perangkat. */
export const AUTO_TIMEZONE = 'auto';
const FALLBACK_TIMEZONE = 'Asia/Jakarta';
const DEFAULT_CURRENCY = 'IDR';

export const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: AUTO_TIMEZONE, label: 'Otomatis (ikuti zona waktu perangkat)' },
  { value: 'Asia/Jakarta', label: 'WIB — Jakarta (UTC+7)' },
  { value: 'Asia/Makassar', label: 'WITA — Makassar (UTC+8)' },
  { value: 'Asia/Jayapura', label: 'WIT — Jayapura (UTC+9)' },
  { value: 'Asia/Singapore', label: 'Singapura (UTC+8)' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (UTC+8)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (UTC+7)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Seoul', label: 'Seoul (UTC+9)' },
  { value: 'Asia/Riyadh', label: 'Riyadh (UTC+3)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris / Eropa Tengah' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'America/Los_Angeles', label: 'Los Angeles' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'UTC', label: 'UTC' },
];

const CURRENCY_LOCALES: Record<string, string> = {
  IDR: 'id-ID', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP', CNY: 'zh-CN',
  SGD: 'en-SG', MYR: 'ms-MY', AUD: 'en-AU', CAD: 'en-CA', INR: 'en-IN', KRW: 'ko-KR',
  SAR: 'ar-SA', THB: 'th-TH', CHF: 'de-CH',
};

export const CURRENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'IDR', label: 'Rupiah (IDR)' }, { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' }, { value: 'GBP', label: 'Pound Sterling (GBP)' },
  { value: 'JPY', label: 'Yen Jepang (JPY)' }, { value: 'CNY', label: 'Yuan China (CNY)' },
  { value: 'SGD', label: 'Dolar Singapura (SGD)' }, { value: 'MYR', label: 'Ringgit Malaysia (MYR)' },
  { value: 'AUD', label: 'Dolar Australia (AUD)' }, { value: 'CAD', label: 'Dolar Kanada (CAD)' },
  { value: 'INR', label: 'Rupee India (INR)' }, { value: 'KRW', label: 'Won Korea (KRW)' },
  { value: 'SAR', label: 'Riyal Saudi (SAR)' }, { value: 'THB', label: 'Baht Thailand (THB)' },
  { value: 'CHF', label: 'Franc Swiss (CHF)' },
];

export function getDeviceTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE; }
  catch { return FALLBACK_TIMEZONE; }
}

/** Membersihkan nilai lama seperti "Asia/Jakarta (WIB)" menjadi "Asia/Jakarta". */
export function normalizeTimezone(raw: unknown): string {
  const value = String(raw ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (!value) return AUTO_TIMEZONE;
  return value.toLowerCase() === AUTO_TIMEZONE ? AUTO_TIMEZONE : value;
}

function isValidTimezone(timezone: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); return true; } catch { return false; }
}

/** Mengubah pengaturan profil (termasuk "auto") menjadi zona IANA yang pasti valid. */
export function resolveTimezone(raw: unknown): string {
  const normalized = normalizeTimezone(raw);
  const candidate = normalized === AUTO_TIMEZONE ? getDeviceTimezone() : normalized;
  return isValidTimezone(candidate) ? candidate : (isValidTimezone(getDeviceTimezone()) ? getDeviceTimezone() : FALLBACK_TIMEZONE);
}

/** Selisih zona waktu terhadap UTC (menit) pada saat tertentu. */
export function getTimezoneOffsetMinutes(timezone: string, at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** Apakah zona waktu akun berbeda dengan zona waktu perangkat? (penyebab klasik "tanggal telat beberapa jam") */
export function getTimezoneMismatch(): { mismatch: boolean; profileTimezone: string; deviceTimezone: string } {
  const prefs = getUserPreferences();
  const deviceTimezone = resolveTimezone(AUTO_TIMEZONE);
  let mismatch = false;
  try { mismatch = getTimezoneOffsetMinutes(prefs.timezone) !== getTimezoneOffsetMinutes(deviceTimezone); } catch { mismatch = false; }
  return { mismatch, profileTimezone: prefs.timezone, deviceTimezone };
}

export function getRawProfileTimezone(): string {
  if (typeof localStorage === 'undefined') return AUTO_TIMEZONE;
  try {
    const cachedUser = JSON.parse(localStorage.getItem('pms_auth_user_cache') || 'null');
    const profile = JSON.parse(localStorage.getItem(cachedUser?.id ? `pms_profile:${cachedUser.id}` : 'pms_profile') || 'null');
    return normalizeTimezone(profile?.timezone);
  } catch { return AUTO_TIMEZONE; }
}

export function getUserPreferences(): UserPreferences {
  if (typeof localStorage === 'undefined') return { currency: DEFAULT_CURRENCY, timezone: resolveTimezone(AUTO_TIMEZONE) };
  try {
    const cachedUser = JSON.parse(localStorage.getItem('pms_auth_user_cache') || 'null');
    const profileKey = cachedUser?.id ? `pms_profile:${cachedUser.id}` : 'pms_profile';
    const profile = JSON.parse(localStorage.getItem(profileKey) || 'null');
    return { currency: profile?.currency || DEFAULT_CURRENCY, timezone: resolveTimezone(profile?.timezone) };
  } catch {
    return { currency: DEFAULT_CURRENCY, timezone: resolveTimezone(AUTO_TIMEZONE) };
  }
}

export function formatCurrency(value: number): string {
  const { currency } = getUserPreferences();
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[currency] || 'en-US', {
      style: 'currency', currency, maximumFractionDigits: ['IDR', 'JPY', 'KRW'].includes(currency) ? 0 : 2,
    }).format(Number.isFinite(value) ? value : 0);
  } catch {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }
}

export function formatDateInUserTimezone(value: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: getUserPreferences().timezone }).format(date);
}
