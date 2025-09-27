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
    const savedUser = authService.getUser();
    if (savedUser) setUser(savedUser);
    setLoading(false);
  }, [authService]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUserChange = (event: Event) => {
      const detail = (event as CustomEvent<User | null>).detail ?? null;
      setUser(detail);
    };

    window.addEventListener("auth:user-changed", handleUserChange);
    return () => {
      window.removeEventListener("auth:user-changed", handleUserChange);
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: Error }> => {
    try {
      setLoading(true);
      const response = await authService.login({ email, password });
      // Tipagem explícita do retorno esperado
      type LoginResponse = { token?: string; user?: User };
      const resp = response as LoginResponse;
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
