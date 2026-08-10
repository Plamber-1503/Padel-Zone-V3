import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { ThemeProvider } from '@/context/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import './index.css'
import App from './App.jsx'

// Auditoría 2026-08-10: al volver de un login con Google/Facebook, el token
// (o un código a intercambiar, o un error) llega en el hash o el query
// string de la URL. HashRouter, al montar, lee ese mismo hash para decidir
// la ruta actual — como no matchea ninguna ruta definida, lo pisa con '#/'
// en su redirect del catch-all ANTES de que cualquier manejo async (nuestro
// o el detectSessionInUrl de Supabase) llegue a leerlo. Es una carrera que
// a veces se gana y a veces no (por eso funcionaba en algunos dispositivos
// y en otros no). La única forma robusta de evitarla es leer y consumir
// esto ACÁ, de forma síncrona, antes de que React (y con él, HashRouter)
// siquiera exista.
if (isSupabaseConfigured && supabase) {
  const rawHash = window.location.hash || '';
  const rawSearch = window.location.search || '';

  let accessToken = null;
  let refreshToken = null;
  let code = null;
  let errorDesc = null;

  if (rawHash.includes('access_token=')) {
    const p = new URLSearchParams(rawHash.substring(rawHash.indexOf('access_token=')));
    accessToken = p.get('access_token');
    refreshToken = p.get('refresh_token');
  } else if (rawSearch.includes('access_token=')) {
    const p = new URLSearchParams(rawSearch);
    accessToken = p.get('access_token');
    refreshToken = p.get('refresh_token');
  }

  if (rawSearch.includes('code=')) {
    code = new URLSearchParams(rawSearch).get('code');
  } else if (rawHash.includes('code=')) {
    code = new URLSearchParams(rawHash.substring(rawHash.indexOf('code='))).get('code');
  }

  if (rawHash.includes('error=')) {
    const p = new URLSearchParams(rawHash.substring(rawHash.indexOf('error=')));
    errorDesc = p.get('error_description') || p.get('error');
  } else if (rawSearch.includes('error=')) {
    const p = new URLSearchParams(rawSearch);
    errorDesc = p.get('error_description') || p.get('error');
  }

  if (errorDesc) {
    try { sessionStorage.setItem('pz3_auth_error', decodeURIComponent(errorDesc)); } catch { /* noop */ }
    window.history.replaceState(null, '', window.location.pathname + '#/login');
  } else if (accessToken && refreshToken) {
    window.history.replaceState(null, '', window.location.pathname + '#/');
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .catch((e) => { try { sessionStorage.setItem('pz3_auth_error', e.message); } catch { /* noop */ } });
  } else if (code) {
    window.history.replaceState(null, '', window.location.pathname + '#/');
    supabase.auth.exchangeCodeForSession(code)
      .catch((e) => { try { sessionStorage.setItem('pz3_auth_error', e.message); } catch { /* noop */ } });
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)

