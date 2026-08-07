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
            const currentUserObj = profile || session.user;
            setUser(currentUserObj);
            padelService.setCurrentUser(currentUserObj);
          } else {
            setUser(padelService.getCurrentUser());
          }

          // Escuchar cambios de sesión en vivo
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              const profile = await padelService.getUserById(session.user.id);
              const currentUserObj = profile || session.user;
              setUser(currentUserObj);
              padelService.setCurrentUser(currentUserObj);
            } else {
              setUser(null);
              localStorage.removeItem('pz3_current_user');
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

