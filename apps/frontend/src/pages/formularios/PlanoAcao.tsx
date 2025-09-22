import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target, Plus, Trash2, Calendar, User, CheckCircle, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiService } from '@/services/apiService';
import { toast } from 'sonner';

interface Acao {
  id?: number;
  descricao: string;
  objetivo_especifico: string;
  prazo: string;
  responsavel: string;
  recursos_necessarios: string;
  indicadores_sucesso: string;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  prioridade: 'baixa' | 'media' | 'alta';
  observacoes: string;
  data_inicio?: string;
  data_conclusao?: string;
}

interface PlanoAcao {
  beneficiaria_id: number;
  titulo: string;
  objetivo_geral: string;
  data_elaboracao: string;
  data_inicio: string;
  data_prevista_conclusao: string;
  situacao_atual: string;
  resultados_esperados: string;
  
  acoes: Acao[];
  
  // Acompanhamento
  frequencia_monitoramento: 'semanal' | 'quinzenal' | 'mensal' | 'bimestral';
  criterios_avaliacao: string;
  indicadores_gerais: string;
  
  // Responsáveis
  profissional_responsavel: string;
  equipe_envolvida: string;
  participacao_beneficiaria: string;
  
  // Observações
  observacoes_gerais: string;
  revisao_necessaria: boolean;
  data_proxima_revisao: string;
}

