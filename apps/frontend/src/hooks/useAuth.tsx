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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authQueryKeys = {
  all: ["auth"] as const,
  profile: () => ["auth", "me"] as const,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const authService = useMemo(() => AuthService.getInstance(), []);
  const queryClient = useQueryClient();
  const initialHasSession = authService.isAuthenticated();
  const [hasSession, setHasSession] = useState(initialHasSession);
  const [user, setUser] = useState<User | null>(() =>
    initialHasSession ? (authService.getUser?.() as User | null) : null
  );
  const [authLoading, setAuthLoading] = useState(false);

  const {
    data: profile,
    status: profileStatus,
    isPending: isProfilePending,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: authQueryKeys.profile(),
    queryFn: async () => authService.getProfile(),
    enabled: hasSession,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    if (!hasSession) {
      return;
    }

    if (profile) {
      const nextUser = profile as User;
      setUser(nextUser);
      authService.setUser(nextUser);
      return;
    }

    if (profileStatus === "success" && profile === null) {
      setUser(null);
      authService.setUser(null);
      setHasSession(false);
    }
  }, [profile, profileStatus, authService, hasSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLogoutEvent = () => {
      setUser(null);
      setHasSession(false);
      authService.setUser(null);
      queryClient.removeQueries({ queryKey: authQueryKeys.profile(), exact: true });
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
        const authenticated = authService.isAuthenticated();
        setHasSession(authenticated);

        if (!event.newValue) {
          handleLogoutEvent();
          return;
        }

        if (event.key === USER_KEY && event.newValue) {
          try {
            const normalized = authService.getUser();
            if (normalized) {
              setUser(normalized as User);
            }
          } catch (error) {
            console.warn("Falha ao sincronizar usuário do storage", error);
          }
        }

        queryClient.invalidateQueries({ queryKey: authQueryKeys.profile() });
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
      setAuthLoading(true);
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
        authService.setUser(resp.user);
        const normalized = authService.getUser();
        if (normalized) {
          setUser(normalized as User);
          queryClient.setQueryData(authQueryKeys.profile(), normalized);
        }
        legacyUserKeys
          .filter((key) => key !== USER_KEY)
          .forEach((key) => localStorage.removeItem(key));
      }
      setHasSession(true);
      await refetchProfile().catch(() => undefined);
      return {};
    } catch (error) {
      return { error: error as Error };
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setAuthLoading(true);
      await authService.logout();
    } finally {
      const tokenKeys = new Set([...legacyTokenKeys, AUTH_TOKEN_KEY]);
      tokenKeys.forEach((key) => localStorage.removeItem(key));
      const userKeys = new Set([...legacyUserKeys, USER_KEY]);
      userKeys.forEach((key) => localStorage.removeItem(key));
      authService.setUser(null);
      setUser(null);
      setHasSession(false);
      queryClient.removeQueries({ queryKey: authQueryKeys.profile(), exact: true });
      setAuthLoading(false);
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
        loading: authLoading || (hasSession && isProfilePending),
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
