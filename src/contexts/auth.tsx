import { createContext, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useAuth';
import { User } from '@/types/auth';
import axios from 'axios';

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    // Configura interceptor para adicionar token em todas as requisições
    const requestInterceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Configura interceptor para refresh token
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Se o erro for 401 e não for uma tentativa de refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Tenta fazer refresh do token
            const refresh_token = localStorage.getItem('refresh_token');
            const response = await axios.post('/api/auth/refresh', {
              refresh_token,
            });

            // Atualiza os tokens
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('refresh_token', response.data.refresh_token);

            // Refaz a requisição original com o novo token
            originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
            return axios(originalRequest);
          } catch (error) {
            // Se falhar, faz logout
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            navigate('/login');
          }
        }

        return Promise.reject(error);
      }
    );

    // Cleanup dos interceptors
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [navigate]);

  function hasPermission(permission: string): boolean {
    if (!user) return false;
    return user.permissions.some((p) => p.code === permission);
  }

  function hasRole(role: string): boolean {
    if (!user) return false;
    return user.role === role;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
