import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Trash, Users } from 'lucide-react';
import { Oficina } from '@/types/shared';

interface OficinaCardProps {
  oficina: Oficina;
  onEdit?: (oficina: Oficina) => void;
  onDelete?: (id: number) => void;
  onManagePresencas?: (oficina: Oficina) => void;
}

const statusColors = {
  agendada: 'bg-blue-500',
  em_andamento: 'bg-yellow-500',
  concluida: 'bg-green-500',
  cancelada: 'bg-red-500'
} as const;

const statusLabels = {
  agendada: 'Agendada',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
} as const;

export function OficinaCard({ 
  oficina,
  onEdit,
  onDelete,
  onManagePresencas 
}: OficinaCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <CardTitle className="text-xl line-clamp-1">
              {oficina.titulo}
            </CardTitle>
            <CardDescription className="mt-1">
              {format(new Date(oficina.data_oficina), "dd 'de' MMMM 'de' yyyy", { 
                locale: ptBR 
              })}
            </CardDescription>
          </div>
          <Badge className={statusColors[oficina.status]}>
            {statusLabels[oficina.status]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Horário:</span>{' '}
              {oficina.horario_inicio} às {oficina.horario_fim}
            </div>
            
            {oficina.instrutor && (
              <div className="text-sm">
                <span className="font-medium">Instrutor:</span>{' '}
                {oficina.instrutor}
              </div>
            )}
            
            {oficina.local && (
              <div className="text-sm">
                <span className="font-medium">Local:</span>{' '}
                {oficina.local}
              </div>
            )}

            <div className="text-sm">
              <span className="font-medium">Capacidade:</span>{' '}
              {oficina.vagas_disponiveis ?? oficina.capacidade_maxima} vagas
            </div>
          </div>

          {oficina.descricao && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {oficina.descricao}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            {onManagePresencas && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManagePresencas(oficina)}
              >
                <Users className="h-4 w-4 mr-1" />
                Presenças
              </Button>
            )}
            
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(oficina)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(oficina.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
