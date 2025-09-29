import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Target, TrendingUp, Heart, Home, Users, Briefcase, GraduationCap, Smile } from 'lucide-react';
import { apiService, formulariosApi } from '@/services/apiService';

interface RodaVidaData {
  beneficiaria_id: number;
  // Áreas da roda da vida (escala 0-10)
  saude_fisica: number;
  saude_mental: number;
  relacionamentos_familiares: number;
  relacionamentos_amigos: number;
  vida_amorosa: number;
  carreira_profissional: number;
  financas: number;
  crescimento_pessoal: number;
  lazer_diversao: number;
  contribuicao_social: number;
  espiritualidade: number;
  moradia_ambiente: number;
  
  // Reflexões sobre cada área
  reflexoes_saude_fisica: string;
  reflexoes_saude_mental: string;
  reflexoes_relacionamentos: string;
  reflexoes_carreira: string;
  reflexoes_financas: string;
  reflexoes_crescimento: string;
  reflexoes_outras: string;
  
  // Prioridades e metas
  areas_prioritarias: string[];
  metas_curto_prazo: string;
  metas_medio_prazo: string;
  metas_longo_prazo: string;
  
  observacoes: string;
  data_preenchimento: string;
  responsavel_preenchimento: string;
}

const areasRodaVida = [
  { key: 'saude_fisica', label: 'Saúde Física', icon: Heart, color: '#ef4444' },
  { key: 'saude_mental', label: 'Saúde Mental', icon: Smile, color: '#8b5cf6' },
  { key: 'relacionamentos_familiares', label: 'Família', icon: Home, color: '#f59e0b' },
  { key: 'relacionamentos_amigos', label: 'Amizades', icon: Users, color: '#10b981' },
  { key: 'vida_amorosa', label: 'Vida Amorosa', icon: Heart, color: '#ec4899' },
  { key: 'carreira_profissional', label: 'Carreira', icon: Briefcase, color: '#3b82f6' },
  { key: 'financas', label: 'Finanças', icon: TrendingUp, color: '#06b6d4' },
  { key: 'crescimento_pessoal', label: 'Crescimento Pessoal', icon: GraduationCap, color: '#84cc16' },
  { key: 'lazer_diversao', label: 'Lazer e Diversão', icon: Smile, color: '#f97316' },
  { key: 'contribuicao_social', label: 'Contribuição Social', icon: Users, color: '#6366f1' },
  { key: 'espiritualidade', label: 'Espiritualidade', icon: Target, color: '#a855f7' },
  { key: 'moradia_ambiente', label: 'Moradia e Ambiente', icon: Home, color: '#059669' }
];

