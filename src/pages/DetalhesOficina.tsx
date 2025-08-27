import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useOficina, 
  useOficinaResumo, 
  useOficinaParticipantes,
  useOficinaPresencas,
  useAddParticipante,
  useRemoveParticipante,
  useMarcarPresenca 
} from '@/hooks/useOficinas';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
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
  Users,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Download,
  User,
  Target,
  PlusCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BeneficiariaSelection } from '@/components/BeneficiariaSelection';
import { Loading } from '@/components/ui/loading';

export function DetalhesOficina() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [addParticipanteOpen, setAddParticipanteOpen] = useState(false);
  
  const { data: oficina, isLoading: loadingOficina } = useOficina(Number(id));
  const { data: resumo } = useOficinaResumo(Number(id));
  const { data: participantes } = useOficinaParticipantes(Number(id));
  const { data: presencas } = useOficinaPresencas(
    Number(id), 
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
  );

  const addParticipante = useAddParticipante(Number(id));
  const removeParticipante = useRemoveParticipante(Number(id));
  const marcarPresenca = useMarcarPresenca(Number(id));

  const handleAddParticipante = (beneficiariaId: number) => {
    addParticipante.mutate({ beneficiaria_id: beneficiariaId });
    setAddParticipanteOpen(false);
  };

  const handleRemoveParticipante = (beneficiariaId: number) => {
    if (confirm('Tem certeza que deseja remover esta participante?')) {
      removeParticipante.mutate(beneficiariaId);
    }
  };

  const handleTogglePresenca = (beneficiariaId: number, presente: boolean) => {
    if (!selectedDate) return;
    marcarPresenca.mutate({
      beneficiariaId,
      data: format(selectedDate, 'yyyy-MM-dd'),
      presente
    });
  };

  const getStatusColor = (status: string, vagas_totais: number, vagas_ocupadas: number = 0) => {
    if (status === 'inativa' || status === 'pausada') return 'bg-red-100 text-red-800';
    if (status === 'concluida') return 'bg-primary/10 text-primary';
    if (vagas_ocupadas >= vagas_totais) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (status: string, vagas_totais: number, vagas_ocupadas: number = 0) => {
    if (status === 'inativa') return 'Inativa';
    if (status === 'pausada') return 'Pausada';
    if (status === 'concluida') return 'Concluída';
    if (status === 'ativa' && vagas_ocupadas >= vagas_totais) return 'Lotada';
    return 'Ativa';
  };

  if (loadingOficina) {
    return <Loading message="Carregando detalhes da oficina..." />;
  }

  if (!oficina) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="text-lg font-semibold mb-2">Oficina não encontrada</h3>
          <p className="text-muted-foreground text-center mb-4">
            A oficina que você está procurando não existe ou foi removida.
          </p>
          <Button onClick={() => navigate('/oficinas')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar para Oficinas
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/oficinas')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{oficina.nome}</h1>
            <p className="text-muted-foreground">
              {oficina.descricao || 'Sem descrição disponível'}
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(oficina.status, oficina.vagas_totais, oficina.vagas_ocupadas)}>
          {getStatusText(oficina.status, oficina.vagas_totais, oficina.vagas_ocupadas)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informações da Oficina */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Oficina</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {format(parseISO(oficina.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                    {oficina.data_fim && (
                      <> até {format(parseISO(oficina.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {oficina.horario_inicio} às {oficina.horario_fim}
                  </span>
                </div>

                {oficina.instrutor && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{oficina.instrutor}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {oficina.projeto_nome && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>{oficina.projeto_nome}</span>
                  </div>
                )}

                {oficina.local && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{oficina.local}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{oficina.vagas_ocupadas || 0}/{oficina.vagas_totais} vagas</span>
                </div>
              </div>
            </div>

            {/* Resumo */}
            {resumo && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-2">Resumo da Oficina</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Aulas</p>
                    <p className="text-2xl font-semibold">{resumo.total_aulas}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Média de Presença</p>
                    <p className="text-2xl font-semibold">{resumo.media_presenca}%</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendário e Controle de Presença */}
        <Card>
          <CardHeader>
            <CardTitle>Controle de Presença</CardTitle>
            <CardDescription>
              Selecione uma data para gerenciar as presenças
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[auto,1fr] gap-4">
              <div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                  disabled={(date) => {
                    const inicio = parseISO(oficina.data_inicio);
                    const fim = oficina.data_fim ? parseISO(oficina.data_fim) : undefined;
                    return date < inicio || (fim ? date > fim : false);
                  }}
                />
              </div>

              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-base">
                    {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participante</TableHead>
                        <TableHead className="w-[100px] text-center">Presença</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participantes?.map((participante) => (
                        <TableRow key={participante.id}>
                          <TableCell>{participante.nome_completo}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTogglePresenca(participante.id, true)}
                                className={presencas?.find(p => 
                                  p.beneficiaria_id === participante.id && p.presente
                                ) ? 'text-green-600' : ''}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTogglePresenca(participante.id, false)}
                                className={presencas?.find(p => 
                                  p.beneficiaria_id === participante.id && !p.presente
                                ) ? 'text-red-600' : ''}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Participantes */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Participantes</CardTitle>
                <CardDescription>
                  {participantes?.length || 0} participantes inscritos
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.open(`/api/oficinas/${id}/relatorio-presencas`)}>
                  <Download className="mr-2 h-4 w-4" />
                  Relatório de Presenças
                </Button>
                <Button onClick={() => setAddParticipanteOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Participante
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Data de Inscrição</TableHead>
                  <TableHead>% Presença</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participantes?.map((participante) => (
                  <TableRow key={participante.id}>
                    <TableCell>{participante.nome_completo}</TableCell>
                    <TableCell>{participante.cpf}</TableCell>
                    <TableCell>{participante.telefone}</TableCell>
                    <TableCell>
                      {format(parseISO(participante.data_inscricao), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${participante.percentual_presenca}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {participante.percentual_presenca}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveParticipante(participante.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal para adicionar participante */}
      <Dialog open={addParticipanteOpen} onOpenChange={setAddParticipanteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Participante</DialogTitle>
            <DialogDescription>
              Selecione uma beneficiária para adicionar à oficina
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
