import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.trim() !== '' && supabaseAnonKey.trim() !== '') {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (error) {
    console.warn('[Supabase] No se pudo inicializar el cliente:', error);
    supabaseInstance = null;
  }
} else {
  // En modo local o antes de configurar env vars, supabase queda en null para evitar crasheos
  console.info('[Supabase] Variables de entorno no configuradas. Operando con fallback local.');
}

export const supabase = supabaseInstance;
export const isSupabaseConfigured = Boolean(supabaseInstance);
