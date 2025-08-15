import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Eye, Target, TrendingUp, AlertCircle, CheckCircle, Brain, Heart, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiFetch } from '@/lib/api';

interface VisaoHolistica {
  beneficiaria_id: number;
  data_avaliacao: string;
  
  // Dimensões da Visão Holística
  saude_fisica: {
    nivel: number;
    observacoes: string;
    principais_desafios: string;
    potencialidades: string;
  };
  saude_mental: {
    nivel: number;
    observacoes: string;
    principais_desafios: string;
    potencialidades: string;
  };
  relacionamentos: {
    nivel: number;
    observacoes: string;
    principais_desafios: string;
    potencialidades: string;
  };
  educacao_aprendizagem: {
    nivel: number;
    observacoes: string;
    principais_desafios: string;
    potencialidades: string;
  };
  trabalho_carreira: {
    nivel: number;
    observacoes: string;
    principais_desafios: string;
    potencialidades: string;
  };
  situacao_financeira: {
    nivel: number;
    observacoes: string;
    principais_desafios: string;
    potencialidades: string;
  };
  habitacao_moradia: {
    nivel: number;
    observacoes: string;
    principais_desafios: string;
    potencialidades: string;
  };
  seguranca_protecao: {
    nivel: number;
    observacoes: string;
    principais_desafios: string;
    potencialidades: string;
  };

  // Síntese e Planejamento
  pontos_fortes_gerais: string;
  areas_prioritarias_desenvolvimento: string;
  objetivos_curto_prazo: string;
  objetivos_medio_prazo: string;
  objetivos_longo_prazo: string;
  estrategias_intervencao: string;
  recursos_necessarios: string;
  apoios_identificados: string;
  
  // Avaliação do Profissional
  avaliacao_complexidade: 'baixa' | 'media' | 'alta';
  nivel_autonomia: number;
  potencial_desenvolvimento: number;
  motivacao_mudanca: number;
  suporte_familiar_social: number;
  
  observacoes_profissional: string;
  recomendacoes_encaminhamentos: string;
  data_proxima_avaliacao: string;
  profissional_responsavel: string;
}

