import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Plus, TrendingUp, Calendar, User, Activity, Target } from 'lucide-react';
import { formatDate } from '@/lib/dayjs';
import { apiService } from '@/services/apiService';
import useAutosave from '@/hooks/useAutosave';
import { useToast } from '@/components/ui/use-toast';

interface RegistroEvolucao {
  id?: number;
  data_registro: string;
  tipo_atendimento: string;
  profissional_responsavel: string;
  atividades_realizadas: string;
  objetivos_trabalhados: string;
  progressos_observados: string;
  dificuldades_encontradas: string;
  comportamento_participacao: string;
  proximos_passos: string;
  observacoes: string;
}

interface FichaEvolucaoData {
  beneficiaria_id: number;
  registros: RegistroEvolucao[];
  observacoes_gerais: string;
  data_inicio_acompanhamento: string;
  responsavel_tecnico: string;
}

export default function FichaEvolucao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [beneficiaria, setBeneficiaria] = useState<any>(null);
  const [fichaData, setFichaData] = useState<Partial<FichaEvolucaoData>>({
    beneficiaria_id: parseInt(id || '0'),
    registros: [],
    data_inicio_acompanhamento: new Date().toISOString().split('T')[0],
    responsavel_tecnico: 'Usuário Logado'
  });
  const autosaveKey = `autosave:ficha_evolucao:${id}`;
  const { toast } = useToast();
  const { hasDraft, restored, restore, clear } = useAutosave({ key: autosaveKey, data: fichaData, debounceMs: 1000, enabled: true });
  
  const [novoRegistro, setNovoRegistro] = useState<Partial<RegistroEvolucao>>({
    data_registro: new Date().toISOString().split('T')[0],
    tipo_atendimento: '',
    profissional_responsavel: '',
    atividades_realizadas: '',
    objetivos_trabalhados: '',
    progressos_observados: '',
    dificuldades_encontradas: '',
    comportamento_participacao: '',
    proximos_passos: '',
    observacoes: ''
  });

  useEffect(() => {
    if (id) {
      carregarBeneficiaria();
      carregarFichaEvolucao();
    }
  }, [id]);

  useEffect(() => {
    if (hasDraft && !restored) {
      toast({ title: 'Rascunho disponível', description: 'Deseja restaurar o rascunho desta ficha?' });
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

  const carregarFichaEvolucao = async () => {
    try {
      const response = await apiService.get(`/formularios/ficha-evolucao/${id}`);
      if (response.success && response.data) {
        setFichaData(response.data);
      }
    } catch (error) {
      console.log('Ficha de Evolução não encontrada, criando nova');
      if (hasDraft && !restored) {
        restore(setFichaData as any);
        toast({ title: 'Rascunho restaurado', description: 'Continue de onde parou.' });
      }
    }
  };

  const adicionarRegistro = () => {
    if (!novoRegistro.data_registro || !novoRegistro.tipo_atendimento) {
      alert('Data e tipo de atendimento são obrigatórios');
      return;
    }

    const registro: RegistroEvolucao = {
      ...novoRegistro as RegistroEvolucao,
      id: Date.now() // ID temporário
    };

    setFichaData(prev => ({
      ...prev,
      registros: [registro, ...(prev.registros || [])]
    }));

    // Limpar formulário
    setNovoRegistro({
      data_registro: new Date().toISOString().split('T')[0],
      tipo_atendimento: '',
      profissional_responsavel: '',
      atividades_realizadas: '',
      objetivos_trabalhados: '',
      progressos_observados: '',
      dificuldades_encontradas: '',
      comportamento_participacao: '',
      proximos_passos: '',
      observacoes: ''
    });
  };

  const removerRegistro = (index: number) => {
    setFichaData(prev => ({
      ...prev,
      registros: prev.registros?.filter((_, i) => i !== index) || []
    }));
  };

  const salvarFicha = async () => {
    try {
      setLoading(true);
      const response = await apiService.post('/formularios/ficha-evolucao', fichaData);

      if (response.success) {
        clear();
        toast({ title: 'Ficha de evolução salva', description: 'Seus dados foram salvos com sucesso.' });
        navigate(`/beneficiarias/${id}`);
      }
    } catch (error) {
      console.error('Erro ao salvar ficha de evolução:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTipoAtendimentoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      'individual': 'bg-blue-100 text-blue-800',
      'grupo': 'bg-green-100 text-green-800',
      'oficina': 'bg-purple-100 text-purple-800',
      'visita_domiciliar': 'bg-orange-100 text-orange-800',
      'acompanhamento_telefonico': 'bg-gray-100 text-gray-800',
      'outro': 'bg-yellow-100 text-yellow-800'
    };
    
    return colors[tipo] || 'bg-gray-100 text-gray-800';
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
              <Activity className="h-6 w-6" />
              Ficha de Evolução
            </h1>
            {beneficiaria && (
              <p className="text-muted-foreground">
                {beneficiaria.nome_completo} • CPF: {beneficiaria.cpf}
              </p>
            )}
          </div>
        </div>

        {/* Informações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Acompanhamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Início do Acompanhamento</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={fichaData.data_inicio_acompanhamento || ''}
                  onChange={(e) => setFichaData({...fichaData, data_inicio_acompanhamento: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsavel_tecnico">Responsável Técnico</Label>
                <Input
                  id="responsavel_tecnico"
                  placeholder="Nome do profissional responsável"
                  value={fichaData.responsavel_tecnico || ''}
                  onChange={(e) => setFichaData({...fichaData, responsavel_tecnico: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes_gerais">Observações Gerais do Acompanhamento</Label>
              <Textarea
                id="observacoes_gerais"
                placeholder="Observações gerais sobre o acompanhamento da beneficiária..."
                value={fichaData.observacoes_gerais || ''}
                onChange={(e) => setFichaData({...fichaData, observacoes_gerais: e.target.value})}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Novo Registro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Novo Registro de Evolução
            </CardTitle>
            <CardDescription>
              Registre cada atendimento ou acompanhamento realizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_registro">Data do Atendimento</Label>
                <Input
                  id="data_registro"
                  type="date"
                  value={novoRegistro.data_registro || ''}
                  onChange={(e) => setNovoRegistro({...novoRegistro, data_registro: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_atendimento">Tipo de Atendimento</Label>
                <Select
                  value={novoRegistro.tipo_atendimento || ''}
                  onValueChange={(value) => setNovoRegistro({...novoRegistro, tipo_atendimento: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Atendimento Individual</SelectItem>
                    <SelectItem value="grupo">Atendimento em Grupo</SelectItem>
                    <SelectItem value="oficina">Participação em Oficina</SelectItem>
                    <SelectItem value="visita_domiciliar">Visita Domiciliar</SelectItem>
                    <SelectItem value="acompanhamento_telefonico">Acompanhamento Telefônico</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profissional_responsavel">Profissional Responsável</Label>
                <Input
                  id="profissional_responsavel"
                  placeholder="Nome do profissional"
                  value={novoRegistro.profissional_responsavel || ''}
                  onChange={(e) => setNovoRegistro({...novoRegistro, profissional_responsavel: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="atividades_realizadas">Atividades Realizadas</Label>
                <Textarea
                  id="atividades_realizadas"
                  placeholder="Descreva as atividades realizadas no atendimento"
                  value={novoRegistro.atividades_realizadas || ''}
                  onChange={(e) => setNovoRegistro({...novoRegistro, atividades_realizadas: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objetivos_trabalhados">Objetivos Trabalhados</Label>
                <Textarea
                  id="objetivos_trabalhados"
                  placeholder="Quais objetivos foram trabalhados?"
                  value={novoRegistro.objetivos_trabalhados || ''}
                  onChange={(e) => setNovoRegistro({...novoRegistro, objetivos_trabalhados: e.target.value})}
                  rows={3}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="progressos_observados">Progressos Observados</Label>
                <Textarea
                  id="progressos_observados"
                  placeholder="Que progressos foram observados?"
                  value={novoRegistro.progressos_observados || ''}
                  onChange={(e) => setNovoRegistro({...novoRegistro, progressos_observados: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dificuldades_encontradas">Dificuldades Encontradas</Label>
                <Textarea
                  id="dificuldades_encontradas"
                  placeholder="Quais dificuldades foram observadas?"
                  value={novoRegistro.dificuldades_encontradas || ''}
                  onChange={(e) => setNovoRegistro({...novoRegistro, dificuldades_encontradas: e.target.value})}
                  rows={3}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="comportamento_participacao">Comportamento e Participação</Label>
                <Textarea
                  id="comportamento_participacao"
                  placeholder="Como foi o comportamento e participação?"
                  value={novoRegistro.comportamento_participacao || ''}
                  onChange={(e) => setNovoRegistro({...novoRegistro, comportamento_participacao: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proximos_passos">Próximos Passos</Label>
                <Textarea
                  id="proximos_passos"
                  placeholder="Quais são os próximos passos planejados?"
                  value={novoRegistro.proximos_passos || ''}
                  onChange={(e) => setNovoRegistro({...novoRegistro, proximos_passos: e.target.value})}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes_registro">Observações do Registro</Label>
              <Textarea
                id="observacoes_registro"
                placeholder="Observações adicionais sobre este atendimento..."
                value={novoRegistro.observacoes || ''}
                onChange={(e) => setNovoRegistro({...novoRegistro, observacoes: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={adicionarRegistro}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Registro
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Registros Existentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Histórico de Evolução
            </CardTitle>
            <CardDescription>
              Registros de atendimentos realizados ({fichaData.registros?.length || 0} registros)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fichaData.registros && fichaData.registros.length > 0 ? (
              <div className="space-y-4">
                {fichaData.registros.map((registro, index) => (
                  <div key={registro.id || index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
              {formatDate(registro.data_registro, 'DD/MM/YYYY')}
                        </span>
                        <Badge className={getTipoAtendimentoBadge(registro.tipo_atendimento)}>
                          {registro.tipo_atendimento.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removerRegistro(index)}
                      >
                        Remover
                      </Button>
                    </div>

                    {registro.profissional_responsavel && (
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Profissional:</strong> {registro.profissional_responsavel}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {registro.atividades_realizadas && (
                        <div>
                          <strong>Atividades:</strong>
                          <p className="mt-1">{registro.atividades_realizadas}</p>
                        </div>
                      )}

                      {registro.objetivos_trabalhados && (
                        <div>
                          <strong>Objetivos:</strong>
                          <p className="mt-1">{registro.objetivos_trabalhados}</p>
                        </div>
                      )}

                      {registro.progressos_observados && (
                        <div>
                          <strong>Progressos:</strong>
                          <p className="mt-1 text-green-600">{registro.progressos_observados}</p>
                        </div>
                      )}

                      {registro.dificuldades_encontradas && (
                        <div>
                          <strong>Dificuldades:</strong>
                          <p className="mt-1 text-orange-600">{registro.dificuldades_encontradas}</p>
                        </div>
                      )}

                      {registro.comportamento_participacao && (
                        <div>
                          <strong>Comportamento:</strong>
                          <p className="mt-1">{registro.comportamento_participacao}</p>
                        </div>
                      )}

                      {registro.proximos_passos && (
                        <div>
                          <strong>Próximos Passos:</strong>
                          <p className="mt-1 text-blue-600">{registro.proximos_passos}</p>
                        </div>
                      )}
                    </div>

                    {registro.observacoes && (
                      <div className="mt-3 pt-3 border-t">
                        <strong className="text-sm">Observações:</strong>
                        <p className="text-sm mt-1">{registro.observacoes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum registro de evolução encontrado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate(`/beneficiarias/${id}`)}>
            Cancelar
          </Button>
          <Button onClick={salvarFicha} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Ficha'}
          </Button>
        </div>
      </div>
    </div>
  );
}
