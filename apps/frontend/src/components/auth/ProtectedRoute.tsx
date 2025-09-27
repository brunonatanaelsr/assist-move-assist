import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
  requiredPermissions?: string[];
  permissionMode?: 'all' | 'any';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  adminOnly = false,
  requiredPermissions,
  permissionMode = 'all'
}) => {
  const { user, loading, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Usuário autenticado: segue fluxo normal
        if (adminOnly && !isAdmin) {
          console.log('ProtectedRoute: Usuário sem privilégios de admin');
          navigate('/', { replace: true });
          return;
        }
        if (requiredPermissions?.length) {
          const allowed = hasPermission(requiredPermissions, permissionMode);
          if (!allowed) {
            console.log('ProtectedRoute: usuário sem permissões requeridas', {
              requiredPermissions,
              mode: permissionMode
            });
            navigate('/', { replace: true });
          }
        }
      } else {
        // Não autenticado: não redireciona automaticamente. Exibimos CTA de login.
        // Isso evita flakiness nos testes E2E no carregamento inicial.
      }
    }
  }, [loading, user, adminOnly, navigate, location, isAdmin, requiredPermissions, hasPermission, permissionMode]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-primary mb-2">Instituto Move Marias</h3>
          <p className="text-muted-foreground">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  // Render a minimal public landing with login CTA when not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold mb-4">Assist Move</h1>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Sistema de gestão do Instituto Move Marias. Faça login para acessar o dashboard.
        </p>
        <button
          onClick={() => navigate('/auth')}
          data-testid="login-button"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
        >
          Entrar
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
