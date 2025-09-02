// src/hooks/useAuth.tsx
import {
  useState,
  useEffect,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { AuthService } from "@/services/auth.service";

interface User {
  id: number;
  email: string;
  nome: string;
  papel: string;
  avatar_url?: string;
  ativo?: boolean;
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
  profile: User | null; // alias para compatibilidade
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authService = useMemo(() => AuthService.getInstance(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = authService.getUser?.();
    if (savedUser) setUser(savedUser);
    setLoading(false);
  }, [authService]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authService.login({ email, password });
      // Em dev, backend envia cookie httpOnly e pode não retornar token no corpo
      if ((response as any)?.token) {
        localStorage.setItem('auth_token', (response as any).token);
        localStorage.setItem('token', (response as any).token); // unifica com outros clientes
      }
      if ((response as any)?.user) {
        localStorage.setItem('user', JSON.stringify((response as any).user));
        setUser((response as any).user);
      }
      return {};
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authService.logout();
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile: user, // alias para compatibilidade
      loading, 
      signIn, 
      signOut,
      isAuthenticated: !!user,
      isAdmin: user?.papel === 'admin' || user?.papel === 'super_admin' || user?.papel === 'superadmin'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return ctx;
}
