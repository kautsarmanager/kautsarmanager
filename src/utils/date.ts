import { getUserPreferences } from './preferences';

export function getLocalDateString(date = new Date()): string {
  const timezone = getUserPreferences().timezone;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value || '00';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
