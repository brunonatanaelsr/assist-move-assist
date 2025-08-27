import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { api } from '../lib/api';
import { logger } from '../lib/logger';

interface User {
  id: string;
  email: string;
  nome: string;
  role: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
  isAuthenticated: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStoredData() {
      try {
        // Verifica se usuário está autenticado
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        // Se não estiver autenticado, tenta refresh
        try {
          await refreshToken();
        } catch (refreshError) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    }

    loadStoredData();
  }, []);

  // Configurar interceptor para refresh token
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          try {
            await refreshToken();
            // Repetir requisição original
            return api(error.config);
          } catch (refreshError) {
            await signOut();
            throw error;
          }
        }
        throw error;
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const { user } = response.data;
      setUser(user);

      // Token é gerenciado via httpOnly cookie
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await api.post('/auth/logout');
      setUser(null);
    } catch (error) {
      logger.error('Logout error:', error);
      // Limpa usuário mesmo em caso de erro
      setUser(null);
      throw error;
    }
  }

  async function refreshToken() {
    try {
      const response = await api.post('/auth/refresh');
      const { user } = response.data;
      setUser(user);
    } catch (error) {
      logger.error('Token refresh error:', error);
      setUser(null);
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        refreshToken,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
