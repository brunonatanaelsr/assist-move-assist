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
    let isMounted = true;

    const initialize = async () => {
      try {
        const currentUser = await authService.fetchCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    const handleForcedLogout = () => {
      authService.clearCachedUser();
      if (isMounted) {
        setUser(null);
        setLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:logout', handleForcedLogout);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:logout', handleForcedLogout);
      }
    };
  }, [authService]);

  const signIn = async (email: string, password: string): Promise<{ error?: Error }> => {
    try {
      setLoading(true);
      await authService.login({ email, password });

      try {
        const currentUser = await authService.fetchCurrentUser();
        setUser(currentUser);
      } catch (fetchError) {
        return { error: fetchError as Error };
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
