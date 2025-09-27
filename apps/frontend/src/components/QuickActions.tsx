import { Plus, CheckSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function QuickActions() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  return (
    <div
      aria-label="Ações rápidas"
      className="fixed bottom-6 right-6 z-40 flex flex-col gap-2"
    >
      <Button
        variant="default"
        className="shadow-lg"
        onClick={() => navigate('/beneficiarias/nova')}
      >
        <Plus className="h-4 w-4 mr-2" /> Cadastrar beneficiária
      </Button>
      <Button
        variant="secondary"
        className="shadow-lg"
        onClick={() => navigate('/oficinas?registrar=1')}
      >
        <CheckSquare className="h-4 w-4 mr-2" /> Registrar presença
      </Button>
      {isAdmin && (
        <Button
          variant="outline"
          className="bg-background shadow-lg"
          onClick={() => navigate('/relatorios')}
        >
          <FileText className="h-4 w-4 mr-2" /> Gerar relatório
        </Button>
      )}
    </div>
  );
}

export default QuickActions;

