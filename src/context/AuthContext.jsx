import React, { createContext, useContext, useState, useEffect } from 'react';
import { padelService } from '@/api/padelService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const currentUser = padelService.getCurrentUser();
      setUser(currentUser);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (email, password) => {
    const loggedUser = padelService.login(email, password);
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pz2_current_user');
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
