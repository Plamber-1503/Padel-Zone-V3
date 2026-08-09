import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import AppLayout from '@/components/layout/AppLayout';
import { Building2, ShieldCheck } from 'lucide-react';

import HomeFeed from '@/pages/HomeFeed';
import CourtsPage from '@/pages/CourtsPage';
import CourtProfilePage from '@/pages/CourtProfilePage';
import OpenMatchesPage from '@/pages/OpenMatchesPage';
import TournamentsPage from '@/pages/TournamentsPage';
import ChatPage from '@/pages/ChatPage';
import ProfilePage from '@/pages/ProfilePage';
import ClubDashboardPage from '@/pages/ClubDashboardPage';
import BackofficePage from '@/pages/BackofficePage';
import LoginPage from '@/pages/LoginPage';

const POST_LOGIN_REDIRECT_KEY = 'pz3_post_login_redirect';

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

function ClubOwnerRoute({ children }) {
  const { user, loading, updateUserRole } = useAuth();
  const [upgrading, setUpgrading] = useState(false);

  if (loading) return null;
  const isClubOwner = user?.role === 'court_owner' || user?.role === 'moderator' || user?.role === 'admin';

  if (!isClubOwner) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Panel de Dueño de Club</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Estás conectado como <strong className="text-slate-200">{user?.full_name || user?.email}</strong>.<br />
            Para gestionar tus canchas y reservas, activá tu rol de Dueño de Club en 1 clic.
          </p>
          <button
            onClick={async () => {
              setUpgrading(true);
              try {
                await updateUserRole('court_owner');
              } catch (e) {
                alert(`Error al activar rol: ${e.message}`);
              } finally {
                setUpgrading(false);
              }
            }}
            disabled={upgrading}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {upgrading ? 'Activando rol...' : 'Activar Rol de Dueño de Club'}
          </button>
        </div>
      </div>
    );
  }

  return children;
}

function StaffRoute({ children }) {
  const { user, loading, updateUserRole } = useAuth();
  const [upgrading, setUpgrading] = useState(false);

  if (loading) return null;
  const isStaff = user?.role === 'court_owner' || user?.role === 'moderator' || user?.role === 'admin';

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Panel de Administración de PadelZone</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Estás conectado como <strong className="text-slate-200">{user?.full_name || user?.email}</strong>.<br />
            Para acceder al panel de gestión de clubes y usuarios, activá tus credenciales de Dueño / Moderador.
          </p>
          <button
            onClick={async () => {
              setUpgrading(true);
              try {
                await updateUserRole('court_owner');
              } catch (e) {
                alert(`Error al activar credenciales: ${e.message}`);
              } finally {
                setUpgrading(false);
              }
            }}
            disabled={upgrading}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {upgrading ? 'Activando credenciales...' : 'Acceder al Panel como Dueño / Moderador'}
          </button>
        </div>
      </div>
    );
  }

  return children;
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
  if (!isSupabaseConfigured) {
    return <ConfigMissingScreen />;
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas directas de panel de gestión de dueño y administración */}
          <Route
            path="/panel-padelzone"
            element={<ProtectedRoute><StaffRoute><BackofficePage /></StaffRoute></ProtectedRoute>}
          />
          <Route
            path="/panel-dueno"
            element={<ProtectedRoute><ClubOwnerRoute><ClubDashboardPage /></ClubOwnerRoute></ProtectedRoute>}
          />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<HomeFeed />} />
            <Route path="/courts" element={<CourtsPage />} />
            <Route path="/court/:id" element={<CourtProfilePage />} />
            <Route path="/open-matches" element={<OpenMatchesPage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/club-dashboard" element={<ClubOwnerRoute><ClubDashboardPage /></ClubOwnerRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
