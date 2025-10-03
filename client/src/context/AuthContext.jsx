import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { socket } from '../utils/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uiLanguage, setUiLanguage] = useState(localStorage.getItem('uiLanguage') || 'en');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        api.setToken(token);
        const userData = await api.getCurrentUser();
        setUser(userData);
        socket.connect(userData.id);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const data = await api.login(credentials);
    setUser(data.user);
    socket.connect(data.user.id);
    return data;
  };

  const register = async (userData) => {
    const data = await api.register(userData);
    setUser(data.user);
    socket.connect(data.user.id);
    return data;
  };

  const logout = async () => {
    await api.logout();
    socket.disconnect();
    setUser(null);
  };

  const changeUILanguage = (language) => {
    setUiLanguage(language);
    localStorage.setItem('uiLanguage', language);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, uiLanguage, changeUILanguage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
