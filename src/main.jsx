import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { ThemeProvider } from '@/context/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import './index.css'
import App from './App.jsx'

// Auditoría 2026-08-10: al volver de un login con Google/Facebook (flujo
// implícito), el token llega en el hash de la URL (#access_token=...).
// HashRouter, al montar, lee ese mismo hash para decidir la ruta actual —
// como "access_token=..." no matchea ninguna ruta definida, cae en el
// catch-all y lo reemplaza por '#/' ANTES de que el manejo async de
// Supabase (detectSessionInUrl) llegue a leerlo, perdiendo el token en el
// camino (a veces con error visible, a veces en silencio, según el timing
// exacto de la carrera). Por eso esto corre acá — antes de que React (y
// con él, HashRouter) siquiera monte — y no adentro de un componente.
if (isSupabaseConfigured && supabase) {
  const rawHash = window.location.hash || '';
  if (rawHash.includes('access_token=')) {
    const hashParams = new URLSearchParams(rawHash.substring(rawHash.indexOf('access_token=')));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/');
    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .catch((e) => console.error('Error al restaurar sesión de Google/Facebook:', e));
    }
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

