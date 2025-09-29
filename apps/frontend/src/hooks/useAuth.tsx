// src/hooks/useAuth.tsx
import {
  useState,
  useEffect,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  permissions?: string[];
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

const authKeys = {
  all: ['auth'] as const,
  session: () => ['auth', 'session'] as const,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const authService = useMemo(() => AuthService.getInstance(), []);
  const queryClient = useQueryClient();
  const [authenticating, setAuthenticating] = useState(false);

  const initialUser = useMemo<User | null>(() => authService.getUser?.() ?? null, [authService]);

  const {
    data: sessionUser,
    isPending,
    isFetching,
  } = useQuery<User | null>({
    queryKey: authKeys.session(),
    queryFn: () => authService.fetchCurrentUser(),
    initialData: initialUser,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: typeof window !== "undefined",
  });

  const user = sessionUser ?? null;
  const loading = isPending || isFetching || authenticating;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLogoutEvent = () => {
      authService.clearStoredSession();
      queryClient.setQueryData(authKeys.session(), null);
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
        queryClient.invalidateQueries({ queryKey: authKeys.session() }).catch((error) => {
          console.error('Erro ao sincronizar sessão de autenticação:', error);
        });
      }
    };

    window.addEventListener("auth:logout", handleLogoutEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener("auth:logout", handleLogoutEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [authService, queryClient]);

  const legacyTokenKeys = useMemo(() => ['auth_token', 'token'], []);
  const legacyUserKeys = useMemo(() => ['user'], []);

  const signIn = async (email: string, password: string): Promise<{ error?: Error }> => {
    try {
      setAuthenticating(true);
      const response = await authService.login({ email, password });

      // Tipagem explícita do retorno esperado
      type LoginResponse = { token: string; refreshToken: string; user?: User };
      const resp = response as LoginResponse;

      // Armazenar token de acesso
      if (resp.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, resp.token);
        legacyTokenKeys
          .filter((key) => key !== AUTH_TOKEN_KEY)
          .forEach((key) => localStorage.removeItem(key));
      }
      if (resp.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(resp.user));
        legacyUserKeys
          .filter((key) => key !== USER_KEY)
          .forEach((key) => localStorage.removeItem(key));
        queryClient.setQueryData(authKeys.session(), resp.user);
      }
      await queryClient.invalidateQueries({ queryKey: authKeys.session() });
      return {};
    } catch (error) {
      return { error: error as Error };
    } finally {
      setAuthenticating(false);
    }
  };

  const signOut = async () => {
    try {
      setAuthenticating(true);
      await authService.logout();
    } finally {
      authService.clearStoredSession();
      queryClient.setQueryData(authKeys.session(), null);
      setAuthenticating(false);
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
