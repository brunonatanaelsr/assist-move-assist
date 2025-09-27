// src/hooks/useAuth.tsx
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
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
  permissions: string[];
  hasPermission: (permission: string | string[], mode?: "all" | "any") => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authService = useMemo(() => AuthService.getInstance(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('permissions');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((permission) => String(permission));
        }
      }
    } catch (error) {
      console.warn('Não foi possível restaurar permissões do armazenamento local', error);
    }
    return [];
  });

  useEffect(() => {
    let isMounted = true;
    const initializeSession = async () => {
      const savedUser = authService.getUser?.();
      if (savedUser && isMounted) {
        setUser(savedUser as User);
      }

      try {
        if (authService.isAuthenticated()) {
          const session = await authService.fetchSession();
          if (!isMounted) return;
          if (session.user) {
            const nextUser = session.user as User;
            setUser(nextUser);
            localStorage.setItem('user', JSON.stringify(nextUser));
          }
          if (session.permissions) {
            const normalized = session.permissions.map((permission) => String(permission));
            setPermissions(normalized);
            localStorage.setItem('permissions', JSON.stringify(normalized));
          }
        }
      } catch (error) {
        console.warn('Falha ao inicializar sessão de autenticação', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initializeSession();

    return () => {
      isMounted = false;
    };
  }, [authService]);

  const signIn = async (email: string, password: string): Promise<{ error?: Error }> => {
    try {
      setLoading(true);
      const response = await authService.login({ email, password });
      // Tipagem explícita do retorno esperado
      type LoginResponse = { token?: string; user?: User };
      const resp = response as LoginResponse;
      if (resp.token) {
        localStorage.setItem('auth_token', resp.token);
        localStorage.setItem('token', resp.token);
      }
      if (resp.user) {
        localStorage.setItem('user', JSON.stringify(resp.user));
        setUser(resp.user);
      }
      const fetchedPermissions = await authService.fetchPermissions();
      setPermissions(fetchedPermissions);
      localStorage.setItem('permissions', JSON.stringify(fetchedPermissions));
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
      localStorage.removeItem("permissions");
      setUser(null);
      setPermissions([]);
      setLoading(false);
    }
  };

  const privilegedRoles = useMemo(
    () => new Set(['admin', 'super_admin', 'superadmin']),
    []
  );

  const isAdmin = !!(user?.papel && privilegedRoles.has(user.papel));

  const hasPermission = useCallback(
    (permission: string | string[], mode: "all" | "any" = "all") => {
      const required = Array.isArray(permission) ? permission : [permission];
      if (required.length === 0) return true;
      if (!permissions || permissions.length === 0) return false;
      const normalizedRequired = required.map((item) => String(item));
      if (mode === "any") {
        return normalizedRequired.some((item) => permissions.includes(item));
      }
      return normalizedRequired.every((item) => permissions.includes(item));
    },
    [permissions]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user, // alias para compatibilidade
        loading,
        signIn,
        signOut,
        isAuthenticated: !!user,
        isAdmin,
        permissions,
        hasPermission
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
