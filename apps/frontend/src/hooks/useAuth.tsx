// src/hooks/useAuth.tsx
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
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
  permissions: string[];
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authQueryKey = ["auth", "me"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const authService = useMemo(() => AuthService.getInstance(), []);
  const queryClient = useQueryClient();
  const [isMutating, setIsMutating] = useState(false);
  const [shouldEnableQuery, setShouldEnableQuery] = useState(() => authService.isAuthenticated());

  const initialUserRef = useRef<User | null>((authService.getUser?.() as User | null) ?? null);
  const legacyTokenKeys = useMemo(() => ["auth_token", "token"], []);
  const legacyUserKeys = useMemo(() => ["user"], []);
  const watchedStorageKeys = useMemo(
    () => new Set([AUTH_TOKEN_KEY, USER_KEY, ...legacyTokenKeys, ...legacyUserKeys]),
    [legacyTokenKeys, legacyUserKeys]
  );

  const { data: sessionUser, isInitialLoading, isFetching } = useQuery<User | null>({
    queryKey: authQueryKey,
    queryFn: async () => (await authService.fetchCurrentUser()) as User | null,
    enabled: shouldEnableQuery,
    initialData: initialUserRef.current ?? undefined,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: shouldEnableQuery ? "always" : false,
    refetchOnWindowFocus: shouldEnableQuery,
    refetchOnReconnect: shouldEnableQuery,
  });

  const [currentUser, setCurrentUser] = useState<User | null>(initialUserRef.current ?? null);

  useEffect(() => {
    setCurrentUser(sessionUser ?? null);
  }, [sessionUser]);

  const syncFromStorage = useCallback(() => {
    const nextUser = (authService.getUser?.() as User | null) ?? null;
    if (nextUser) {
      queryClient.setQueryData(authQueryKey, nextUser);
    } else {
      queryClient.setQueryData(authQueryKey, null);
    }
    setCurrentUser(nextUser);
    const authenticated = authService.isAuthenticated();
    setShouldEnableQuery(authenticated);
    if (authenticated) {
      queryClient.invalidateQueries({ queryKey: authQueryKey });
    }
  }, [authService, queryClient]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLogoutEvent = () => {
      authService.clearStoredSession();
      queryClient.setQueryData(authQueryKey, null);
      queryClient.removeQueries({ queryKey: authQueryKey });
      setShouldEnableQuery(false);
      setCurrentUser(null);
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === null || watchedStorageKeys.has(event.key)) {
        syncFromStorage();
      }
    };

    window.addEventListener("auth:logout", handleLogoutEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener("auth:logout", handleLogoutEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [authService, queryClient, syncFromStorage, watchedStorageKeys]);

  const legacyTokenSet = useMemo(() => new Set([...legacyTokenKeys, AUTH_TOKEN_KEY]), [legacyTokenKeys]);
  const legacyUserSet = useMemo(() => new Set([...legacyUserKeys, USER_KEY]), [legacyUserKeys]);

  const signIn = async (email: string, password: string): Promise<{ error?: Error }> => {
    try {
      setIsMutating(true);
      const response = await authService.login({ email, password });

      type LoginResponse = { token: string; refreshToken: string; user?: User; permissions?: string[] };
      const resp = response as LoginResponse;

      if (resp.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, resp.token);
        legacyTokenKeys
          .filter((key) => key !== AUTH_TOKEN_KEY)
          .forEach((key) => localStorage.removeItem(key));
      }

      const normalizedUser: User | null = resp.user
        ? { ...resp.user, permissions: resp.user.permissions ?? resp.permissions ?? [] }
        : null;

      authService.storeUser(normalizedUser);
      queryClient.setQueryData(authQueryKey, normalizedUser);
      setCurrentUser(normalizedUser);
      setShouldEnableQuery(authService.isAuthenticated());

      if (normalizedUser) {
        legacyUserKeys
          .filter((key) => key !== USER_KEY)
          .forEach((key) => localStorage.removeItem(key));
      } else {
        legacyUserKeys.forEach((key) => localStorage.removeItem(key));
      }

      if (authService.isAuthenticated()) {
        await queryClient.invalidateQueries({ queryKey: authQueryKey });
      }

      return {};
    } catch (error) {
      return { error: error as Error };
    } finally {
      setIsMutating(false);
    }
  };

  const signOut = async () => {
    try {
      setIsMutating(true);
      await authService.logout();
    } finally {
      legacyTokenSet.forEach((key) => localStorage.removeItem(key));
      legacyUserSet.forEach((key) => localStorage.removeItem(key));
      queryClient.setQueryData(authQueryKey, null);
      queryClient.removeQueries({ queryKey: authQueryKey });
      setShouldEnableQuery(false);
      setCurrentUser(null);
      setIsMutating(false);
    }
  };

  const privilegedRoles = useMemo(
    () => new Set(["admin", "super_admin", "superadmin"]),
    []
  );

  const user = currentUser;
  const permissions = user?.permissions ?? [];
  const hasPermission = useCallback((permission: string) => permissions.includes(permission), [permissions]);

  const isAdmin = !!(user?.papel && privilegedRoles.has(user.papel));
  const loading = isMutating || (shouldEnableQuery ? isInitialLoading || isFetching : false);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user,
        loading,
        signIn,
        signOut,
        isAuthenticated: !!user,
        isAdmin,
        permissions,
        hasPermission,
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
