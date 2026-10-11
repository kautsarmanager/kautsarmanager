import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

function isValidSupabaseUrl(url: string): boolean {
  if (!url) return false;
  // Ignore template / dummy placeholders
  if (url.includes('your-project-id') || url.includes('YOUR_') || url === 'undefined') {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidSupabaseKey(key: string): boolean {
  if (!key) return false;
  if (key.includes('your-anon') || key.includes('YOUR_') || key === 'undefined') {
    return false;
  }
  return key.length > 20;
}

let client: SupabaseClient | null = null;
let configured = false;

if (isValidSupabaseUrl(rawUrl) && isValidSupabaseKey(rawKey)) {
  try {
    client = createClient(rawUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    configured = true;
  } catch (error) {
    console.warn('Supabase initialization failed, falling back to local storage:', error);
    client = null;
    configured = false;
  }
}

export const isSupabaseConfigured = configured;
export const supabase = client;
