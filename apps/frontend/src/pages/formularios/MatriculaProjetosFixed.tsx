import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, GraduationCap, Calendar, User, MapPin, Clock, CheckCircle, AlertCircle, BookOpen, Loader2 } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { MatriculaProjeto, ElegibilidadeResult } from '@/types/shared';

export default function MatriculaProjetosFixed() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [beneficiaria, setBeneficiaria] = useState<any>(null);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dados' | 'elegibilidade' | 'compromissos' | 'complementares'>('dados');
  const [elegibilidadeChecked, setElegibilidadeChecked] = useState(false);
  const [elegibilidadeResult, setElegibilidadeResult] = useState<ElegibilidadeResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [matriculaData, setMatriculaData] = useState<Partial<MatriculaProjeto>>({
    beneficiaria_id: parseInt(id || '0'),
    data_matricula: new Date().toISOString().split('T')[0],
    data_inicio_prevista: new Date().toISOString().split('T')[0],
    disponibilidade_horarios: [],
    possui_dependentes: false,
    necessita_auxilio_transporte: false,
    necessita_auxilio_alimentacao: false,
    necessita_cuidado_criancas: false,
    atende_criterios_idade: true,
    atende_criterios_renda: true,
    atende_criterios_genero: true,
    atende_criterios_territorio: true,
    atende_criterios_vulnerabilidade: true,
    termo_compromisso_assinado: false,
    frequencia_minima_aceita: false,
    regras_convivencia_aceitas: false,
    participacao_atividades_aceita: false,
    avaliacao_periodica_aceita: false,
    status_matricula: 'pendente',
    profissional_matricula: 'Sistema'
  });

  const horariosDisponiveis = [
    'Segunda-feira manhã',
    'Segunda-feira tarde',
    'Terça-feira manhã',
    'Terça-feira tarde',
    'Quarta-feira manhã',
    'Quarta-feira tarde',
    'Quinta-feira manhã',
    'Quinta-feira tarde',
    'Sexta-feira manhã',
    'Sexta-feira tarde',
    'Sábado manhã',
    'Sábado tarde'
  ];

  useEffect(() => {
    if (id) {
      carregarDadosIniciais();
    }
  }, [id]);

  const carregarDadosIniciais = async () => {
    setCarregandoDados(true);
    try {
      await Promise.all([
        carregarBeneficiaria(),
        carregarProjetos()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    } finally {
      setCarregandoDados(false);
    }
  };

  const carregarBeneficiaria = async () => {
    try {
      console.log('Carregando beneficiária com ID:', id);
      const response = await apiService.getBeneficiaria(id!);
      if (response.success) {
        setBeneficiaria(response.data);
        console.log('Beneficiária carregada:', response.data);
      } else {
        setErrors(prev => ({ ...prev, beneficiaria: 'Erro ao carregar dados da beneficiária' }));
      }
    } catch (error) {
      console.error('Erro ao carregar beneficiária:', error);
      setErrors(prev => ({ ...prev, beneficiaria: 'Erro ao carregar dados da beneficiária' }));
    }
  };

  const carregarProjetos = async () => {
    try {
      console.log('Carregando projetos...');
      const response = await apiService.getProjetos();
      if (response.success) {
        const projetosAtivos = response.data.filter((p: any) => p.status === 'ativo');
        setProjetos(projetosAtivos);
        console.log(`${projetosAtivos.length} projetos ativos carregados`);
      } else {
        setErrors(prev => ({ ...prev, projetos: 'Erro ao carregar projetos' }));
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      setErrors(prev => ({ ...prev, projetos: 'Erro ao carregar projetos' }));
    }
  };

  const verificarElegibilidadeAutomatica = async (projetoId: number) => {
    try {
      if (!id) return;
      
      console.log('Verificando elegibilidade para projeto:', projetoId);
      const response = await apiService.verificarElegibilidade({
        beneficiaria_id: parseInt(id),
        projeto_id: projetoId
      });

      if (response.success) {
        setElegibilidadeResult(response.data);
        setElegibilidadeChecked(true);
        console.log('Resultado da elegibilidade:', response.data);

        // Se não for elegível, mostrar aviso
        if (!response.data.elegivel) {
          const motivos = response.data.motivos.join('; ');
          setErrors(prev => ({ ...prev, elegibilidade: motivos }));
        } else {
          setErrors(prev => ({ ...prev, elegibilidade: '' }));
        }
      }
    } catch (error) {
      console.error('Erro ao verificar elegibilidade:', error);
      setErrors(prev => ({ ...prev, elegibilidade: 'Erro ao verificar elegibilidade' }));
    }
  };

  const handleHorarioChange = (horario: string, checked: boolean) => {
    const horarios = matriculaData.disponibilidade_horarios || [];
    if (checked) {
      setMatriculaData({
        ...matriculaData,
        disponibilidade_horarios: [...horarios, horario]
      });
    } else {
      setMatriculaData({
        ...matriculaData,
        disponibilidade_horarios: horarios.filter(h => h !== horario)
      });
    }
  };

  const validarFormulario = () => {
    const novosErros: Record<string, string> = {};

    if (!matriculaData.projeto_id) {
      novosErros.projeto_id = 'Selecione um projeto';
    }

    if (!matriculaData.motivacao_participacao?.trim()) {
      novosErros.motivacao_participacao = 'Motivação é obrigatória';
    }

    if (!matriculaData.expectativas?.trim()) {
      novosErros.expectativas = 'Expectativas são obrigatórias';
    }

    const todosCompromissosAceitos = matriculaData.termo_compromisso_assinado &&
      matriculaData.frequencia_minima_aceita &&
      matriculaData.regras_convivencia_aceitas &&
      matriculaData.participacao_atividades_aceita &&
      matriculaData.avaliacao_periodica_aceita;

    if (!todosCompromissosAceitos) {
      novosErros.compromissos = 'Todos os compromissos devem ser aceitos';
    }

    if (elegibilidadeResult && !elegibilidadeResult.elegivel) {
      novosErros.elegibilidade = 'Beneficiária não atende aos critérios de elegibilidade';
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvarMatricula = async () => {
    if (!validarFormulario()) {
      // Mostrar primeiro erro encontrado
      const primeiroErro = Object.values(errors)[0];
      if (primeiroErro) {
        alert(primeiroErro);
      }
      return;
    }

    try {
      setLoading(true);
      console.log('Enviando dados de matrícula:', matriculaData);
      
      const response = await apiService.createMatricula(matriculaData);

      console.log('Resposta da matrícula:', response);

      if (response.success) {
        alert('✅ Matrícula realizada com sucesso!');
        navigate(`/beneficiarias/${id}`);
      } else {
        const errorMessage = response.data?.error || 'Erro desconhecido';
        alert('❌ Erro ao salvar matrícula: ' + errorMessage);
      }
    } catch (error: any) {
      console.error('Erro ao salvar matrícula:', error);
      
      let errorMessage = 'Erro ao salvar matrícula';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 409) {
        errorMessage = 'Beneficiária já possui matrícula neste projeto';
      } else if (error.response?.status === 404) {
        errorMessage = 'Beneficiária ou projeto não encontrado';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Dados da matrícula inválidos';
      }
      
      alert('❌ ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const verificarElegibilidade = () => {
    const criterios = [
      matriculaData.atende_criterios_idade,
      matriculaData.atende_criterios_renda,
      matriculaData.atende_criterios_genero,
      matriculaData.atende_criterios_territorio,
      matriculaData.atende_criterios_vulnerabilidade
    ];
    
    return criterios.every(criterio => criterio === true);
  };

  const generatePAEDI = (beneficiaria: any) => {
    if (!beneficiaria) return 'N/A';
    const dataCriacao = new Date(beneficiaria.data_cadastro || beneficiaria.data_criacao);
    const ano = dataCriacao.getFullYear().toString().slice(-2);
    const mes = (dataCriacao.getMonth() + 1).toString().padStart(2, '0');
    const sequence = beneficiaria.id.toString().padStart(3, '0').slice(-3);
    return `${ano}${mes}${sequence}`;
  };

  if (carregandoDados) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(`/beneficiarias/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              Matrícula em Projetos
            </h1>
            {beneficiaria && (
              <p className="text-muted-foreground">
                {beneficiaria.nome_completo} • CPF: {beneficiaria.cpf} • PAEDI: {generatePAEDI(beneficiaria)}
              </p>
            )}
            {!beneficiaria && errors.beneficiaria && (
              <p className="text-red-500 text-sm">{errors.beneficiaria}</p>
            )}
          </div>
        </div>

        {/* Alertas de Erro Globais */}
        {errors.projetos && (
          <div className="p-4 border-l-4 border-red-500 bg-red-50">
            <p className="text-red-700">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              {errors.projetos}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <Button
            variant={activeTab === 'dados' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('dados')}
            className="flex-1"
          >
            <User className="h-4 w-4 mr-2" />
            Dados
          </Button>
          <Button
            variant={activeTab === 'elegibilidade' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('elegibilidade')}
            className="flex-1"
          >
            <CheckCircle className={`h-4 w-4 mr-2 ${verificarElegibilidade() ? 'text-green-500' : 'text-red-500'}`} />
            Elegibilidade
          </Button>
          <Button
            variant={activeTab === 'compromissos' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('compromissos')}
            className="flex-1"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Compromissos
          </Button>
          <Button
            variant={activeTab === 'complementares' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('complementares')}
            className="flex-1"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Complementares
          </Button>
        </div>

        {/* Dados da Matrícula */}
        {activeTab === 'dados' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Projeto e Datas</CardTitle>
                <CardDescription>
                  Selecione o projeto e defina as datas ({projetos.length} {projetos.length === 1 ? 'projeto disponível' : 'projetos disponíveis'})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Projeto *</Label>
                  {projetos.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-lg text-center">
                      <p className="text-muted-foreground">
                        Nenhum projeto ativo encontrado. 
                        <br />
                        Entre em contato com a administração para verificar os projetos disponíveis.
                      </p>
                    </div>
                  ) : (
                    <Select
                      value={matriculaData.projeto_id?.toString() || ''}
                      onValueChange={(value) => {
                        const projetoId = parseInt(value);
                        setMatriculaData({...matriculaData, projeto_id: projetoId});
                        verificarElegibilidadeAutomatica(projetoId);
                      }}
                    >
                      <SelectTrigger className={errors.projeto_id ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Selecione o projeto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projetos.map(projeto => (
                          <SelectItem key={projeto.id} value={projeto.id.toString()}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{projeto.nome}</span>
                              {projeto.descricao && (
                                <span className="text-xs text-muted-foreground mt-1">
                                  {projeto.descricao.length > 60 ? 
                                    `${projeto.descricao.substring(0, 60)}...` : 
                                    projeto.descricao
                                  }
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.projeto_id && <p className="text-red-500 text-sm">{errors.projeto_id}</p>}
                  
                  {/* Informações do projeto selecionado */}
                  {matriculaData.projeto_id && projetos.find(p => p.id === matriculaData.projeto_id) && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      {(() => {
                        const projeto = projetos.find(p => p.id === matriculaData.projeto_id);
                        return projeto ? (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-blue-900">{projeto.nome}</h4>
                            {projeto.descricao && (
                              <p className="text-sm text-blue-700">{projeto.descricao}</p>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-600">
                              {projeto.data_inicio && (
                                <div>
                                  <strong>Início:</strong> {new Date(projeto.data_inicio).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                              {projeto.data_fim && (
                                <div>
                                  <strong>Fim:</strong> {new Date(projeto.data_fim).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                              {projeto.responsavel_nome && (
                                <div>
                                  <strong>Responsável:</strong> {projeto.responsavel_nome}
                                </div>
                              )}
                              {projeto.localizacao && (
                                <div>
                                  <strong>Local:</strong> {projeto.localizacao}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Data da Matrícula</Label>
                    <Input
                      type="date"
                      value={matriculaData.data_matricula || ''}
                      onChange={(e) => setMatriculaData({...matriculaData, data_matricula: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Início Previsto</Label>
                    <Input
                      type="date"
                      value={matriculaData.data_inicio_prevista || ''}
                      onChange={(e) => setMatriculaData({...matriculaData, data_inicio_prevista: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conclusão Prevista</Label>
                    <Input
                      type="date"
                      value={matriculaData.data_conclusao_prevista || ''}
                      onChange={(e) => setMatriculaData({...matriculaData, data_conclusao_prevista: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Situação Social e Familiar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Situação Social e Familiar</Label>
                  <Textarea
                    placeholder="Descreva a situação social e familiar atual..."
                    value={matriculaData.situacao_social_familiar || ''}
                    onChange={(e) => setMatriculaData({...matriculaData, situacao_social_familiar: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Escolaridade Atual</Label>
                    <Input
                      placeholder="Ex: Ensino Médio Completo"
                      value={matriculaData.escolaridade_atual || ''}
                      onChange={(e) => setMatriculaData({...matriculaData, escolaridade_atual: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Experiência Profissional</Label>
                    <Input
                      placeholder="Resumo da experiência profissional"
                      value={matriculaData.experiencia_profissional || ''}
                      onChange={(e) => setMatriculaData({...matriculaData, experiencia_profissional: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Motivação e Expectativas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Motivação para Participação *</Label>
                  <Textarea
                    placeholder="Por que deseja participar deste projeto?"
                    value={matriculaData.motivacao_participacao || ''}
                    onChange={(e) => setMatriculaData({...matriculaData, motivacao_participacao: e.target.value})}
                    rows={4}
                    className={errors.motivacao_participacao ? 'border-red-500' : ''}
                  />
                  {errors.motivacao_participacao && <p className="text-red-500 text-sm">{errors.motivacao_participacao}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Expectativas *</Label>
                  <Textarea
                    placeholder="O que espera aprender/conquistar com este projeto?"
                    value={matriculaData.expectativas || ''}
                    onChange={(e) => setMatriculaData({...matriculaData, expectativas: e.target.value})}
                    rows={4}
                    className={errors.expectativas ? 'border-red-500' : ''}
                  />
                  {errors.expectativas && <p className="text-red-500 text-sm">{errors.expectativas}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Como conheceu o projeto?</Label>
                  <Input
                    placeholder="Ex: Divulgação nas redes sociais, indicação, etc."
                    value={matriculaData.como_conheceu_projeto || ''}
                    onChange={(e) => setMatriculaData({...matriculaData, como_conheceu_projeto: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Disponibilidade de Horários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {horariosDisponiveis.map((horario, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        id={`horario-${index}`}
                        checked={(matriculaData.disponibilidade_horarios || []).includes(horario)}
                        onCheckedChange={(checked) => handleHorarioChange(horario, !!checked)}
                      />
                      <Label htmlFor={`horario-${index}`} className="text-sm">
                        {horario}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Elegibilidade */}
        {activeTab === 'elegibilidade' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className={`h-5 w-5 ${verificarElegibilidade() ? 'text-green-500' : 'text-red-500'}`} />
                Critérios de Elegibilidade
              </CardTitle>
              <CardDescription>
                Verifique se a beneficiária atende aos critérios do projeto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="criterio_idade"
                    checked={matriculaData.atende_criterios_idade}
                    onCheckedChange={(checked) => setMatriculaData({...matriculaData, atende_criterios_idade: !!checked})}
                  />
                  <Label htmlFor="criterio_idade">Atende aos critérios de idade</Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="criterio_renda"
                    checked={matriculaData.atende_criterios_renda}
                    onCheckedChange={(checked) => setMatriculaData({...matriculaData, atende_criterios_renda: !!checked})}
                  />
                  <Label htmlFor="criterio_renda">Atende aos critérios de renda</Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="criterio_genero"
                    checked={matriculaData.atende_criterios_genero}
                    onCheckedChange={(checked) => setMatriculaData({...matriculaData, atende_criterios_genero: !!checked})}
                  />
                  <Label htmlFor="criterio_genero">Atende aos critérios de gênero</Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="criterio_territorio"
                    checked={matriculaData.atende_criterios_territorio}
                    onCheckedChange={(checked) => setMatriculaData({...matriculaData, atende_criterios_territorio: !!checked})}
                  />
                  <Label htmlFor="criterio_territorio">Atende aos critérios de território</Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="criterio_vulnerabilidade"
                    checked={matriculaData.atende_criterios_vulnerabilidade}
                    onCheckedChange={(checked) => setMatriculaData({...matriculaData, atende_criterios_vulnerabilidade: !!checked})}
                  />
                  <Label htmlFor="criterio_vulnerabilidade">Atende aos critérios de vulnerabilidade</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações sobre Elegibilidade</Label>
                <Textarea
                  placeholder="Observações sobre o atendimento aos critérios..."
                  value={matriculaData.observacoes_elegibilidade || ''}
                  onChange={(e) => setMatriculaData({...matriculaData, observacoes_elegibilidade: e.target.value})}
                  rows={3}
                />
              </div>

              {!verificarElegibilidade() && (
                <div className="p-4 border-l-4 border-red-500 bg-red-50">
                  <p className="text-red-700">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    A beneficiária não atende a todos os critérios de elegibilidade.
                  </p>
                </div>
              )}

              {elegibilidadeResult && !elegibilidadeResult.elegivel && (
                <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
                  <p className="text-yellow-700 font-medium mb-2">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    Problemas de Elegibilidade Detectados:
                  </p>
                  <ul className="text-sm text-yellow-600 space-y-1">
                    {elegibilidadeResult.motivos.map((motivo: string, index: number) => (
                      <li key={index}>• {motivo}</li>
                    ))}
                  </ul>
                </div>
              )}

              {elegibilidadeResult?.matricula_existente && (
                <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                  <p className="text-blue-700">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    Esta beneficiária já possui uma matrícula neste projeto (Status: {elegibilidadeResult.matricula_existente.status_matricula}).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Compromissos */}
        {activeTab === 'compromissos' && (
          <Card>
            <CardHeader>
              <CardTitle>Termos de Compromisso</CardTitle>
              <CardDescription>
                A beneficiária deve aceitar todos os compromissos para completar a matrícula
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="termo_compromisso"
                    checked={matriculaData.termo_compromisso_assinado}
                    onCheckedChange={(checked) => setMatriculaData({...matriculaData, termo_compromisso_assinado: !!checked})}
                  />
                  <div>
                    <Label htmlFor="termo_compromisso" className="font-medium">
                      Termo de Compromisso Assinado
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Li e concordo com todos os termos e condições do projeto.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="frequencia_minima"
                    checked={matriculaData.frequencia_minima_aceita}
                    onCheckedChange={(checked) => setMatriculaData({...matriculaData, frequencia_minima_aceita: !!checked})}
                  />
                  <div>
                    <Label htmlFor="frequencia_minima" className="font-medium">
                      Frequência Mínima
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Comprometo-me a manter frequência mínima de 75% nas atividades.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="regras_convivencia"
                    checked={matriculaData.regras_convivencia_aceitas}
                    onCheckedChange={(checked) => setMatriculaData({...matriculaData, regras_convivencia_aceitas: !!checked})}
                  />
                  <div>
                    <Label htmlFor="regras_convivencia" className="font-medium">
                      Regras de Convivência
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Aceito e me comprometo a seguir as regras de convivência do projeto.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="participacao_atividades"
                    checked={matriculaData.participacao_atividades_aceita}
                    onCheckedChange={(checked) => setMatriculaData({...matriculaData, participacao_atividades_aceita: !!checked})}
                  />
                  <div>
                    <Label htmlFor="participacao_atividades" className="font-medium">
                      Participação Ativa
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Comprometo-me a participar ativamente de todas as atividades propostas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="avaliacao_periodica"
                    checked={matriculaData.avaliacao_periodica_aceita}
                    onCheckedChange={(checked) => setMatriculaData({...matriculaData, avaliacao_periodica_aceita: !!checked})}
                  />
                  <div>
                    <Label htmlFor="avaliacao_periodica" className="font-medium">
                      Avaliação Periódica
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Aceito participar das avaliações periódicas de progresso.
                    </p>
                  </div>
                </div>
              </div>

              {errors.compromissos && (
                <div className="p-4 border-l-4 border-red-500 bg-red-50">
                  <p className="text-red-700">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    {errors.compromissos}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dados Complementares */}
        {activeTab === 'complementares' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Necessidades Especiais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="possui_dependentes"
                      checked={matriculaData.possui_dependentes}
                      onCheckedChange={(checked) => setMatriculaData({...matriculaData, possui_dependentes: !!checked})}
                    />
                    <Label htmlFor="possui_dependentes">Possui dependentes (filhos menores, idosos, etc.)</Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="auxilio_transporte"
                      checked={matriculaData.necessita_auxilio_transporte}
                      onCheckedChange={(checked) => setMatriculaData({...matriculaData, necessita_auxilio_transporte: !!checked})}
                    />
                    <Label htmlFor="auxilio_transporte">Necessita auxílio transporte</Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="auxilio_alimentacao"
                      checked={matriculaData.necessita_auxilio_alimentacao}
                      onCheckedChange={(checked) => setMatriculaData({...matriculaData, necessita_auxilio_alimentacao: !!checked})}
                    />
                    <Label htmlFor="auxilio_alimentacao">Necessita auxílio alimentação</Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="cuidado_criancas"
                      checked={matriculaData.necessita_cuidado_criancas}
                      onCheckedChange={(checked) => setMatriculaData({...matriculaData, necessita_cuidado_criancas: !!checked})}
                    />
                    <Label htmlFor="cuidado_criancas">Necessita cuidado para crianças durante as atividades</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informações de Saúde</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Medicamentos de Uso Contínuo</Label>
                  <Textarea
                    placeholder="Liste medicamentos de uso contínuo (se houver)..."
                    value={matriculaData.medicamentos_uso_continuo || ''}
                    onChange={(e) => setMatriculaData({...matriculaData, medicamentos_uso_continuo: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Alergias e Restrições</Label>
                  <Textarea
                    placeholder="Descreva alergias alimentares, medicamentosas ou outras restrições..."
                    value={matriculaData.alergias_restricoes || ''}
                    onChange={(e) => setMatriculaData({...matriculaData, alergias_restricoes: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Condições Especiais</Label>
                  <Textarea
                    placeholder="Outras condições especiais que devem ser consideradas..."
                    value={matriculaData.condicoes_especiais || ''}
                    onChange={(e) => setMatriculaData({...matriculaData, condicoes_especiais: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pessoas de Referência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Contatos de Emergência/Referência</Label>
                  <Textarea
                    placeholder="Nome, parentesco e telefone de pessoas que podem ser contactadas em caso de emergência..."
                    value={matriculaData.pessoas_referencias || ''}
                    onChange={(e) => setMatriculaData({...matriculaData, pessoas_referencias: e.target.value})}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observações do Profissional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Profissional Responsável pela Matrícula</Label>
                  <Input
                    placeholder="Nome do profissional"
                    value={matriculaData.profissional_matricula || ''}
                    onChange={(e) => setMatriculaData({...matriculaData, profissional_matricula: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações Profissionais</Label>
                  <Textarea
                    placeholder="Observações do profissional sobre a matrícula..."
                    value={matriculaData.observacoes_profissional || ''}
                    onChange={(e) => setMatriculaData({...matriculaData, observacoes_profissional: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status da Matrícula</Label>
                  <Select
                    value={matriculaData.status_matricula || 'pendente'}
                    onValueChange={(value: any) => setMatriculaData({...matriculaData, status_matricula: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente de Aprovação</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                      <SelectItem value="reprovada">Reprovada</SelectItem>
                      <SelectItem value="lista_espera">Lista de Espera</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {matriculaData.status_matricula !== 'pendente' && (
                  <div className="space-y-2">
                    <Label>Motivo/Observações do Status</Label>
                    <Textarea
                      placeholder="Explique o motivo da aprovação/reprovação/lista de espera..."
                      value={matriculaData.motivo_status || ''}
                      onChange={(e) => setMatriculaData({...matriculaData, motivo_status: e.target.value})}
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <Button 
                    onClick={salvarMatricula} 
                    disabled={
                      loading || 
                      !verificarElegibilidade() || 
                      (elegibilidadeResult && !elegibilidadeResult.elegivel)
                    }
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Confirmar Matrícula
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
