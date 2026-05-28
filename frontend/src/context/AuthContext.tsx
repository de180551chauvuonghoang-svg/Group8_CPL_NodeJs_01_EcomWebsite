import { createContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
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
      // Mock login to easily test UI without BE running
      if (email && password) {
        const mockUser: User = {
          id: 'mock-user-123',
          name: email.split('@')[0] || 'Tester',
          email: email,
          role: 'user'
        };
        localStorage.setItem('ecom_token', 'mock_token_123456');
        localStorage.setItem('ecom_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return mockUser;
      }
      
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
      // Mock registration to easily test UI without BE running
      if (name && email && password) {
        const mockUser: User = {
          id: 'mock-user-123',
          name: name,
          email: email,
          role: 'user'
        };
        localStorage.setItem('ecom_token', 'mock_token_123456');
        localStorage.setItem('ecom_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return { success: true, user: mockUser };
      }
      return await authService.register(name, email, password);
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
