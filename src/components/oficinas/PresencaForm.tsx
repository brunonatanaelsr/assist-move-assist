import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { useMarcarPresenca } from '@/hooks/useOficinas';
import { Oficina } from '@/types/shared';
import { format } from 'date-fns';

const presencaSchema = z.object({
  beneficiaria_id: z.number(),
  presente: z.boolean(),
  observacoes: z.string().optional()
});

type PresencaFormData = z.infer<typeof presencaSchema>;

interface PresencaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oficina: Oficina;
  beneficiarias: Array<{
    id: number;
    nome: string;
  }>;
  presencas?: Array<{
    beneficiaria_id: number;
    presente: boolean;
    observacoes?: string;
  }>;
}

export function PresencaForm({
  open,
  onOpenChange,
  oficina,
  beneficiarias,
  presencas = []
}: PresencaFormProps) {
  const { mutateAsync: registrarPresenca } = useMarcarPresenca(oficina.id);

  const handlePresencaChange = async (beneficiariaId: number, presente: boolean) => {
    try {
      await registrarPresenca({
        beneficiariaId,
        data: format(new Date(oficina.data_oficina), 'yyyy-MM-dd'),
        presente
      });
    } catch (error) {
      console.error('Erro ao registrar presença:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Lista de Presença - {oficina.titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm">
            <span className="font-medium">Data:</span>{' '}
            {new Date(oficina.data_oficina).toLocaleDateString('pt-BR')}
          </div>

          <div className="text-sm">
            <span className="font-medium">Horário:</span>{' '}
            {oficina.horario_inicio} às {oficina.horario_fim}
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {beneficiarias.map(beneficiaria => {
                const presenca = presencas.find(
                  p => p.beneficiaria_id === beneficiaria.id
                );

                return (
                  <div
                    key={beneficiaria.id}
                    className="flex items-start gap-4 p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={presenca?.presente}
                        onCheckedChange={(checked) => {
                          handlePresencaChange(beneficiaria.id, checked as boolean);
                        }}
                      />
                      <span className="font-medium">
                        {beneficiaria.nome}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
