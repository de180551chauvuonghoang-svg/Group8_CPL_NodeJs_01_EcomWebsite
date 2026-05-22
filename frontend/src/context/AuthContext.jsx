import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService.js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user token exists on application mount
  useEffect(() => {
    const fetchUser = async () => {
      const storedToken = localStorage.getItem('ecom_token');
      const storedUser = authService.getCurrentUser();

      if (storedToken && storedUser) {
        setUser(storedUser);
        try {
          // Sync with server profile to ensure it is valid
          const freshUser = await authService.getProfile();
          setUser(freshUser);
        } catch (error) {
          console.warn('Session expired or invalid, logging out automatically.');
          authService.logout();
          setUser(null);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      setUser(data.user);
      return data.user;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      return await authService.register(name, email, password);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
