// src/hooks/useAuth.tsx
import {
  useState,
  useEffect,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { AUTH_TOKEN_KEY, USER_KEY } from "@/config";
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
    const savedUser = authService.getUser();
    if (savedUser) setUser(savedUser);
    setLoading(false);
  }, [authService]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUserChange = (event: Event) => {
      const detail = (event as CustomEvent<User | null>).detail ?? null;
      setUser(detail);
    };

    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth:user-changed', handleUserChange);
    window.addEventListener('auth:logout', handleLogout);
    return () => {
      window.removeEventListener('auth:user-changed', handleUserChange);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);
  const signIn = async (email: string, password: string): Promise<{ error?: Error }> => {
    try {
      setLoading(true);
      const response = await authService.login({ email, password });

      // Tipagem explícita do retorno esperado
      type LoginResponse = { token: string; refreshToken: string; user?: User };
      const resp = response as LoginResponse;

      // O backend define cookies httpOnly; armazenamos apenas o perfil no client via AuthService
      if (resp.user) {
        setUser(resp.user);
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
      // limpeza local: remover possíveis chaves legadas
      const tokenKeys = new Set([...(['auth_token','token'] as string[]), AUTH_TOKEN_KEY]);
      tokenKeys.forEach((key) => window.localStorage.removeItem(key));
      const userKeys = new Set([...(['user'] as string[]), USER_KEY]);
      userKeys.forEach((key) => window.localStorage.removeItem(key));
      setUser(null);
      setLoading(false);
    }
  };

  const privilegedRoles = useMemo(
    () => new Set(['admin', 'super_admin', 'superadmin']),
    []
  );

  const isAdmin = !!(user?.papel && privilegedRoles.has(user.papel));

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user, // alias para compatibilidade
        loading,
        signIn,
        signOut,
        isAuthenticated: !!user,
        isAdmin
      }}
    >
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
