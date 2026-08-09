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

// Auditoría 2026-08-09: 'pkce' requiere que el navegador conserve un
// "code_verifier" en localStorage mientras el usuario va y vuelve de
// Google/Facebook — en el sitio publicado en GitHub Pages ese dato se
// estaba perdiendo en el camino, y el login con Google quedaba en un loop
// silencioso (vuelve con ?code=... pero el intercambio por sesión falla sin
// avisar). 'implicit' evita ese paso intermedio: el token vuelve directo en
// la URL de redirección, sin nada que conservar entre medio — por eso el
// código de AuthContext.jsx ya sabía interceptar '#access_token=' antes de
// que HashRouter reescriba la URL.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'implicit',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
