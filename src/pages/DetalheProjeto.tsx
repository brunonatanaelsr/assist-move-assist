import { useParams, useNavigate } from 'react-router-dom';
import { 
  useProjeto, 
  useProjetoResumo, 
  useProjetoParticipantes,
  useProjetoAtividades,
  useGerarRelatorio 
} from '@/hooks/useProjetos';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  ChevronLeft,
  Download,
  Edit2,
  Users,
  Target,
  CalendarRange,
  Calendar,
  DollarSign,
  ClipboardList,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loading } from '@/components/ui/loading';

export function DetalheProjeto() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: projeto, isLoading: loadingProjeto } = useProjeto(Number(id));
  const { data: resumo } = useProjetoResumo(Number(id));
  const { data: participantes } = useProjetoParticipantes(Number(id));
  const { data: atividades } = useProjetoAtividades(Number(id));
  const gerarRelatorio = useGerarRelatorio(Number(id));

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

  const getAtividadeStatusColor = (status: string) => {
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

  const getAtividadeStatusText = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'em_andamento':
        return 'Em Andamento';
      case 'concluida':
        return 'Concluída';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  if (loadingProjeto) {
    return <Loading message="Carregando detalhes do projeto..." />;
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
            onClick={() => navigate('/projetos')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{projeto.nome}</h1>
            <p className="text-muted-foreground">
              {projeto.descricao || 'Sem descrição disponível'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(projeto.status)}>
            {getStatusText(projeto.status)}
          </Badge>
          <Button variant="outline" onClick={() => gerarRelatorio.mutate()}>
            <Download className="mr-2 h-4 w-4" />
            Relatório
          </Button>
          <Button onClick={() => navigate(`/projetos/${id}/editar`)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>Objetivo:</span>
                </div>
                <p>{projeto.objetivo}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Responsável:</span>
                </div>
                <p>{projeto.responsavel_nome}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Data Início:</span>
                </div>
                <p>
                  {format(parseISO(projeto.data_inicio), 'dd/MM/yyyy', {
                    locale: ptBR,
                  })}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarRange className="h-4 w-4" />
                  <span>Data Fim:</span>
                </div>
                <p>
                  {projeto.data_fim
                    ? format(parseISO(projeto.data_fim), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })
                    : 'Não definida'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Orçamento:</span>
                </div>
                <p>
                  {projeto.orcamento
                    ? projeto.orcamento.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    : 'Não definido'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Meta Beneficiárias:</span>
                </div>
                <p>
                  {projeto.meta_beneficiarias
                    ? `${projeto.total_beneficiarias}/${projeto.meta_beneficiarias}`
                    : projeto.total_beneficiarias}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo/Métricas */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {resumo ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Conclusão Geral</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${resumo.percentual_conclusao}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {resumo.percentual_conclusao}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Orçamento Utilizado</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${resumo.percentual_orcamento}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {resumo.percentual_orcamento}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Atividades</p>
                    <p className="text-2xl font-semibold">{resumo.total_atividades}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Oficinas</p>
                    <p className="text-2xl font-semibold">{resumo.total_oficinas}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Atividades Pendentes</p>
                    <p className="text-2xl font-semibold">{resumo.atividades_pendentes}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Atividades Concluídas</p>
                    <p className="text-2xl font-semibold">{resumo.atividades_concluidas}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma informação disponível
              </p>
            )}
          </CardContent>
        </Card>

        {/* Participantes Recentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Participantes</CardTitle>
                <CardDescription>
                  {participantes?.length || 0} participantes no total
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(`/projetos/${id}/participantes`)}
              >
                <Users className="mr-2 h-4 w-4" />
                Ver Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data Entrada</TableHead>
                  <TableHead>Atividades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participantes?.slice(0, 5).map((participante) => (
                  <TableRow key={participante.id}>
                    <TableCell>{participante.nome_completo}</TableCell>
                    <TableCell>
                      {format(parseISO(participante.data_entrada), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
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
                  </TableRow>
                ))}
                {(!participantes || participantes.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      <p className="text-muted-foreground">
                        Nenhum participante cadastrado
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Atividades Recentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Atividades Recentes</CardTitle>
                <CardDescription>
                  {atividades?.length || 0} atividades no total
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(`/projetos/${id}/atividades`)}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Ver Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atividades?.slice(0, 5).map((atividade) => (
                  <TableRow key={atividade.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{atividade.titulo}</p>
                        <p className="text-sm text-muted-foreground">
                          {atividade.tipo}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(atividade.data_inicio), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getAtividadeStatusColor(atividade.status)}>
                        {getAtividadeStatusText(atividade.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!atividades || atividades.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      <p className="text-muted-foreground">
                        Nenhuma atividade cadastrada
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