export default function PlanoAcao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const beneficiariaId = parseInt(id || '0', 10);
  const formIdParam = searchParams.get('formId');
  const initialFormId = formIdParam ? Number(formIdParam) : null;
  const [loading, setLoading] = useState(false);
  const [beneficiaria, setBeneficiaria] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'planejamento' | 'acoes' | 'monitoramento'>('planejamento');
  const [currentFormId, setCurrentFormId] = useState<number | null>(initialFormId);
  const [history, setHistory] = useState<Array<{ id: number; created_at?: string; status?: string; usuario_id?: number }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const getDefaultPlanoData = useCallback((): Partial<PlanoAcao> => ({
    beneficiaria_id: beneficiariaId,
    data_elaboracao: new Date().toISOString().split('T')[0],
    data_inicio: new Date().toISOString().split('T')[0],
    acoes: [],
    frequencia_monitoramento: 'mensal',
    profissional_responsavel: 'Usuário Logado',
    revisao_necessaria: false,
  }), [beneficiariaId]);

  const [planoData, setPlanoData] = useState<Partial<PlanoAcao>>(() => getDefaultPlanoData());
  const currentStatus = useMemo(() => {
    if (!currentFormId) return undefined;
    return history.find(item => item.id === currentFormId)?.status;
  }, [currentFormId, history]);

  const carregarBeneficiaria = async () => {
    try {
      const response = await apiService.getBeneficiaria(id!);
      if (response.success) {
        setBeneficiaria(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar beneficiária:', error);
    }
  };

  const carregarHistorico = useCallback(async () => {
    if (!beneficiariaId) return;
    try {
      setHistoryLoading(true);
      const response = await apiService.listFormularios({
        tipo: 'plano_acao',
        beneficiaria_id: beneficiariaId,
        limit: 50,
      });
      if (response.success && response.data) {
        const registros = response.data.data || response.data;
        setHistory(Array.isArray(registros) ? registros : []);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de planos:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [beneficiariaId]);

  const carregarPlano = useCallback(async (formId: number) => {
    try {
      setLoading(true);
      const response = await apiService.getFormulario('plano_acao', formId);
      if (response.success && response.data) {
        const dados = response.data.dados || {};
        setPlanoData({
          ...getDefaultPlanoData(),
          ...dados,
          beneficiaria_id: response.data.beneficiaria_id || beneficiariaId,
          acoes: Array.isArray(dados.acoes) ? dados.acoes : [],
        });
      } else {
        toast.error('Plano de ação não encontrado');
        setPlanoData(getDefaultPlanoData());
        setSearchParams({}, { replace: true });
      }
    } catch (error) {
      console.error('Erro ao carregar plano de ação:', error);
      toast.error('Erro ao carregar plano de ação');
    } finally {
      setLoading(false);
    }
  }, [beneficiariaId, getDefaultPlanoData, setSearchParams]);

  const handleNovoPlano = () => {
    setSearchParams({}, { replace: true });
    setCurrentFormId(null);
    setPlanoData(getDefaultPlanoData());
    toast('Criando um novo plano de ação');
  };

  const handleSelecionarHistorico = (formId: number) => {
    setSearchParams({ formId: String(formId) }, { replace: true });
    setCurrentFormId(formId);
    void carregarPlano(formId);
  };

  const adicionarAcao = () => {
    const novaAcao: Acao = {
      descricao: '',
      objetivo_especifico: '',
      prazo: '',
      responsavel: '',
      recursos_necessarios: '',
      indicadores_sucesso: '',
      status: 'pendente',
      prioridade: 'media',
      observacoes: ''
    };

    setPlanoData({
      ...planoData,
      acoes: [...(planoData.acoes || []), novaAcao]
    });
  };

  const removerAcao = (index: number) => {
    const acoes = [...(planoData.acoes || [])];
    acoes.splice(index, 1);
    setPlanoData({ ...planoData, acoes });
  };

  const updateAcao = (index: number, field: keyof Acao, value: any) => {
    const acoes = [...(planoData.acoes || [])];
    acoes[index] = { ...acoes[index], [field]: value };
    setPlanoData({ ...planoData, acoes });
  };

  const salvarPlanoAcao = async () => {
    if (!planoData.titulo || !planoData.objetivo_geral || (planoData.acoes || []).length === 0) {
      toast.error('Preencha título, objetivo geral e adicione pelo menos uma ação');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        beneficiaria_id: beneficiariaId,
        dados: {
          ...planoData,
          beneficiaria_id: beneficiariaId,
        },
        status: 'completo',
      };

      if (currentFormId) {
        const response = await apiService.updateFormulario('plano_acao', currentFormId, {
          dados: payload.dados,
          status: payload.status,
          observacoes: (planoData as any)?.observacoes_gerais,
        });
        if (response.success) {
          toast.success('Plano de ação atualizado com sucesso');
          await carregarHistorico();
          return;
        }
        toast.error(response.message || 'Não foi possível atualizar o plano');
        return;
      }

      const response = await apiService.createFormulario('plano_acao', payload);
      if (response.success && response.data) {
        const novoId = response.data.id;
        toast.success('Plano de ação criado com sucesso');
        setSearchParams(novoId ? { formId: String(novoId) } : {}, { replace: true });
        setCurrentFormId(novoId || null);
        await carregarHistorico();
        return;
      }

      toast.error(response.message || 'Não foi possível criar o plano');
    } catch (error) {
      console.error('Erro ao salvar plano de ação:', error);
      toast.error('Erro ao salvar plano de ação');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluida': return 'text-green-500';
      case 'em_andamento': return 'text-blue-500';
      case 'cancelada': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'border-red-200 bg-red-50';
      case 'baixa': return 'border-green-200 bg-green-50';
      default: return 'border-yellow-200 bg-yellow-50';
    }
  };

  const generatePAEDI = (beneficiaria: any) => {
    if (!beneficiaria) return 'N/A';
    const dataCriacao = new Date(beneficiaria.data_cadastro || beneficiaria.data_criacao);
    const ano = dataCriacao.getFullYear().toString().slice(-2);
    const mes = (dataCriacao.getMonth() + 1).toString().padStart(2, '0');
    const sequence = beneficiaria.id.toString().padStart(3, '0').slice(-3);
    return `${ano}${mes}${sequence}`;
  };

  useEffect(() => {
    if (id) {
      void carregarBeneficiaria();
    }
  }, [id]);

  useEffect(() => {
    const param = searchParams.get('formId');
    setCurrentFormId(param ? Number(param) : null);
  }, [searchParams]);

  useEffect(() => {
    void carregarHistorico();
  }, [carregarHistorico]);

  useEffect(() => {
    if (currentFormId) {
      void carregarPlano(currentFormId);
    } else {
      setPlanoData(getDefaultPlanoData());
    }
  }, [currentFormId, carregarPlano, getDefaultPlanoData]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(`/beneficiarias/${id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Target className="h-6 w-6" />
                Plano de Ação Individual
              </h1>
              {beneficiaria && (
                <p className="text-muted-foreground">
                  {beneficiaria.nome_completo} • CPF: {beneficiaria.cpf} • PAEDI: {generatePAEDI(beneficiaria)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentFormId && <Badge variant="outline">Plano #{currentFormId}</Badge>}
            {currentStatus && <Badge variant="outline" className="uppercase">{currentStatus}</Badge>}
            <Button variant="secondary" onClick={handleNovoPlano} disabled={loading}>
              Novo plano
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <Button
            variant={activeTab === 'planejamento' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('planejamento')}
            className="flex-1"
          >
            <Target className="h-4 w-4 mr-2" />
            Planejamento
          </Button>
          <Button
            variant={activeTab === 'acoes' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('acoes')}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Ações
          </Button>
          <Button
            variant={activeTab === 'monitoramento' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('monitoramento')}
            className="flex-1"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Monitoramento
          </Button>
        </div>

        {/* Planejamento */}
        {activeTab === 'planejamento' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
                <CardDescription>
                  Dados básicos do plano de ação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título do Plano de Ação</Label>
                  <Input
                    id="titulo"
                    placeholder="Ex: Plano de Empoderamento e Autonomia Financeira"
                    value={planoData.titulo || ''}
                    onChange={(e) => setPlanoData({...planoData, titulo: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objetivo_geral">Objetivo Geral</Label>
                  <Textarea
                    id="objetivo_geral"
                    placeholder="Descreva o objetivo principal deste plano de ação..."
                    value={planoData.objetivo_geral || ''}
                    onChange={(e) => setPlanoData({...planoData, objetivo_geral: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_inicio">Data de Início</Label>
                    <Input
                      id="data_inicio"
                      type="date"
                      value={planoData.data_inicio || ''}
                      onChange={(e) => setPlanoData({...planoData, data_inicio: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_prevista">Data Prevista de Conclusão</Label>
                    <Input
                      id="data_prevista"
                      type="date"
                      value={planoData.data_prevista_conclusao || ''}
                      onChange={(e) => setPlanoData({...planoData, data_prevista_conclusao: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profissional">Profissional Responsável</Label>
                    <Input
                      id="profissional"
                      placeholder="Nome do profissional"
                      value={planoData.profissional_responsavel || ''}
                      onChange={(e) => setPlanoData({...planoData, profissional_responsavel: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Diagnóstico e Resultados Esperados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="situacao_atual">Situação Atual</Label>
                  <Textarea
                    id="situacao_atual"
                    placeholder="Descreva a situação atual da beneficiária..."
                    value={planoData.situacao_atual || ''}
                    onChange={(e) => setPlanoData({...planoData, situacao_atual: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resultados_esperados">Resultados Esperados</Label>
                  <Textarea
                    id="resultados_esperados"
                    placeholder="Descreva os resultados que se espera alcançar com este plano..."
                    value={planoData.resultados_esperados || ''}
                    onChange={(e) => setPlanoData({...planoData, resultados_esperados: e.target.value})}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Equipe e Participação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="equipe_envolvida">Equipe Envolvida</Label>
                  <Textarea
                    id="equipe_envolvida"
                    placeholder="Liste os profissionais e pessoas envolvidas na execução do plano..."
                    value={planoData.equipe_envolvida || ''}
                    onChange={(e) => setPlanoData({...planoData, equipe_envolvida: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="participacao_beneficiaria">Participação da Beneficiária</Label>
                  <Textarea
                    id="participacao_beneficiaria"
                    placeholder="Descreva como a beneficiária participará da execução do plano..."
                    value={planoData.participacao_beneficiaria || ''}
                    onChange={(e) => setPlanoData({...planoData, participacao_beneficiaria: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ações */}
        {activeTab === 'acoes' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Ações do Plano</CardTitle>
                  <CardDescription>
                    Defina as ações específicas para alcançar os objetivos
                  </CardDescription>
                </div>
                <Button onClick={adicionarAcao} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Ação
                </Button>
              </CardHeader>
              <CardContent>
                {(planoData.acoes || []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma ação adicionada ainda. Clique em "Adicionar Ação" para começar.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {(planoData.acoes || []).map((acao, index) => (
                      <Card key={index} className={`${getPrioridadeColor(acao.prioridade)}`}>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle className="text-lg">Ação {index + 1}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Select
                              value={acao.prioridade}
                              onValueChange={(value) => updateAcao(index, 'prioridade', value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="baixa">Baixa</SelectItem>
                                <SelectItem value="media">Média</SelectItem>
                                <SelectItem value="alta">Alta</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removerAcao(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Descrição da Ação</Label>
                            <Textarea
                              placeholder="Descreva detalhadamente a ação a ser executada..."
                              value={acao.descricao}
                              onChange={(e) => updateAcao(index, 'descricao', e.target.value)}
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Objetivo Específico</Label>
                            <Textarea
                              placeholder="Qual é o objetivo específico desta ação?"
                              value={acao.objetivo_especifico}
                              onChange={(e) => updateAcao(index, 'objetivo_especifico', e.target.value)}
                              rows={2}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Prazo</Label>
                              <Input
                                type="date"
                                value={acao.prazo}
                                onChange={(e) => updateAcao(index, 'prazo', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Responsável</Label>
                              <Input
                                placeholder="Quem será responsável?"
                                value={acao.responsavel}
                                onChange={(e) => updateAcao(index, 'responsavel', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <Select
                                value={acao.status}
                                onValueChange={(value) => updateAcao(index, 'status', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendente">Pendente</SelectItem>
                                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                  <SelectItem value="concluida">Concluída</SelectItem>
                                  <SelectItem value="cancelada">Cancelada</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Recursos Necessários</Label>
                            <Textarea
                              placeholder="Que recursos são necessários para executar esta ação?"
                              value={acao.recursos_necessarios}
                              onChange={(e) => updateAcao(index, 'recursos_necessarios', e.target.value)}
                              rows={2}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Indicadores de Sucesso</Label>
                            <Textarea
                              placeholder="Como saberemos que esta ação foi bem-sucedida?"
                              value={acao.indicadores_sucesso}
                              onChange={(e) => updateAcao(index, 'indicadores_sucesso', e.target.value)}
                              rows={2}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                              placeholder="Observações adicionais sobre esta ação..."
                              value={acao.observacoes}
                              onChange={(e) => updateAcao(index, 'observacoes', e.target.value)}
                              rows={2}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Monitoramento */}
        {activeTab === 'monitoramento' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sistema de Monitoramento</CardTitle>
                <CardDescription>
                  Defina como o plano será monitorado e avaliado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequencia">Frequência de Monitoramento</Label>
                    <Select
                      value={planoData.frequencia_monitoramento || 'mensal'}
                      onValueChange={(value: any) => setPlanoData({...planoData, frequencia_monitoramento: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="bimestral">Bimestral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_proxima_revisao">Próxima Revisão</Label>
                    <Input
                      id="data_proxima_revisao"
                      type="date"
                      value={planoData.data_proxima_revisao || ''}
                      onChange={(e) => setPlanoData({...planoData, data_proxima_revisao: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="criterios_avaliacao">Critérios de Avaliação</Label>
                  <Textarea
                    id="criterios_avaliacao"
                    placeholder="Descreva os critérios que serão utilizados para avaliar o progresso..."
                    value={planoData.criterios_avaliacao || ''}
                    onChange={(e) => setPlanoData({...planoData, criterios_avaliacao: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="indicadores_gerais">Indicadores Gerais de Sucesso</Label>
                  <Textarea
                    id="indicadores_gerais"
                    placeholder="Liste os indicadores gerais que demonstrarão o sucesso do plano..."
                    value={planoData.indicadores_gerais || ''}
                    onChange={(e) => setPlanoData({...planoData, indicadores_gerais: e.target.value})}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observações e Revisões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="observacoes_gerais">Observações Gerais</Label>
                  <Textarea
                    id="observacoes_gerais"
                    placeholder="Observações gerais sobre o plano de ação..."
                    value={planoData.observacoes_gerais || ''}
                    onChange={(e) => setPlanoData({...planoData, observacoes_gerais: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
                  <Checkbox
                    id="revisao_necessaria"
                    checked={planoData.revisao_necessaria}
                    onCheckedChange={(checked) => setPlanoData({...planoData, revisao_necessaria: !!checked})}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="revisao_necessaria" className="text-sm font-medium">
                      Revisão Necessária
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Marque se este plano necessita de revisão antes da data programada.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={salvarPlanoAcao} disabled={loading} size="lg">
                    <Target className="h-4 w-4 mr-2" />
                    {loading ? 'Salvando...' : 'Salvar Plano de Ação'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
          </div>
          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de PAEDI</CardTitle>
                <CardDescription>Selecione um plano anterior para revisar ou editar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full" onClick={handleNovoPlano} disabled={loading}>
                  Criar novo plano
                </Button>
                {historyLoading && <p className="text-sm text-muted-foreground">Carregando histórico...</p>}
                {!historyLoading && history.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum plano registrado ainda.</p>
                )}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {history.map(item => (
                    <Button
                      key={item.id}
                      variant={item.id === currentFormId ? 'default' : 'ghost'}
                      className="w-full justify-between"
                      onClick={() => handleSelecionarHistorico(item.id)}
                    >
                      <span className="text-left">
                        <span className="block text-sm font-medium">Plano #{item.id}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : 'Sem data'}
                        </span>
                      </span>
                      {item.status && (
                        <Badge variant="outline" className="uppercase text-[10px]">
                          {item.status}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
