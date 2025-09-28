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
    const savedUser = authService.getUser?.();
    if (savedUser) setUser(savedUser);
    setLoading(false);
  }, [authService]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLogoutEvent = () => {
      setUser(null);
      setLoading(false);
    };

    const handleStorageEvent = (event: StorageEvent) => {
      const relevantKeys = new Set([
        "token",
        "auth_token",
        AUTH_TOKEN_KEY,
        "user",
        USER_KEY
      ]);
      if (event.key === null || relevantKeys.has(event.key)) {
        handleLogoutEvent();
      }
    };

    window.addEventListener("auth:logout", handleLogoutEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener("auth:logout", handleLogoutEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: Error }> => {
    try {
      setLoading(true);
      const response = await authService.login({ email, password });
      
      // Tipagem explícita do retorno esperado
      type LoginResponse = { token: string; refreshToken: string; user?: User };
      const resp = response as LoginResponse;
      
      // Armazenar token de acesso
      if (resp.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, resp.token);
        // Limpar chaves legadas
        if (AUTH_TOKEN_KEY !== 'auth_token') {
          localStorage.removeItem('auth_token');
        }
        if (AUTH_TOKEN_KEY !== 'token') {
          localStorage.removeItem('token');
        }
      }
      if (resp.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(resp.user));
        if (USER_KEY !== 'user') {
          localStorage.removeItem('user');
        }
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
<<<<<<< HEAD
      const tokenKeys = new Set([
        'token',
        'auth_token',
        AUTH_TOKEN_KEY
      ]);
      tokenKeys.forEach((key) => localStorage.removeItem(key));
      localStorage.removeItem('user');
      localStorage.removeItem(USER_KEY);
=======
      localStorage.removeItem("auth_token");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
>>>>>>> main
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
