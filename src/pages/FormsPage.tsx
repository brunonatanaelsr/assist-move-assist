import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForms, useExcluirForm, usePublicarForm, useArquivarForm } from '@/hooks/useForms';
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
  Copy,
  Eye,
  FileSpreadsheet,
  Archive,
  CheckCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loading } from '@/components/ui/loading';

export function FormsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data: forms, isLoading } = useForms({
    status: status as 'draft' | 'published' | 'archived' | undefined,
    search
  });

  const excluirForm = useExcluirForm();
  const publicarForm = usePublicarForm(0); // ID será setado ao chamar
  const arquivarForm = useArquivarForm(0); // ID será setado ao chamar

  const handleExcluir = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este formulário?')) {
      excluirForm.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Rascunho';
      case 'published':
        return 'Publicado';
      case 'archived':
        return 'Arquivado';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Formulários</h1>
        <Button onClick={() => navigate('/forms/novo')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Formulário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Formulários</CardTitle>
          <CardDescription>
            Crie e gerencie formulários personalizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar formulários..."
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
                <SelectItem value="draft">Rascunhos</SelectItem>
                <SelectItem value="published">Publicados</SelectItem>
                <SelectItem value="archived">Arquivados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          {isLoading ? (
            <Loading message="Carregando formulários..." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submissões</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms?.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{form.title}</p>
                        {form.description && (
                          <p className="text-sm text-muted-foreground">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(form.created_at), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(form.status)}>
                        {getStatusText(form.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{form.submission_count}</span>
                        {form.max_submissions && (
                          <span className="text-sm text-muted-foreground">
                            /{form.max_submissions}
                          </span>
                        )}
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
                            onClick={() => navigate(`/forms/${form.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/forms/${form.id}/editar`)}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/forms/${form.id}/submissoes`)}
                          >
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Submissões
                          </DropdownMenuItem>
                          {form.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => publicarForm.mutate(form.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Publicar
                            </DropdownMenuItem>
                          )}
                          {form.status === 'published' && (
                            <DropdownMenuItem
                              onClick={() => arquivarForm.mutate(form.id)}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Arquivar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => navigate(`/forms/${form.id}/duplicar`)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleExcluir(form.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {(!forms || forms.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      <p className="text-muted-foreground">
                        Nenhum formulário encontrado
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
