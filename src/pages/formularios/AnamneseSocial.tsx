import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, FileText, User, Home, Heart, Users, Briefcase, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '@/services/apiService';
import useAutosave from '@/hooks/useAutosave';
import { useToast } from '@/components/ui/use-toast';
import { Stepper } from '@/components/ui/stepper';

interface AnamneseSocialData {
  beneficiaria_id: number;
  // Dados familiares
  composicao_familiar: string;
  situacao_habitacional: string;
  tipo_moradia: string;
  condicoes_moradia: string;
  
  // Situação socioeconômica
  renda_familiar_total: number;
  fonte_renda: string;
  beneficios_sociais: string[];
  gastos_principais: string;
  
  // Saúde e bem-estar
  condicao_saude_geral: string;
  problemas_saude: string;
  uso_medicamentos: boolean;
  medicamentos_uso: string;
  acompanhamento_medico: boolean;
  
  // Educação e capacitação
  nivel_escolaridade: string;
  desejo_capacitacao: string;
  areas_interesse: string[];
  
  // Situação social
  rede_apoio: string;
  participacao_comunitaria: string;
  violencias_enfrentadas: string;
  
  // Expectativas e objetivos
  expectativas_programa: string;
  objetivos_pessoais: string;
  disponibilidade_participacao: string;
  
  observacoes: string;
  data_preenchimento: string;
  responsavel_preenchimento: string;
}

