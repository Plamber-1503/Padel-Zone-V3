import { createClient } from '@supabase/supabase-js';

// Variables de entorno de Vite — sin fallback hardcodeado (auditoría 2026-08-09:
// antes había credenciales reales de producción escritas acá mismo, expuestas
// en el repositorio público). Completá VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY
// en tu .env local, y como secrets del pipeline de deploy en CI.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    '[PadelZone] Faltan las variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Copiá .env.example a .env y completá los valores de tu proyecto de Supabase antes de correr la app.'
  );
}

// Inicialización del cliente Supabase con soporte PKCE para compatibilidad con HashRouter en GitHub Pages
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
