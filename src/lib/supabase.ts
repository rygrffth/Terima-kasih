import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL atau Anon Key belum dikonfigurasi di file .env. Menggunakan placeholder untuk build-time.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// Reversible token transcoding (Base64) to prevent plain-text DB/API visibility
export function encodeToken(plainToken: string | null | undefined): string | null {
  if (!plainToken) return null;
  try {
    return typeof window !== 'undefined' 
      ? btoa(plainToken) 
      : Buffer.from(plainToken).toString('base64');
  } catch (e) {
    return plainToken;
  }
}

export function decodeToken(encodedToken: string | null | undefined): string | null {
  if (!encodedToken) return null;
  try {
    return typeof window !== 'undefined'
      ? atob(encodedToken)
      : Buffer.from(encodedToken, 'base64').toString('utf-8');
  } catch (e) {
    return encodedToken;
  }
}