export default function AnamneseSocial() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [beneficiaria, setBeneficiaria] = useState<any>(null);
  const [formData, setFormData] = useState<Partial<AnamneseSocialData>>({
    beneficiaria_id: parseInt(id || '0'),
    beneficios_sociais: [],
    areas_interesse: [],
    uso_medicamentos: false,
    acompanhamento_medico: false,
    data_preenchimento: new Date().toISOString(),
    responsavel_preenchimento: 'Usuário Logado'
  });

  const autosaveKey = `autosave:anamnese:${id}`;
  const { toast } = useToast();
  const { hasDraft, restored, restore, clear } = useAutosave({ key: autosaveKey, data: formData, debounceMs: 1000, enabled: true });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (id) {
      carregarBeneficiaria();
      carregarAnamnese();
    }
  }, [id]);

  // Oferece restauração de rascunho ao carregar
  useEffect(() => {
    if (hasDraft && !restored) {
      toast({
        title: 'Rascunho disponível',
        description: 'Detectamos um rascunho não enviado. Deseja restaurar?',
      });
    }
  }, [hasDraft, restored, toast]);

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

  const carregarAnamnese = async () => {
    try {
      const response = await apiService.get(`/formularios/anamnese/beneficiaria/${id}`);
      if (response.success && response.data && response.data.length > 0) {
        // Pegar a anamnese mais recente se existir
        const anamneseData = response.data[0];
        if (anamneseData.dados) {
          setFormData({ ...anamneseData.dados, beneficiaria_id: parseInt(id || '0') });
        }
      }
      // Se não houver registro no backend, tenta restaurar rascunho local
      else if (hasDraft && !restored) {
        restore(setFormData as any);
        toast({ title: 'Rascunho restaurado', description: 'Continue de onde parou.' });
      }
    } catch (error) {
      // Se não existir, mantém os dados vazios
      console.log('Anamnese não encontrada, criando nova');
      if (hasDraft && !restored) {
        restore(setFormData as any);
        toast({ title: 'Rascunho restaurado', description: 'Continue de onde parou.' });
      }
    }
  };

  const salvarAnamnese = async () => {
    try {
      setLoading(true);
      const response = await apiService.post('/formularios/anamnese', formData);

      if (response.success) {
        clear();
        toast({ title: 'Anamnese salva', description: 'Seus dados foram salvos com sucesso.' });
        navigate(`/beneficiarias/${id}`);
      }
    } catch (error) {
      console.error('Erro ao salvar anamnese:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArrayChange = (field: 'beneficios_sociais' | 'areas_interesse', value: string, checked: boolean) => {
    setFormData(prev => {
      const currentArray = prev[field] as string[] || [];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Steps */}
        <div className="bg-card border rounded p-4">
          <div className="flex items-center gap-3">
            <Stepper
              steps={[{label:'Familiar/Habitacional'},{label:'Socioeconômico/Saúde/Educação'},{label:'Social/Objetivos/Finalizar'}]}
              current={step}
              onChange={setStep}
            />
            <div className="ml-auto flex items-center gap-2">
              <button className="text-sm px-2 py-1 border rounded disabled:opacity-50" onClick={() => setStep(s => Math.max(0, s-1))} disabled={step===0}>
                <ChevronLeft className="inline h-4 w-4" /> Voltar
              </button>
              <button className="text-sm px-2 py-1 border rounded disabled:opacity-50" onClick={() => setStep(s => Math.min(2, s+1))} disabled={step===2}>
                Avançar <ChevronRight className="inline h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(`/beneficiarias/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Anamnese Social
            </h1>
            {beneficiaria && (
              <p className="text-muted-foreground">
                {beneficiaria.nome_completo} • CPF: {beneficiaria.cpf}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          {/* Composição Familiar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Composição Familiar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="composicao_familiar">Composição da Família</Label>
                <Textarea
                  id="composicao_familiar"
                  placeholder="Descreva a composição familiar (membros, idades, parentesco...)"
                  value={formData.composicao_familiar || ''}
                  onChange={(e) => setFormData({...formData, composicao_familiar: e.target.value})}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Situação Habitacional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Situação Habitacional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_moradia">Tipo de Moradia</Label>
                  <Select
                    value={formData.tipo_moradia || ''}
                    onValueChange={(value) => setFormData({...formData, tipo_moradia: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casa_propria">Casa Própria</SelectItem>
                      <SelectItem value="casa_alugada">Casa Alugada</SelectItem>
                      <SelectItem value="casa_cedida">Casa Cedida</SelectItem>
                      <SelectItem value="apartamento">Apartamento</SelectItem>
                      <SelectItem value="barraco">Barraco</SelectItem>
                      <SelectItem value="cortico">Cortiço</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="situacao_habitacional">Situação</Label>
                  <Select
                    value={formData.situacao_habitacional || ''}
                    onValueChange={(value) => setFormData({...formData, situacao_habitacional: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adequada">Adequada</SelectItem>
                      <SelectItem value="precaria">Precária</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condicoes_moradia">Condições da Moradia</Label>
                <Textarea
                  id="condicoes_moradia"
                  placeholder="Descreva as condições da moradia (infraestrutura, saneamento, etc.)"
                  value={formData.condicoes_moradia || ''}
                  onChange={(e) => setFormData({...formData, condicoes_moradia: e.target.value})}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Situação Socioeconômica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Situação Socioeconômica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="renda_familiar_total">Renda Familiar Total</Label>
                  <Input
                    id="renda_familiar_total"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.renda_familiar_total || ''}
                    onChange={(e) => setFormData({...formData, renda_familiar_total: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fonte_renda">Principal Fonte de Renda</Label>
                  <Select
                    value={formData.fonte_renda || ''}
                    onValueChange={(value) => setFormData({...formData, fonte_renda: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trabalho_formal">Trabalho Formal</SelectItem>
                      <SelectItem value="trabalho_informal">Trabalho Informal</SelectItem>
                      <SelectItem value="autonomo">Autônomo</SelectItem>
                      <SelectItem value="aposentadoria">Aposentadoria</SelectItem>
                      <SelectItem value="auxilio_governo">Auxílio Governo</SelectItem>
                      <SelectItem value="pensao">Pensão</SelectItem>
                      <SelectItem value="sem_renda">Sem Renda</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Benefícios Sociais Recebidos</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    'Bolsa Família', 'Auxílio Brasil', 'BPC', 'Vale Gás',
                    'Auxílio Emergencial', 'Cesta Básica', 'Nenhum'
                  ].map((beneficio) => (
                    <div key={beneficio} className="flex items-center space-x-2">
                      <Checkbox
                        id={beneficio}
                        checked={(formData.beneficios_sociais || []).includes(beneficio)}
                        onCheckedChange={(checked) => 
                          handleArrayChange('beneficios_sociais', beneficio, checked as boolean)
                        }
                      />
                      <Label htmlFor={beneficio} className="text-sm">{beneficio}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gastos_principais">Principais Gastos Familiares</Label>
                <Textarea
                  id="gastos_principais"
                  placeholder="Descreva os principais gastos (alimentação, moradia, saúde, etc.)"
                  value={formData.gastos_principais || ''}
                  onChange={(e) => setFormData({...formData, gastos_principais: e.target.value})}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Saúde e Bem-estar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Saúde e Bem-estar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="condicao_saude_geral">Condição de Saúde Geral</Label>
                <Select
                  value={formData.condicao_saude_geral || ''}
                  onValueChange={(value) => setFormData({...formData, condicao_saude_geral: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excelente">Excelente</SelectItem>
                    <SelectItem value="boa">Boa</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="ruim">Ruim</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="problemas_saude">Problemas de Saúde</Label>
                <Textarea
                  id="problemas_saude"
                  placeholder="Descreva problemas de saúde existentes"
                  value={formData.problemas_saude || ''}
                  onChange={(e) => setFormData({...formData, problemas_saude: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="uso_medicamentos"
                    checked={formData.uso_medicamentos || false}
                    onCheckedChange={(checked) => 
                      setFormData({...formData, uso_medicamentos: checked as boolean})
                    }
                  />
                  <Label htmlFor="uso_medicamentos">Faz uso de medicamentos</Label>
                </div>

                {formData.uso_medicamentos && (
                  <div className="space-y-2">
                    <Label htmlFor="medicamentos_uso">Quais medicamentos?</Label>
                    <Textarea
                      id="medicamentos_uso"
                      placeholder="Liste os medicamentos em uso"
                      value={formData.medicamentos_uso || ''}
                      onChange={(e) => setFormData({...formData, medicamentos_uso: e.target.value})}
                      rows={2}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="acompanhamento_medico"
                    checked={formData.acompanhamento_medico || false}
                    onCheckedChange={(checked) => 
                      setFormData({...formData, acompanhamento_medico: checked as boolean})
                    }
                  />
                  <Label htmlFor="acompanhamento_medico">Tem acompanhamento médico regular</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Educação e Capacitação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Educação e Capacitação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nivel_escolaridade">Nível de Escolaridade</Label>
                <Select
                  value={formData.nivel_escolaridade || ''}
                  onValueChange={(value) => setFormData({...formData, nivel_escolaridade: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao_alfabetizado">Não Alfabetizado</SelectItem>
                    <SelectItem value="fundamental_incompleto">Fundamental Incompleto</SelectItem>
                    <SelectItem value="fundamental_completo">Fundamental Completo</SelectItem>
                    <SelectItem value="medio_incompleto">Médio Incompleto</SelectItem>
                    <SelectItem value="medio_completo">Médio Completo</SelectItem>
                    <SelectItem value="superior_incompleto">Superior Incompleto</SelectItem>
                    <SelectItem value="superior_completo">Superior Completo</SelectItem>
                    <SelectItem value="pos_graduacao">Pós-graduação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desejo_capacitacao">Desejo de Capacitação</Label>
                <Textarea
                  id="desejo_capacitacao"
                  placeholder="Descreva o interesse em capacitação e aprendizado"
                  value={formData.desejo_capacitacao || ''}
                  onChange={(e) => setFormData({...formData, desejo_capacitacao: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Áreas de Interesse</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    'Artesanato', 'Culinária', 'Costura', 'Beleza', 
                    'Informática', 'Empreendedorismo', 'Cuidador', 'Outro'
                  ].map((area) => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox
                        id={area}
                        checked={(formData.areas_interesse || []).includes(area)}
                        onCheckedChange={(checked) => 
                          handleArrayChange('areas_interesse', area, checked as boolean)
                        }
                      />
                      <Label htmlFor={area} className="text-sm">{area}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expectativas e Objetivos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Expectativas e Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expectativas_programa">Expectativas com o Programa</Label>
                <Textarea
                  id="expectativas_programa"
                  placeholder="O que espera alcançar com a participação no programa?"
                  value={formData.expectativas_programa || ''}
                  onChange={(e) => setFormData({...formData, expectativas_programa: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objetivos_pessoais">Objetivos Pessoais</Label>
                <Textarea
                  id="objetivos_pessoais"
                  placeholder="Quais são seus principais objetivos pessoais e profissionais?"
                  value={formData.objetivos_pessoais || ''}
                  onChange={(e) => setFormData({...formData, objetivos_pessoais: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="disponibilidade_participacao">Disponibilidade para Participação</Label>
                <Textarea
                  id="disponibilidade_participacao"
                  placeholder="Descreva sua disponibilidade de horários e dias"
                  value={formData.disponibilidade_participacao || ''}
                  onChange={(e) => setFormData({...formData, disponibilidade_participacao: e.target.value})}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Observações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Observações adicionais importantes..."
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
            <Button onClick={salvarAnamnese} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Anamnese'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
