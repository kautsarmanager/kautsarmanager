export interface UserPreferences {
  currency: string;
  timezone: string;
}

const DEFAULT_PREFERENCES: UserPreferences = { currency: 'IDR', timezone: 'Asia/Jakarta' };

export function getUserPreferences(): UserPreferences {
  if (typeof localStorage === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const cachedUser = JSON.parse(localStorage.getItem('pms_auth_user_cache') || 'null');
    const profileKey = cachedUser?.id ? `pms_profile:${cachedUser.id}` : 'pms_profile';
    const profile = JSON.parse(localStorage.getItem(profileKey) || 'null');
    const rawTimezone = String(profile?.timezone || DEFAULT_PREFERENCES.timezone);
    const timezone = rawTimezone.replace(/\s*\([^)]*\)\s*$/, '');
    try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); }
    catch { return { currency: profile?.currency || 'IDR', timezone: DEFAULT_PREFERENCES.timezone }; }
    return { currency: profile?.currency || 'IDR', timezone };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

const CURRENCY_LOCALES: Record<string, string> = {
  IDR: 'id-ID', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP', CNY: 'zh-CN',
  SGD: 'en-SG', MYR: 'ms-MY', AUD: 'en-AU', CAD: 'en-CA', INR: 'en-IN', KRW: 'ko-KR',
  SAR: 'ar-SA', THB: 'th-TH', CHF: 'de-CH',
};

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
