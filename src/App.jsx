import React, { useState, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { BookingModalProvider } from '@/context/BookingModalContext';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { useRequestStaffAccess } from '@/api/padelService';
import AppLayout from '@/components/layout/AppLayout';
import { Building2, ShieldCheck, Clock, Mail } from 'lucide-react';

// Code-splitting por ruta 2026-08-13: antes toda la app (todas las páginas,
// leaflet, framer-motion, etc.) viajaba en un solo bundle inicial de
// ~900KB. Con React.lazy, cada página se descarga recién cuando el usuario
// navega a ella — el bundle inicial (login + shell) queda mucho más chico.
const HomeFeed = lazy(() => import('@/pages/HomeFeed'));
const CourtsPage = lazy(() => import('@/pages/CourtsPage'));
const CourtProfilePage = lazy(() => import('@/pages/CourtProfilePage'));
const OpenMatchesPage = lazy(() => import('@/pages/OpenMatchesPage'));
const TournamentsPage = lazy(() => import('@/pages/TournamentsPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const MyBookingsPage = lazy(() => import('@/pages/MyBookingsPage'));
const ClubDashboardPage = lazy(() => import('@/pages/ClubDashboardPage'));
const BackofficePage = lazy(() => import('@/pages/BackofficePage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));

const POST_LOGIN_REDIRECT_KEY = 'pz3_post_login_redirect';

// Se muestra un instante mientras se descarga el código de la página a la
// que se navegó — mismo estilo visual que la pantalla de "Iniciando
// sesión..." de ProtectedRoute, para que no se sienta como un estado
// distinto.
function RouteLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold tracking-wide">Iniciando sesión en PadelZone...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Guardamos a dónde quería ir para volver ahí después del login con Google
    try { sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, location.pathname); } catch { /* noop */ }
    return <Navigate to="/login" replace />;
  }

  let pendingRedirect = null;
  try {
    pendingRedirect = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    if (pendingRedirect) sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  } catch { /* noop */ }

  if (pendingRedirect && pendingRedirect !== location.pathname) {
    return <Navigate to={pendingRedirect} replace />;
  }

  return children;
}

// Auditoría 2026-08-09 (incidente): una versión anterior de estas rutas
// tenía un botón de "activar rol en 1 clic" que llamaba a
// padelService.updateUserRole con el rol elegido por el propio usuario —
// cualquier jugador logueado podía auto-asignarse 'court_owner' o directamente
// 'admin' sin ninguna revisión, anulando por completo el flujo de aprobación
// de clubes. Se eliminó esa función y el botón; el único camino para obtener
// estos roles es la aprobación por un moderador/admin (clubes) o un cambio
// manual hecho por un admin real en la base de datos.
function ClubOwnerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  const isClubOwner = user?.role === 'court_owner' || user?.role === 'admin';

  if (!isClubOwner) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Panel de Dueño de Club</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Estás conectado como <strong className="text-slate-200">{user?.full_name || user?.email}</strong>, pero
            esta cuenta todavía no tiene acceso de dueño de club. Si sos dueño de un club, solicitalo desde
            "Socio Club" en el menú principal.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

function StaffRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  // Gestión de accesos 2026-08-10: acceso al panel si sos admin, o si un
  // admin te otorgó al menos un permiso puntual (staff_permissions).
  const isStaff = user?.role === 'admin' || (user?.staff_permissions?.length || 0) > 0;

  if (!isStaff) {
    return <StaffAccessDenied user={user} />;
  }

  return children;
}

// Gestión de accesos 2026-08-10: en vez de que el admin tenga que buscar a
// mano entre miles de usuarios, quien no tiene acceso puede solicitarlo acá
// mismo — queda "pendiente" hasta que un admin lo revisa y le tilda qué
// secciones del panel puede ver (pestaña "Gestión de accesos").
function StaffAccessDenied({ user }) {
  const requestAccess = useRequestStaffAccess();
  const [justRequested, setJustRequested] = useState(false);
  const alreadyRequested = justRequested || Boolean(user?.staff_access_requested_at);

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
          {alreadyRequested ? <Clock className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
        </div>
        <h2 className="text-lg font-bold text-white">Panel de Administración de PadelZone</h2>

        {alreadyRequested ? (
          <p className="text-xs text-slate-400 leading-relaxed">
            No estás autorizado para ingresar al panel de PadelZone todavía. Tu solicitud con el correo{' '}
            <strong className="text-slate-200">{user?.email}</strong> ya fue enviada — aguardá a que un
            administrador te autorice.
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-400 leading-relaxed">
              No estás autorizado para ingresar al panel de PadelZone. Enviá una solicitud con tu correo{' '}
              <strong className="text-slate-200">{user?.email}</strong> y aguardá a que un administrador te
              autorice.
            </p>
            {requestAccess.isError && (
              <p className="text-xs text-red-400">{requestAccess.error.message}</p>
            )}
            <button
              onClick={() => requestAccess.mutate(undefined, { onSuccess: () => setJustRequested(true) })}
              disabled={requestAccess.isPending}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {requestAccess.isPending ? 'Enviando...' : 'Solicitar acceso'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ConfigMissingScreen() {
  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-lg font-bold text-white">PadelZone no está configurado</h1>
        <p className="text-sm text-slate-400">
          Faltan las variables de entorno <code className="text-emerald-400">VITE_SUPABASE_URL</code> y{' '}
          <code className="text-emerald-400">VITE_SUPABASE_ANON_KEY</code>. Completalas en tu archivo{' '}
          <code className="text-emerald-400">.env</code> (ver <code className="text-emerald-400">.env.example</code>)
          antes de iniciar la app.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { isDark } = useTheme();

  if (!isSupabaseConfigured) {
    return <ConfigMissingScreen />;
  }

  return (
    <AuthProvider>
      <Toaster theme={isDark ? 'dark' : 'light'} position="top-center" richColors closeButton />
      <Router>
        <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Panel privado — sin link visible en el sitio, se accede tipeando la URL */}
          <Route
            path="/panel-padelzone"
            element={<ProtectedRoute><StaffRoute><BackofficePage /></StaffRoute></ProtectedRoute>}
          />

          {/* Portal de administración del club 2026-08-12: página propia, fuera
              del layout social (sin sidebar de Feed/Partidos ni columna de
              "Próxima Reserva" de otros clubes) — es la plataforma de negocio
              del club, no una pantalla más del feed de jugadores. */}
          <Route
            path="/club-dashboard"
            element={<ProtectedRoute><ClubOwnerRoute><ClubDashboardPage /></ClubOwnerRoute></ProtectedRoute>}
          />

          <Route element={<ProtectedRoute><BookingModalProvider><AppLayout /></BookingModalProvider></ProtectedRoute>}>
            <Route path="/" element={<HomeFeed />} />
            <Route path="/courts" element={<CourtsPage />} />
            <Route path="/court/:id" element={<CourtProfilePage />} />
            <Route path="/open-matches" element={<OpenMatchesPage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/mis-reservas" element={<MyBookingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
