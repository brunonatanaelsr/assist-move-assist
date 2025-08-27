import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjetos, useExcluirProjeto } from '@/hooks/useProjetos';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Users,
  ClipboardList,
  Target,
  Calendar
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loading } from '@/components/ui/loading';

export function ProjetosPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data: projetos, isLoading } = useProjetos({
    status: status as 'ativo' | 'inativo' | 'concluido' | undefined,
    search
  });

  const excluirProjeto = useExcluirProjeto();

  const handleExcluir = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
      excluirProjeto.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-100 text-green-800';
      case 'inativo':
        return 'bg-red-100 text-red-800';
      case 'concluido':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'Ativo';
      case 'inativo':
        return 'Inativo';
      case 'concluido':
        return 'Concluído';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Projetos</h1>
        <Button onClick={() => navigate('/projetos/novo')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Projetos</CardTitle>
          <CardDescription>
            Gerencie todos os projetos da organização
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar projetos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
                prefix={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
                <SelectItem value="concluido">Concluídos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          {isLoading ? (
            <Loading message="Carregando projetos..." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Beneficiárias</TableHead>
                  <TableHead>Conclusão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projetos?.map((projeto) => (
                  <TableRow key={projeto.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{projeto.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {projeto.objetivo}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{projeto.responsavel_nome}</TableCell>
                    <TableCell>
                      {format(parseISO(projeto.data_inicio), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(projeto.status)}>
                        {getStatusText(projeto.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>
                          {projeto.total_beneficiarias}
                          {projeto.meta_beneficiarias && (
                            <>/{projeto.meta_beneficiarias}</>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${projeto.percentual_conclusao || 0}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {projeto.percentual_conclusao || 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => navigate(`/projetos/${projeto.id}`)}
                          >
                            <Target className="mr-2 h-4 w-4" />
                            Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/projetos/${projeto.id}/participantes`)
                            }
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Participantes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/projetos/${projeto.id}/atividades`)
                            }
                          >
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Atividades
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/projetos/${projeto.id}/editar`)}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleExcluir(projeto.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {projetos?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      <p className="text-muted-foreground">
                        Nenhum projeto encontrado
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
