import { createContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { socketService } from '../services/socketService';
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
        // Skip server sync if it is the mock test token
        if (storedToken === 'mock_token_123456') {
          setLoading(false);
          return;
        }
        try {
          // Sync with server profile to ensure it is valid
          const freshUser = await authService.getProfile();
          setUser(freshUser);
        } catch {
          console.warn('Session expired or invalid, logging out automatically.');
          socketService.disconnect();
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
      // For the backend, email field should be used as name/username
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

  const loginWithGoogle = async (idToken: string): Promise<User> => {
    setLoading(true);
    try {
      const data = await authService.loginWithGoogle(idToken);
      setUser(data.user);
      return data.user;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone: string,
  ): Promise<any> => {
    setLoading(true);
    try {
      return await authService.register(name, email, password, phone);
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    socketService.disconnect();
    authService.logout();
    setUser(null);
  };

  const updateUser = (updatedUser: User): void => {
    localStorage.setItem('ecom_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const refreshUser = async (): Promise<User> => {
    const freshUser = await authService.getProfile();
    setUser(freshUser);
    return freshUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
