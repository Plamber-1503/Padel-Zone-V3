import React, { createContext, useContext, useState, useEffect } from 'react';
import { padelService } from '@/api/padelService';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let subscription = null;

    async function initAuth() {
      try {
        if (isSupabaseConfigured && supabase) {
          // Intercepción previa de #access_token=... antes de que HashRouter sobrescriba la URL
          const rawHash = window.location.hash || '';
          if (rawHash.includes('access_token=')) {
            const hashString = rawHash.substring(rawHash.indexOf('access_token='));
            const hashParams = new URLSearchParams(hashString);
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
              const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });

              if (!sessionErr && sessionData?.session) {
                window.history.replaceState(null, '', window.location.pathname + '#/');
              }
            }
          }

          const { data: { session } } = await supabase.auth.getSession();
          if (!isMounted) return;

          if (session?.user) {
            const profile = await padelService.ensureProfile(session.user);
            const currentUserObj = profile || session.user;
            setUser(currentUserObj);
            padelService.setCurrentUser(currentUserObj);
          } else {
            // Auditoría 2026-08-09: acá antes se hacía setUser(padelService.getCurrentUser()),
            // que devuelve un usuario de prueba cacheado en localStorage (o el mock por
            // defecto) cuando NO hay sesión real de Supabase. Eso dejaba "entrar" a la app
            // como un usuario de mentira sin haberse autenticado nunca — sin sesión real,
            // no hay usuario, punto.
            setUser(null);
            localStorage.removeItem('pz3_current_user');
          }

          // Escuchar cambios de sesión en vivo
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              const profile = await padelService.ensureProfile(session.user);
              const currentUserObj = profile || session.user;
              setUser(currentUserObj);
              padelService.setCurrentUser(currentUserObj);
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              localStorage.removeItem('pz3_current_user');
            }
          });
          subscription = authListener?.subscription;
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Error al inicializar sesión:', e);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // Auditoría 2026-08-09: antes este cleanup vivía dentro de initAuth (una
    // función async), así que useEffect nunca lo recibía y el listener de
    // Supabase Auth quedaba suscripto para siempre en cada remount.
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const profile = (await padelService.getUserById(data.user.id)) || data.user;
      setUser(profile);
      return profile;
    }

    const loggedUser = await padelService.login(email, password);
    setUser(loggedUser);
    return loggedUser;
  };

  const signup = async (email, password, fullName) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      if (error) throw new Error(error.message);
      if (data?.user) {
        const profile = (await padelService.getUserById(data.user.id)) || data.user;
        setUser(profile);
        return profile;
      }
    }

    const newUser = {
      id: `u-${Date.now()}`,
      email,
      full_name: fullName,
      role: 'player',
      level: '4ta Categoría (Intermedio)',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'
    };
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('pz3_current_user');
  };

  const toggleFollow = async (targetId) => {
    const updated = await padelService.toggleFollow(targetId);
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, toggleFollow }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