export default function VisaoHolistica() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [beneficiaria, setBeneficiaria] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dimensoes' | 'sintese' | 'profissional'>('dimensoes');
  
  const [visaoData, setVisaoData] = useState<Partial<VisaoHolistica>>({
    beneficiaria_id: parseInt(id || '0'),
    data_avaliacao: new Date().toISOString().split('T')[0],
    profissional_responsavel: 'Usuário Logado',
    saude_fisica: { nivel: 5, observacoes: '', principais_desafios: '', potencialidades: '' },
    saude_mental: { nivel: 5, observacoes: '', principais_desafios: '', potencialidades: '' },
    relacionamentos: { nivel: 5, observacoes: '', principais_desafios: '', potencialidades: '' },
    educacao_aprendizagem: { nivel: 5, observacoes: '', principais_desafios: '', potencialidades: '' },
    trabalho_carreira: { nivel: 5, observacoes: '', principais_desafios: '', potencialidades: '' },
    situacao_financeira: { nivel: 5, observacoes: '', principais_desafios: '', potencialidades: '' },
    habitacao_moradia: { nivel: 5, observacoes: '', principais_desafios: '', potencialidades: '' },
    seguranca_protecao: { nivel: 5, observacoes: '', principais_desafios: '', potencialidades: '' },
    avaliacao_complexidade: 'media',
    nivel_autonomia: 5,
    potencial_desenvolvimento: 5,
    motivacao_mudanca: 5,
    suporte_familiar_social: 5
  });

  const dimensoes = [
    { key: 'saude_fisica', label: 'Saúde Física', icon: Heart, color: 'text-red-500' },
    { key: 'saude_mental', label: 'Saúde Mental', icon: Brain, color: 'text-purple-500' },
    { key: 'relacionamentos', label: 'Relacionamentos', icon: Users, color: 'text-blue-500' },
    { key: 'educacao_aprendizagem', label: 'Educação e Aprendizagem', icon: Target, color: 'text-green-500' },
    { key: 'trabalho_carreira', label: 'Trabalho e Carreira', icon: TrendingUp, color: 'text-orange-500' },
    { key: 'situacao_financeira', label: 'Situação Financeira', icon: Target, color: 'text-yellow-600' },
    { key: 'habitacao_moradia', label: 'Habitação e Moradia', icon: Target, color: 'text-indigo-500' },
    { key: 'seguranca_protecao', label: 'Segurança e Proteção', icon: Target, color: 'text-pink-500' }
  ];

  useEffect(() => {
    if (id) {
      carregarBeneficiaria();
    }
  }, [id]);

  const carregarBeneficiaria = async () => {
    try {
      const response = await apiFetch(`/api/beneficiarias/${id}`);
      if (response.success) {
        setBeneficiaria(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar beneficiária:', error);
    }
  };

  const salvarVisaoHolistica = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/visao-holistica', {
        method: 'POST',
        body: JSON.stringify(visaoData)
      });

      if (response.success) {
        alert('Visão Holística salva com sucesso!');
        navigate(`/beneficiarias/${id}`);
      }
    } catch (error) {
      console.error('Erro ao salvar visão holística:', error);
      alert('Erro ao salvar visão holística');
    } finally {
      setLoading(false);
    }
  };

  const updateDimensao = (dimensao: string, field: string, value: any) => {
    setVisaoData({
      ...visaoData,
      [dimensao]: {
        ...visaoData[dimensao as keyof VisaoHolistica],
        [field]: value
      }
    });
  };

  const getNivelColor = (nivel: number) => {
    if (nivel <= 3) return 'text-red-500';
    if (nivel <= 6) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getNivelText = (nivel: number) => {
    if (nivel <= 3) return 'Baixo';
    if (nivel <= 6) return 'Médio';
    return 'Alto';
  };

  const generatePAEDI = (beneficiaria: any) => {
    if (!beneficiaria) return 'N/A';
    const dataCriacao = new Date(beneficiaria.data_cadastro || beneficiaria.data_criacao);
    const ano = dataCriacao.getFullYear().toString().slice(-2);
    const mes = (dataCriacao.getMonth() + 1).toString().padStart(2, '0');
    const sequence = beneficiaria.id.toString().padStart(3, '0').slice(-3);
    return `${ano}${mes}${sequence}`;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(`/beneficiarias/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-6 w-6" />
              Visão Holística
            </h1>
            {beneficiaria && (
              <p className="text-muted-foreground">
                {beneficiaria.nome_completo} • CPF: {beneficiaria.cpf} • PAEDI: {generatePAEDI(beneficiaria)}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <Button
            variant={activeTab === 'dimensoes' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('dimensoes')}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            Dimensões da Vida
          </Button>
          <Button
            variant={activeTab === 'sintese' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('sintese')}
            className="flex-1"
          >
            <Target className="h-4 w-4 mr-2" />
            Síntese e Planejamento
          </Button>
          <Button
            variant={activeTab === 'profissional' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('profissional')}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Avaliação Profissional
          </Button>
        </div>

        {/* Dimensões da Vida */}
        {activeTab === 'dimensoes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dimensoes.map((dimensao) => {
              const Icon = dimensao.icon;
              const data = visaoData[dimensao.key as keyof VisaoHolistica] as any;
              
              return (
                <Card key={dimensao.key}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${dimensao.color}`}>
                      <Icon className="h-5 w-5" />
                      {dimensao.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nível Atual: {data?.nivel || 5}/10</Label>
                      <div className="px-2">
                        <Slider
                          value={[data?.nivel || 5]}
                          onValueChange={([value]) => updateDimensao(dimensao.key, 'nivel', value)}
                          max={10}
                          min={1}
                          step={1}
                        />
                      </div>
                      <p className={`text-sm font-medium ${getNivelColor(data?.nivel || 5)}`}>
                        {getNivelText(data?.nivel || 5)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea
                        placeholder={`Observações sobre ${dimensao.label.toLowerCase()}...`}
                        value={data?.observacoes || ''}
                        onChange={(e) => updateDimensao(dimensao.key, 'observacoes', e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Principais Desafios</Label>
                      <Textarea
                        placeholder="Identifique os principais desafios nesta área..."
                        value={data?.principais_desafios || ''}
                        onChange={(e) => updateDimensao(dimensao.key, 'principais_desafios', e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Potencialidades</Label>
                      <Textarea
                        placeholder="Identifique as potencialidades e pontos fortes..."
                        value={data?.potencialidades || ''}
                        onChange={(e) => updateDimensao(dimensao.key, 'potencialidades', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Síntese e Planejamento */}
        {activeTab === 'sintese' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Síntese Geral</CardTitle>
                <CardDescription>
                  Análise integrada de todas as dimensões avaliadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pontos Fortes Gerais</Label>
                  <Textarea
                    placeholder="Descreva os principais pontos fortes identificados em todas as dimensões..."
                    value={visaoData.pontos_fortes_gerais || ''}
                    onChange={(e) => setVisaoData({...visaoData, pontos_fortes_gerais: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Áreas Prioritárias para Desenvolvimento</Label>
                  <Textarea
                    placeholder="Identifique as áreas que necessitam maior atenção e desenvolvimento..."
                    value={visaoData.areas_prioritarias_desenvolvimento || ''}
                    onChange={(e) => setVisaoData({...visaoData, areas_prioritarias_desenvolvimento: e.target.value})}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Planejamento de Objetivos</CardTitle>
                <CardDescription>
                  Definição de objetivos por período temporal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Objetivos de Curto Prazo (até 6 meses)</Label>
                  <Textarea
                    placeholder="Liste os objetivos a serem alcançados nos próximos 6 meses..."
                    value={visaoData.objetivos_curto_prazo || ''}
                    onChange={(e) => setVisaoData({...visaoData, objetivos_curto_prazo: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Objetivos de Médio Prazo (6 meses a 2 anos)</Label>
                  <Textarea
                    placeholder="Liste os objetivos a serem alcançados entre 6 meses e 2 anos..."
                    value={visaoData.objetivos_medio_prazo || ''}
                    onChange={(e) => setVisaoData({...visaoData, objetivos_medio_prazo: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Objetivos de Longo Prazo (acima de 2 anos)</Label>
                  <Textarea
                    placeholder="Liste os objetivos de longo prazo..."
                    value={visaoData.objetivos_longo_prazo || ''}
                    onChange={(e) => setVisaoData({...visaoData, objetivos_longo_prazo: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estratégias de Intervenção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Estratégias de Intervenção</Label>
                  <Textarea
                    placeholder="Descreva as estratégias e metodologias a serem utilizadas..."
                    value={visaoData.estrategias_intervencao || ''}
                    onChange={(e) => setVisaoData({...visaoData, estrategias_intervencao: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recursos Necessários</Label>
                  <Textarea
                    placeholder="Liste os recursos materiais, humanos e institucionais necessários..."
                    value={visaoData.recursos_necessarios || ''}
                    onChange={(e) => setVisaoData({...visaoData, recursos_necessarios: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Apoios Identificados</Label>
                  <Textarea
                    placeholder="Identifique os apoios disponíveis (família, comunidade, serviços, etc.)..."
                    value={visaoData.apoios_identificados || ''}
                    onChange={(e) => setVisaoData({...visaoData, apoios_identificados: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Avaliação Profissional */}
        {activeTab === 'profissional' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Avaliação de Complexidade</CardTitle>
                <CardDescription>
                  Análise profissional da complexidade do caso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Complexidade do Caso</Label>
                  <Select
                    value={visaoData.avaliacao_complexidade || 'media'}
                    onValueChange={(value: any) => setVisaoData({...visaoData, avaliacao_complexidade: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa Complexidade</SelectItem>
                      <SelectItem value="media">Média Complexidade</SelectItem>
                      <SelectItem value="alta">Alta Complexidade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Nível de Autonomia: {visaoData.nivel_autonomia}/10</Label>
                    <Slider
                      value={[visaoData.nivel_autonomia || 5]}
                      onValueChange={([value]) => setVisaoData({...visaoData, nivel_autonomia: value})}
                      max={10}
                      min={1}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Potencial de Desenvolvimento: {visaoData.potencial_desenvolvimento}/10</Label>
                    <Slider
                      value={[visaoData.potencial_desenvolvimento || 5]}
                      onValueChange={([value]) => setVisaoData({...visaoData, potencial_desenvolvimento: value})}
                      max={10}
                      min={1}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Motivação para Mudança: {visaoData.motivacao_mudanca}/10</Label>
                    <Slider
                      value={[visaoData.motivacao_mudanca || 5]}
                      onValueChange={([value]) => setVisaoData({...visaoData, motivacao_mudanca: value})}
                      max={10}
                      min={1}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Suporte Familiar/Social: {visaoData.suporte_familiar_social}/10</Label>
                    <Slider
                      value={[visaoData.suporte_familiar_social || 5]}
                      onValueChange={([value]) => setVisaoData({...visaoData, suporte_familiar_social: value})}
                      max={10}
                      min={1}
                      step={1}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observações e Recomendações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Observações Profissionais</Label>
                  <Textarea
                    placeholder="Observações técnicas e impressões profissionais sobre o caso..."
                    value={visaoData.observacoes_profissional || ''}
                    onChange={(e) => setVisaoData({...visaoData, observacoes_profissional: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recomendações e Encaminhamentos</Label>
                  <Textarea
                    placeholder="Recomendações específicas e encaminhamentos necessários..."
                    value={visaoData.recomendacoes_encaminhamentos || ''}
                    onChange={(e) => setVisaoData({...visaoData, recomendacoes_encaminhamentos: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data da Próxima Avaliação</Label>
                    <Input
                      type="date"
                      value={visaoData.data_proxima_avaliacao || ''}
                      onChange={(e) => setVisaoData({...visaoData, data_proxima_avaliacao: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Profissional Responsável</Label>
                    <Input
                      placeholder="Nome do profissional"
                      value={visaoData.profissional_responsavel || ''}
                      onChange={(e) => setVisaoData({...visaoData, profissional_responsavel: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={salvarVisaoHolistica} disabled={loading} size="lg">
                <CheckCircle className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Visão Holística'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
