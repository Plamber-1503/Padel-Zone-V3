import React, { createContext, useContext, useState, useEffect } from 'react';
import { padelService } from '@/api/padelService';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await padelService.getUserById(session.user.id);
            setUser(profile || session.user);
          } else {
            setUser(padelService.getCurrentUser());
          }

          // Escuchar cambios de sesión en vivo
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              const profile = await padelService.getUserById(session.user.id);
              setUser(profile || session.user);
            } else {
              setUser(null);
            }
          });

          return () => authListener?.subscription?.unsubscribe();
        } else {
          setUser(padelService.getCurrentUser());
        }
      } catch (e) {
        console.error('Error al inicializar sesión:', e);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const profile = await padelService.getUserById(data.user.id);
      setUser(profile);
      return profile;
    }

    const loggedUser = padelService.login(email, password);
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('pz3_current_user');
  };

  const toggleFollow = (targetId) => {
    const updated = padelService.toggleFollow(targetId);
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, toggleFollow }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

