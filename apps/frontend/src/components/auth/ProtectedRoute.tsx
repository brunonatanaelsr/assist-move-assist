import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  adminOnly = false
}) => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const hasRequiredPermissions = !adminOnly || Boolean(isAdmin);

  useEffect(() => {
    if (!loading && user && !hasRequiredPermissions) {
      logger.warn('Usuário autenticado sem as permissões necessárias, redirecionando.');
      navigate('/', { replace: true });
    }
  }, [loading, user, hasRequiredPermissions, navigate]);

  const isCheckingAccess = loading || (user && !hasRequiredPermissions);

  // Show loading state while checking authentication or permissions
  if (isCheckingAccess) {
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
