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
          // 1. Capturar tokens o errores devueltos por Google OAuth en la URL (hash o query params)
          const rawHash = window.location.hash || '';
          const rawSearch = window.location.search || '';

          let accessToken = null;
          let refreshToken = null;
          let code = null;
          let errorDesc = null;

          if (rawHash.includes('access_token=')) {
            const hashParams = new URLSearchParams(rawHash.substring(rawHash.indexOf('access_token=')));
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
          } else if (rawSearch.includes('access_token=')) {
            const searchParams = new URLSearchParams(rawSearch);
            accessToken = searchParams.get('access_token');
            refreshToken = searchParams.get('refresh_token');
          }

          if (rawSearch.includes('code=')) {
            const searchParams = new URLSearchParams(rawSearch);
            code = searchParams.get('code');
          } else if (rawHash.includes('code=')) {
            const hashParams = new URLSearchParams(rawHash.substring(rawHash.indexOf('code=')));
            code = hashParams.get('code');
          }

          if (rawHash.includes('error=')) {
            const hashParams = new URLSearchParams(rawHash.substring(rawHash.indexOf('error=')));
            errorDesc = hashParams.get('error_description') || hashParams.get('error');
          } else if (rawSearch.includes('error=')) {
            const searchParams = new URLSearchParams(rawSearch);
            errorDesc = searchParams.get('error_description') || searchParams.get('error');
          }

          if (errorDesc) {
            console.error('[PadelZone Auth] Error en redirección OAuth:', errorDesc);
            sessionStorage.setItem('pz3_auth_error', decodeURIComponent(errorDesc));
            window.history.replaceState(null, '', window.location.pathname + '#/login');
          } else if (accessToken && refreshToken) {
            console.log('[PadelZone Auth] Estableciendo sesión OAuth desde tokens...');
            const { error: setSessionErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (setSessionErr) {
              console.error('[PadelZone Auth] Error en setSession:', setSessionErr.message);
              sessionStorage.setItem('pz3_auth_error', setSessionErr.message);
            }
            window.history.replaceState(null, '', window.location.pathname + '#/');
          } else if (code) {
            console.log('[PadelZone Auth] Intercambiando código OAuth por sesión...');
            const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeErr) {
              console.error('[PadelZone Auth] Error en exchangeCodeForSession:', exchangeErr.message);
              sessionStorage.setItem('pz3_auth_error', exchangeErr.message);
            }
            window.history.replaceState(null, '', window.location.pathname + '#/');
          }

          // 2. Leer la sesión activa autenticada
          const { data: { session } } = await supabase.auth.getSession();
          if (!isMounted) return;

          if (session?.user) {
            let currentUserObj = session.user;
            try {
              const profile = await padelService.ensureProfile(session.user);
              if (profile) currentUserObj = profile;
            } catch (err) {
              console.warn('[PadelZone Auth] Error al asegurar perfil inicial:', err);
            }
            setUser(currentUserObj);
            padelService.setCurrentUser(currentUserObj);
          } else {
            setUser(null);
            localStorage.removeItem('pz3_current_user');
          }

          // 3. Escuchar cambios de sesión en vivo
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;
            if (session?.user) {
              let currentUserObj = session.user;
              try {
                const profile = await padelService.ensureProfile(session.user);
                if (profile) currentUserObj = profile;
              } catch (err) {
                console.warn('[PadelZone Auth] Error al asegurar perfil en evento:', err);
              }
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

