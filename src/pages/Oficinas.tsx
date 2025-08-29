import { useState } from 'react';
import {
  useOficinas,
  useCreateOficina,
  useUpdateOficina,
  useDeleteOficina,
  useOficinaParticipantes,
  useOficinaPresencas
} from '@/hooks/useOficinas';
import { OficinaCard } from '@/components/oficinas/OficinaCard';
import { OficinaModal } from '@/components/oficinas/OficinaModal';
import { PresencaForm } from '@/components/oficinas/PresencaForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Oficina } from '@/types/shared';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function OficinasPage() {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    mes: format(new Date(), 'yyyy-MM')
  });

  const [oficinaModal, setOficinaModal] = useState<{
    open: boolean;
    oficina?: Oficina;
  }>({
    open: false
  });

  const [presencaModal, setPresencaModal] = useState<{
    open: boolean;
    oficina?: Oficina;
  }>({
    open: false
  });

  const { data: oficinasList, isLoading } = useOficinas({
    status: filters.status,
    data_inicio: filters.mes ? format(startOfMonth(new Date(filters.mes)), 'yyyy-MM-dd') : undefined,
    data_fim: filters.mes ? format(endOfMonth(new Date(filters.mes)), 'yyyy-MM-dd') : undefined
  });

  const createMutation = useCreateOficina();
  const updateMutation = useUpdateOficina();
  const deleteMutation = useDeleteOficina();
  const { toast } = useToast();

  const selectedOficinaId = presencaModal.oficina?.id;
  const presencaData = presencaModal.oficina
    ? format(new Date(presencaModal.oficina.data_oficina), 'yyyy-MM-dd')
    : undefined;

  const { data: participantes } = useOficinaParticipantes(selectedOficinaId ?? 0);
  const { data: presencas } = useOficinaPresencas(selectedOficinaId ?? 0, presencaData);

  const oficinas = oficinasList?.data?.filter(oficina =>
    !filters.search ||
    oficina.titulo.toLowerCase().includes(filters.search.toLowerCase()) ||
    oficina.descricao?.toLowerCase().includes(filters.search.toLowerCase()) ||
    oficina.local?.toLowerCase().includes(filters.search.toLowerCase()) ||
    oficina.instrutor?.toLowerCase().includes(filters.search.toLowerCase())
  ) || [];

  const handleSubmitOficina = async (data: Partial<Oficina>) => {
    try {
      if (oficinaModal.oficina) {
        await updateMutation.mutateAsync({
          id: oficinaModal.oficina.id,
          ...data
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      setOficinaModal({ open: false });
    } catch (error) {
      console.error('Erro ao salvar oficina:', error);
    }
  };

  const handleDeleteOficina = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta oficina?')) return;
    
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Erro ao excluir oficina:', error);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Oficinas</h1>
        <Button onClick={() => setOficinaModal({ open: true })}>
          Nova Oficina
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        <Input
          placeholder="Pesquisar oficinas..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />

        <Select
          value={filters.status}
          onValueChange={value => setFilters(f => ({ ...f, status: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="agendada">Agendada</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="month"
          value={filters.mes}
          onChange={e => setFilters(f => ({ ...f, mes: e.target.value }))}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : oficinas.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {oficinas.map(oficina => (
            <OficinaCard
              key={oficina.id}
              oficina={oficina}
              onEdit={oficina => setOficinaModal({ open: true, oficina })}
              onDelete={handleDeleteOficina}
              onManagePresencas={oficina => setPresencaModal({ open: true, oficina })}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma oficina encontrada.
        </div>
      )}

      <OficinaModal
        open={oficinaModal.open}
        onOpenChange={open => setOficinaModal({ open })}
        oficina={oficinaModal.oficina}
        onSubmit={handleSubmitOficina}
      />

      {presencaModal.open && presencaModal.oficina && (
        <PresencaForm
          open={presencaModal.open}
          onOpenChange={open => setPresencaModal({ open })}
          oficina={presencaModal.oficina}
          beneficiarias={
            participantes?.map(p => ({ id: p.id, nome: p.nome_completo })) || []
          }
          presencas={presencas || []}
        />
      )}
    </div>
  );
}
