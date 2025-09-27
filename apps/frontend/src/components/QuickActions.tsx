import { Plus, CheckSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function QuickActions() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const actions = useMemo(
    () => [
      {
        label: 'Cadastrar beneficiária',
        icon: Plus,
        to: '/beneficiarias/nova',
        variant: 'default' as const,
        requiredPermissions: ['beneficiarias.create']
      },
      {
        label: 'Registrar presença',
        icon: CheckSquare,
        to: '/oficinas?registrar=1',
        variant: 'secondary' as const,
        requiredPermissions: ['oficinas.registrar_presenca']
      },
      {
        label: 'Gerar relatório',
        icon: FileText,
        to: '/relatorios',
        variant: 'outline' as const,
        requiredPermissions: ['relatorios.view']
      }
    ],
    []
  );

  return (
    <div
      aria-label="Ações rápidas"
      className="fixed bottom-6 right-6 z-40 flex flex-col gap-2"
    >
      {actions.map((action) => {
        const isAllowed = action.requiredPermissions ? hasPermission(action.requiredPermissions) : true;
        const Icon = action.icon;

        return (
          <Button
            key={action.label}
            variant={action.variant}
            className={action.variant === 'outline' ? 'bg-background shadow-lg' : 'shadow-lg'}
            onClick={() => {
              if (isAllowed) {
                navigate(action.to);
              }
            }}
            disabled={!isAllowed}
            aria-disabled={!isAllowed}
          >
            <Icon className="h-4 w-4 mr-2" /> {action.label}
          </Button>
        );
      })}
    </div>
  );
}

export default QuickActions;