export default function RodaVida() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [beneficiaria, setBeneficiaria] = useState<any>(null);
  const [formData, setFormData] = useState<Partial<RodaVidaData>>({
    beneficiaria_id: parseInt(id || '0'),
    // Inicializar todas as áreas com 5 (neutro)
    saude_fisica: 5,
    saude_mental: 5,
    relacionamentos_familiares: 5,
    relacionamentos_amigos: 5,
    vida_amorosa: 5,
    carreira_profissional: 5,
    financas: 5,
    crescimento_pessoal: 5,
    lazer_diversao: 5,
    contribuicao_social: 5,
    espiritualidade: 5,
    moradia_ambiente: 5,
    areas_prioritarias: [],
    data_preenchimento: new Date().toISOString(),
    responsavel_preenchimento: 'Usuário Logado'
  });

  useEffect(() => {
    if (id) {
      carregarBeneficiaria();
      carregarRodaVida();
    }
  }, [id]);

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

  const carregarRodaVida = async () => {
    try {
      const response = await apiService.get(`/formularios/roda-vida/${id}`);
      if (response.success && response.data) {
        setFormData(response.data);
      }
    } catch (error) {
      console.log('Roda da Vida não encontrada, criando nova');
    }
  };

  const salvarRodaVida = async () => {
    try {
      setLoading(true);
      const response = await formulariosApi.createFormulario('roda-vida', formData);

      if (response.success) {
        navigate(`/beneficiarias/${id}`);
      }
    } catch (error) {
      console.error('Erro ao salvar roda da vida:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 3) return 'text-red-500';
    if (score <= 6) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getScoreBackground = (score: number) => {
    if (score <= 3) return 'bg-red-50';
    if (score <= 6) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  const calcularMedia = () => {
    const scores = areasRodaVida.map(area => formData[area.key as keyof RodaVidaData] as number || 0);
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
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
              <Target className="h-6 w-6" />
              Roda da Vida
            </h1>
            {beneficiaria && (
              <p className="text-muted-foreground">
                {beneficiaria.nome_completo} • CPF: {beneficiaria.cpf}
              </p>
            )}
          </div>
        </div>

        {/* Resumo */}
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
            <CardDescription>
              Avalie cada área da sua vida numa escala de 0 (muito insatisfeito) a 10 (muito satisfeito)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {calcularMedia()}
              </div>
              <p className="text-sm text-muted-foreground">Média Geral</p>
            </div>
          </CardContent>
        </Card>

        {/* Áreas da Roda da Vida */}
        <div className="grid gap-6 md:grid-cols-2">
          {areasRodaVida.map((area) => {
            const score = formData[area.key as keyof RodaVidaData] as number || 0;
            const IconComponent = area.icon;
            
            return (
              <Card key={area.key} className={`${getScoreBackground(score)} border-l-4`} style={{ borderLeftColor: area.color }}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <IconComponent className="h-5 w-5" style={{ color: area.color }} />
                    {area.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Nível de Satisfação</Label>
                      <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                        {score}
                      </span>
                    </div>
                    <Slider
                      value={[score]}
                      onValueChange={([value]) => setFormData({
                        ...formData,
                        [area.key]: value
                      })}
                      max={10}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0 - Muito Insatisfeito</span>
                      <span>10 - Muito Satisfeito</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`reflexao_${area.key}`}>Por que você deu essa nota?</Label>
                    <Textarea
                      id={`reflexao_${area.key}`}
                      placeholder={`Reflita sobre sua satisfação com ${area.label.toLowerCase()}...`}
                      value={(formData as any)[`reflexoes_${area.key.split('_')[0]}`] || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        [`reflexoes_${area.key.split('_')[0]}`]: e.target.value
                      })}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Reflexões Gerais */}
        <Card>
          <CardHeader>
            <CardTitle>Reflexões e Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reflexoes_relacionamentos">Relacionamentos</Label>
              <Textarea
                id="reflexoes_relacionamentos"
                placeholder="Como você se sente em relação aos seus relacionamentos em geral?"
                value={formData.reflexoes_relacionamentos || ''}
                onChange={(e) => setFormData({...formData, reflexoes_relacionamentos: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reflexoes_carreira">Carreira e Trabalho</Label>
              <Textarea
                id="reflexoes_carreira"
                placeholder="O que você pensa sobre sua vida profissional atual e futura?"
                value={formData.reflexoes_carreira || ''}
                onChange={(e) => setFormData({...formData, reflexoes_carreira: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reflexoes_financas">Finanças</Label>
              <Textarea
                id="reflexoes_financas"
                placeholder="Como você avalia sua situação financeira?"
                value={formData.reflexoes_financas || ''}
                onChange={(e) => setFormData({...formData, reflexoes_financas: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reflexoes_crescimento">Crescimento Pessoal</Label>
              <Textarea
                id="reflexoes_crescimento"
                placeholder="O que você tem feito para seu desenvolvimento pessoal?"
                value={formData.reflexoes_crescimento || ''}
                onChange={(e) => setFormData({...formData, reflexoes_crescimento: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reflexoes_outras">Outras Reflexões</Label>
              <Textarea
                id="reflexoes_outras"
                placeholder="Outras reflexões importantes sobre sua vida..."
                value={formData.reflexoes_outras || ''}
                onChange={(e) => setFormData({...formData, reflexoes_outras: e.target.value})}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Metas e Prioridades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Metas e Objetivos
            </CardTitle>
            <CardDescription>
              Com base na sua avaliação, defina suas metas para melhorar as áreas com menor pontuação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metas_curto_prazo">Metas de Curto Prazo (1-3 meses)</Label>
              <Textarea
                id="metas_curto_prazo"
                placeholder="O que você quer alcançar nos próximos 1-3 meses?"
                value={formData.metas_curto_prazo || ''}
                onChange={(e) => setFormData({...formData, metas_curto_prazo: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metas_medio_prazo">Metas de Médio Prazo (3-12 meses)</Label>
              <Textarea
                id="metas_medio_prazo"
                placeholder="O que você quer alcançar nos próximos 3-12 meses?"
                value={formData.metas_medio_prazo || ''}
                onChange={(e) => setFormData({...formData, metas_medio_prazo: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metas_longo_prazo">Metas de Longo Prazo (1-5 anos)</Label>
              <Textarea
                id="metas_longo_prazo"
                placeholder="Quais são seus sonhos e objetivos para os próximos anos?"
                value={formData.metas_longo_prazo || ''}
                onChange={(e) => setFormData({...formData, metas_longo_prazo: e.target.value})}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Observações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle>Observações Finais</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Observações adicionais sobre este exercício da Roda da Vida..."
              value={formData.observacoes || ''}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate(`/beneficiarias/${id}`)}>
            Cancelar
          </Button>
          <Button onClick={salvarRodaVida} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Roda da Vida'}
          </Button>
        </div>
      </div>
    </div>
  );
}
