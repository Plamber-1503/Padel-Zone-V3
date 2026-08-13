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
          // El token/código/error de OAuth ya se procesa de forma síncrona en
          // main.jsx, antes de que HashRouter monte — acá solo leemos la
          // sesión resultante (setSession/exchangeCodeForSession de main.jsx
          // ya debería haber corrido, o estar corriendo; getSession() espera
          // la inicialización interna del cliente antes de resolver).
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

  // Auditoría 2026-08-13: TeamPartnerSection llamaba a padelService directo
  // sin await ni actualizar este contexto — el cambio quedaba en el caché
  // local (localStorage) pero la sesión en memoria (este `user`) seguía
  // mostrando la pareja vieja hasta un refresh completo de página, y en ese
  // refresh tampoco se veía bien porque el nombre/foto/nivel de la pareja
  // nunca se guardaban en la tabla real (solo el id) — TeamPartnerSection
  // ahora los resuelve en vivo a partir del id, así que esto ya alcanza con
  // mantener sincronizado el team_partner_id en el `user` de acá.
  const setTeamPartner = async (partnerId) => {
    const updated = await padelService.setTeamPartner(partnerId);
    setUser(updated);
    return updated;
  };

  const removeTeamPartner = async () => {
    const updated = await padelService.removeTeamPartner();
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, toggleFollow, setTeamPartner, removeTeamPartner }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

