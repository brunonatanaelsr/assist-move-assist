import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { AuthService } from '@/services/auth.service';

interface User {
  id: number;
  email: string;
  nome: string;
  papel: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authService = AuthService.getInstance();

  useEffect(() => {
    // Verificar se já existe um usuário autenticado
    const savedUser = authService.getUser();
    if (savedUser) {
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
      return {};
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
