import { createContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { User, AuthContextType } from '../types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  const login = async (email: string, password: string): Promise<User> => {
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

  const register = async (name: string, email: string, password: string): Promise<any> => {
    setLoading(true);
    try {
      return await authService.register(name, email, password);
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    chatService.disconnectSocket();
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
