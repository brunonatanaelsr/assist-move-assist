// src/hooks/useAuth.tsx
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  createContext,
  useContext,
  type ReactNode
} from "react";
import { AuthService, type AuthUser } from "@/services/auth.service";

type User = AuthUser & {
  ativo?: boolean;
  telefone?: string;
  nome_completo?: string;
  cargo?: string;
  departamento?: string;
  bio?: string;
  foto_url?: string;
  endereco?: string;
  data_nascimento?: string;
};

interface AuthContextType {
  user: User | null;
  profile: User | null; // alias para compatibilidade
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  permissions: string[];
  roles: string[];
  hasPermission: (required: string | string[]) => boolean;
  hasRole: (required: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type SessionPayload = {
  user: User | null;
  permissions?: string[];
  roles?: string[];
  token?: string;
};

const ADMIN_ROLES = ["admin", "super_admin", "superadmin"] as const;

const normalizeToArray = (value: string | string[]): string[] =>
  Array.isArray(value) ? value : [value];

export function AuthProvider({ children }: { children: ReactNode }) {
  const authService = useMemo(() => AuthService.getInstance(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    const storedUser = authService.getUser?.();
    if (storedUser) {
      setUser(storedUser as User);
      if (storedUser.papel) {
        setRoles((prev) => {
          const normalized = new Set(prev);
          normalized.add(storedUser.papel);
          return Array.from(normalized);
        });
      }
    }
  }, [authService]);

  const persistSession = useCallback((session: SessionPayload) => {
    if (session.token) {
      localStorage.setItem("auth_token", session.token);
      localStorage.setItem("token", session.token);
    }

    if (session.user) {
      const serializedUser = JSON.stringify(session.user);
      localStorage.setItem("user", serializedUser);
      setUser(session.user);
    } else {
      localStorage.removeItem("user");
      setUser(null);
    }

    const normalizedPermissions = session.permissions ?? [];
    setPermissions(normalizedPermissions);

    const normalizedRoles = new Set<string>();
    (session.roles ?? []).forEach((role) => normalizedRoles.add(role));
    if (session.user?.papel) {
      normalizedRoles.add(session.user.papel);
    }
    setRoles(Array.from(normalizedRoles));
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    persistSession({ user: null, permissions: [], roles: [] });
  }, [persistSession]);

  const fetchSession = useCallback(async () => {
    const session = await authService.me();
    if (!session.user) {
      clearSession();
      return null;
    }

    persistSession({
      user: session.user as User,
      permissions: session.permissions ?? [],
      roles: session.roles ?? [],
      token: session.token
    });

    return session;
  }, [authService, clearSession, persistSession]);

  const syncSession = useCallback(async () => {
    try {
      await fetchSession();
    } catch (error) {
      try {
        const refreshedToken = await authService.refreshToken();
        localStorage.setItem("auth_token", refreshedToken);
        localStorage.setItem("token", refreshedToken);
        await fetchSession();
      } catch (refreshError) {
        clearSession();
        throw refreshError;
      }
    }
  }, [authService, clearSession, fetchSession]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      setLoading(true);
      try {
        await syncSession();
      } catch (error) {
        console.warn("Falha ao inicializar sessão de autenticação", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, [syncSession]);

  const signIn = async (email: string, password: string): Promise<{ error?: Error }> => {
    try {
      setLoading(true);
      const response = await authService.login({ email, password });

      persistSession({
        user: (response.user as User) ?? null,
        permissions: response.permissions ?? permissions,
        roles: response.roles ?? roles,
        token: response.token
      });

      await syncSession();

      return {};
    } catch (error) {
      clearSession();
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      clearSession();
      setLoading(false);
    }
  };

  const permissionsSet = useMemo(() => new Set(permissions), [permissions]);
  const rolesSet = useMemo(() => new Set(roles), [roles]);

  const hasPermission = useCallback(
    (required: string | string[]) => {
      const requiredPermissions = normalizeToArray(required).filter(Boolean);
      if (!requiredPermissions.length) return true;
      return requiredPermissions.every((permission) => permissionsSet.has(permission));
    },
    [permissionsSet]
  );

  const hasRole = useCallback(
    (required: string | string[]) => {
      const requiredRoles = normalizeToArray(required).filter(Boolean);
      if (!requiredRoles.length) return true;
      return requiredRoles.some((role) => rolesSet.has(role));
    },
    [rolesSet]
  );

  const isAdmin = useMemo(() => ADMIN_ROLES.some((role) => hasRole(role)), [hasRole]);

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
        roles,
        hasPermission,
        hasRole
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

