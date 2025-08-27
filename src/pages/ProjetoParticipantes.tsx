import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useProjeto,
  useProjetoParticipantes,
  useAddParticipante,
  useRemoveParticipante
} from '@/hooks/useProjetos';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft,
  Plus,
  Search,
  Trash2,
  ClipboardList,
  CheckCircle,
  Users,
  Phone,
  Mail
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loading } from '@/components/ui/loading';
import { BeneficiariaSelection } from '@/components/BeneficiariaSelection';

export function ProjetoParticipantes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [addParticipanteOpen, setAddParticipanteOpen] = useState(false);

  const { data: projeto, isLoading: loadingProjeto } = useProjeto(Number(id));
  const { data: participantes, isLoading: loadingParticipantes } = 
    useProjetoParticipantes(Number(id));

  const addParticipante = useAddParticipante(Number(id));
  const removeParticipante = useRemoveParticipante(Number(id));

  const filteredParticipantes = participantes?.filter(
    (participante) =>
      participante.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
      (participante.cpf && participante.cpf.includes(search))
  );

  const handleAddParticipante = (beneficiariaId: number) => {
    addParticipante.mutate(beneficiariaId);
    setAddParticipanteOpen(false);
  };

  const handleRemoveParticipante = (beneficiariaId: number) => {
    if (confirm('Tem certeza que deseja remover esta participante?')) {
      removeParticipante.mutate(beneficiariaId);
    }
  };

  if (loadingProjeto || loadingParticipantes) {
    return <Loading message="Carregando participantes do projeto..." />;
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
            <h1 className="text-3xl font-bold">Participantes do Projeto</h1>
            <p className="text-muted-foreground">{projeto.nome}</p>
          </div>
        </div>
        <Button onClick={() => setAddParticipanteOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Participante
        </Button>
      </div>

      {/* Lista de Participantes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Participantes</CardTitle>
          <CardDescription>
            Gerencie as participantes do projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Busca */}
          <div className="mb-6">
            <Input
              placeholder="Buscar por nome ou CPF..."
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
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Data Entrada</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipantes?.map((participante) => (
                <TableRow key={participante.id}>
                  <TableCell>{participante.nome_completo}</TableCell>
                  <TableCell>{participante.cpf}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {participante.telefone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {participante.telefone}
                        </div>
                      )}
                      {participante.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {participante.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(parseISO(participante.data_entrada), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          participante.status === 'ativo'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <span className="text-sm">
                        {participante.status === 'ativo' ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${
                              (participante.atividades_concluidas /
                                participante.total_atividades) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {participante.atividades_concluidas}/
                        {participante.total_atividades}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleRemoveParticipante(participante.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredParticipantes || filteredParticipantes.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    <p className="text-muted-foreground">
                      Nenhuma participante encontrada
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal para adicionar participante */}
      <Dialog open={addParticipanteOpen} onOpenChange={setAddParticipanteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Participante</DialogTitle>
            <DialogDescription>
              Selecione uma beneficiária para adicionar ao projeto
            </DialogDescription>
          </DialogHeader>
          
          <BeneficiariaSelection
            onSelect={handleAddParticipante}
            excludeIds={participantes?.map(p => p.id)}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddParticipanteOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
