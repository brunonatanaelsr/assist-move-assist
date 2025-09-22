import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService } from '@/services/apiService';

const IS_DEV = (import.meta as any)?.env?.DEV === true || (import.meta as any)?.env?.MODE === 'development';

interface User {
  id: number;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
}

interface Profile extends User {
  telefone?: string;
  nome_completo?: string;
  cargo?: string;
  departamento?: string;
  bio?: string;
  foto_url?: string;
  endereco?: string;
  data_nascimento?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const PostgreSQLAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Verificar se há token antes de fazer a requisição
        const token = localStorage.getItem('token');
        if (!token) {
          if (IS_DEV) console.log('Nenhum token encontrado, usuário não autenticado');
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (IS_DEV) console.log('Token encontrado, carregando usuário...');
        const response = await apiService.getCurrentUser();
        if (IS_DEV) console.log('Response getCurrentUser:', response);
        
        if (response && response.success && response.data && response.data.user) {
          const userData = response.data.user;
          const userProfile: Profile = {
            id: userData.id,
            nome: userData.nome,
            email: userData.email,
            papel: userData.papel,
            ativo: userData.ativo
          };
          
          setUser(userData);
          setProfile(userProfile);
        } else {
          if (IS_DEV) console.log('Response inválido ou usuário não encontrado');
          localStorage.removeItem('token');
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        if (IS_DEV) console.error('Error loading user:', error);
        localStorage.removeItem('token');
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      if (IS_DEV) console.log('Hook signIn chamado:', { email, password: '***' });
      
      const response = await apiService.login(email, password);
      if (IS_DEV) console.log('Response do apiService:', response);

      if (response && response.data && response.data.user) {
        const userData = response.data.user;
        setUser(userData);

        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }

        const userProfile: Profile = {
          id: userData.id,
          nome: userData.nome,
          email: userData.email,
          papel: userData.papel,
          ativo: userData.ativo
        };
        setProfile(userProfile);

        return { error: null };
      } else {
        return { error: { message: response.message || 'Erro ao fazer login' } };
      }
    } catch (error: any) {
      if (IS_DEV) console.error('Login error:', error);
      return { error: { message: error.message || 'Erro de conexão' } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('token');
      setUser(null);
      setProfile(null);
      return { error: null };
    } catch (error: any) {
      if (IS_DEV) console.error('Logout error:', error);
      return { error: { message: 'Erro ao fazer logout' } };
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
    isAdmin: user?.papel === 'admin' || user?.papel === 'super_admin' || user?.papel === 'superadmin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export { PostgreSQLAuthProvider as AuthProvider };
export default PostgreSQLAuthProvider;
