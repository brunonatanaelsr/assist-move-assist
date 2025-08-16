import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService } from '@/services/apiService';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  nome_completo?: string;
  tipo_usuario?: string;
}

interface Profile {
  id: string;
  user_id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  foto_url?: string;
  bio?: string;
  endereco?: string;
  data_nascimento?: string;
  tipo_usuario: 'super_admin' | 'admin' | 'coordenador' | 'profissional' | 'assistente';
  ativo: boolean;
  data_criacao: string;
  ultimo_acesso?: string;
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
          console.log('Nenhum token encontrado, usuário não autenticado');
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        console.log('Token encontrado, carregando usuário...');
        const response = await apiService.getCurrentUser();
        console.log('Response getCurrentUser:', response);
        
        if (response && response.success && response.data) {
          const user = response.data as any;
          setUser(user);

          const mockProfile: Profile = {
            id: user.id.toString(),
            user_id: user.id.toString(),
            nome_completo: user.name || user.email,
            email: user.email,
            tipo_usuario: user.role as any,
            ativo: true,
            data_criacao: new Date().toISOString()
          };
          setProfile(mockProfile);
        } else {
          console.log('Response inválido ou usuário não encontrado');
          // Token pode estar expirado ou inválido
          localStorage.removeItem('token');
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // Se houver erro na autenticação, limpar o token inválido
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
      console.log('Hook signIn chamado:', { email, password: '***' });
      
      const response = await apiService.login(email, password);
      console.log('Response do apiService:', response);

      if (response && response.data && response.data.user) {
        setUser(response.data.user);

        // Salvar token no localStorage
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }

        const mockProfile: Profile = {
          id: response.data.user.id.toString(),
          user_id: response.data.user.id.toString(),
          nome_completo: response.data.user.name,
          email: response.data.user.email,
          tipo_usuario: response.data.user.role as any,
          ativo: true,
          data_criacao: new Date().toISOString()
        };
        setProfile(mockProfile);

        return { error: null };
      } else {
        return { error: { message: response.message || 'Erro ao fazer login' } };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { error: { message: error.message || 'Erro de conexão' } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Remover token do localStorage
      localStorage.removeItem('token');
      setUser(null);
      setProfile(null);
      return { error: null };
    } catch (error: any) {
      console.error('Logout error:', error);
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
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'superadmin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
