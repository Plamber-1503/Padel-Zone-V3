import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import AppLayout from '@/components/layout/AppLayout';

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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
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
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function ClubOwnerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  const isClubOwner = user?.role === 'court_owner' || user?.role === 'admin';
  if (!isClubOwner) return <Navigate to="/" replace />;
  return children;
}

function StaffRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  const isStaff = user?.role === 'moderator' || user?.role === 'admin';
  if (!isStaff) return <Navigate to="/" replace />;
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

          {/* Panel privado — sin link visible en el sitio, se accede tipeando la URL */}
          <Route
            path="/panel-padelzone"
            element={<ProtectedRoute><StaffRoute><BackofficePage /></StaffRoute></ProtectedRoute>}
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
