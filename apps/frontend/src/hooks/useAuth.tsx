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

  const initialUser = useMemo<User | null>(() => authService.getUser(), [authService]);

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

    window.addEventListener("auth:logout", handleLogoutEvent);

    return () => {
      window.removeEventListener("auth:logout", handleLogoutEvent);
    };
  }, [authService, queryClient]);

  const signIn = async (email: string, password: string): Promise<{ error?: Error }> => {
    try {
      setAuthenticating(true);
      const response = await authService.login({ email, password });

      // Tipagem explícita do retorno esperado
      type LoginResponse = { token: string; refreshToken: string; user?: User };
      const resp = response as LoginResponse;

      if (resp.user) {
        queryClient.setQueryData(authKeys.session(), resp.user);
      } else {
        await queryClient.invalidateQueries({ queryKey: authKeys.session() });
      }
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
