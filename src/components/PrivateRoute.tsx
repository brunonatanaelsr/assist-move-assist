import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Loading } from '@/components/ui/loading';

interface Props {
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

export function PrivateRoute({ requiredPermissions, requiredRoles }: Props) {
  const { user, isLoading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading message="Carregando..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verifica permissões
  if (requiredPermissions?.length) {
    const hasAllPermissions = requiredPermissions.every((permission) =>
      hasPermission(permission)
    );
    if (!hasAllPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Verifica roles
  if (requiredRoles?.length) {
    const hasAnyRole = requiredRoles.some((role) => hasRole(role));
    if (!hasAnyRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}
