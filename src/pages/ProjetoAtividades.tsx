import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useProjeto, 
  useProjetoAtividades,
  useAddAtividade,
  useAtualizarAtividade,
  useRemoveAtividade 
} from '@/hooks/useProjetos';
import { ProjetoAtividade } from '@/types/projeto';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronLeft,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  ClipboardList,
  MapPin,
  User,
  Target,
  Search
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loading } from '@/components/ui/loading';

// Lista mockada de responsáveis - deve vir da API
const RESPONSAVEIS = [
  { id: 1, nome: 'Ana Silva' },
  { id: 2, nome: 'João Santos' },
  { id: 3, nome: 'Maria Oliveira' },
];

const TIPOS_ATIVIDADE = [
  { value: 'oficina', label: 'Oficina' },
  { value: 'evento', label: 'Evento' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'outro', label: 'Outro' },
];

const STATUS_ATIVIDADE = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

type FormData = Omit<ProjetoAtividade, 'id' | 'created_at' | 'updated_at'>;

const initialFormData: FormData = {
  titulo: '',
  descricao: '',
  tipo: 'outro',
  data_inicio: '',
  data_fim: '',
  status: 'pendente',
  responsavel_id: undefined,
  responsavel_nome: '',
  local: '',
  meta: '',
  resultado: '',
  observacoes: '',
};

export function ProjetoAtividades() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<ProjetoAtividade | null>(
    null
  );
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const { data: projeto, isLoading: loadingProjeto } = useProjeto(Number(id));
  const { data: atividades, isLoading: loadingAtividades } = useProjetoAtividades(
    Number(id)
  );

  const addAtividade = useAddAtividade(Number(id));
  const atualizarAtividade = useAtualizarAtividade(Number(id));
  const removeAtividade = useRemoveAtividade(Number(id));

  const filteredAtividades = atividades?.filter((atividade) =>
    atividade.titulo.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (atividade: ProjetoAtividade) => {
    setEditingAtividade(atividade);
    setFormData({
      titulo: atividade.titulo,
      descricao: atividade.descricao || '',
      tipo: atividade.tipo,
      data_inicio: atividade.data_inicio,
      data_fim: atividade.data_fim || '',
      status: atividade.status,
      responsavel_id: atividade.responsavel_id,
      responsavel_nome: atividade.responsavel_nome || '',
      local: atividade.local || '',
      meta: atividade.meta || '',
      resultado: atividade.resultado || '',
      observacoes: atividade.observacoes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (atividadeId: number) => {
    if (confirm('Tem certeza que deseja excluir esta atividade?')) {
      removeAtividade.mutate(atividadeId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAtividade) {
      await atualizarAtividade.mutateAsync({
        atividadeId: editingAtividade.id,
        atividade: formData,
      });
    } else {
      await addAtividade.mutateAsync(formData);
    }
    
    setDialogOpen(false);
    setEditingAtividade(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'em_andamento':
        return 'bg-blue-100 text-blue-800';
      case 'concluida':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return STATUS_ATIVIDADE.find((s) => s.value === status)?.label || status;
  };

  if (loadingProjeto || loadingAtividades) {
    return <Loading message="Carregando atividades do projeto..." />;
  }

  if (!projeto) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="text-lg font-semibold mb-2">Projeto não encontrado</h3>
          <p className="text-muted-foreground text-center mb-4">
            O projeto que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={() => navigate('/projetos')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar para Projetos
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/projetos/${id}`)}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Atividades do Projeto</h1>
            <p className="text-muted-foreground">{projeto.nome}</p>
          </div>
        </div>
        <Button onClick={() => {
          setEditingAtividade(null);
          setFormData(initialFormData);
          setDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Atividade
        </Button>
      </div>

      {/* Lista de Atividades */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Atividades</CardTitle>
          <CardDescription>
            Gerencie todas as atividades do projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Busca */}
          <div className="mb-6">
            <Input
              placeholder="Buscar atividades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
              prefix={<Search className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Tabela */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data Início</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAtividades?.map((atividade) => (
                <TableRow key={atividade.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{atividade.titulo}</p>
                      {atividade.descricao && (
                        <p className="text-sm text-muted-foreground">
                          {atividade.descricao}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {TIPOS_ATIVIDADE.find((t) => t.value === atividade.tipo)?.label}
                  </TableCell>
                  <TableCell>
                    {format(parseISO(atividade.data_inicio), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>{atividade.responsavel_nome || '-'}</TableCell>
                  <TableCell>{atividade.local || '-'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(atividade.status)}>
                      {getStatusText(atividade.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleEdit(atividade)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(atividade.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredAtividades || filteredAtividades.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    <p className="text-muted-foreground">
                      Nenhuma atividade encontrada
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Criar/Editar Atividade */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAtividade ? 'Editar Atividade' : 'Nova Atividade'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da atividade
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, tipo: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_ATIVIDADE.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data de Início</Label>
                  <Input
                    id="data_inicio"
                    name="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data de Término (opcional)</Label>
                  <Input
                    id="data_fim"
                    name="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel_id">Responsável</Label>
                  <Select
                    value={formData.responsavel_id?.toString()}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        responsavel_id: Number(value),
                        responsavel_nome:
                          RESPONSAVEIS.find((r) => r.id === Number(value))?.nome ||
                          '',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESPONSAVEIS.map((responsavel) => (
                        <SelectItem
                          key={responsavel.id}
                          value={responsavel.id.toString()}
                        >
                          {responsavel.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ATIVIDADE.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleInputChange}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="local">Local</Label>
                <Input
                  id="local"
                  name="local"
                  value={formData.local}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta">Meta</Label>
                <Input
                  id="meta"
                  name="meta"
                  value={formData.meta}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resultado">Resultado</Label>
                <Textarea
                  id="resultado"
                  name="resultado"
                  value={formData.resultado}
                  onChange={handleInputChange}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleInputChange}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingAtividade(null);
                  setFormData(initialFormData);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={addAtividade.isPending || atualizarAtividade.isPending}
              >
                {addAtividade.isPending || atualizarAtividade.isPending
                  ? 'Salvando...'
                  : editingAtividade
                  ? 'Atualizar'
                  : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
