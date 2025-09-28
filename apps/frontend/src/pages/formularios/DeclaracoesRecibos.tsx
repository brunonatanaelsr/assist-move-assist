import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Download, Calendar, User, Award, Receipt, CheckCircle } from 'lucide-react';
import { AUTH_TOKEN_KEY } from '@/config';
import { apiService } from '@/services/apiService';
import { downloadDeclaracao, downloadRecibo } from '@/utils/pdfDownload';

interface DeclaracaoData {
  tipo: 'comparecimento' | 'participacao' | 'conclusao' | 'frequencia';
  beneficiaria_id: number;
  data_inicio: string;
  data_fim?: string;
  carga_horaria?: number;
  atividades_participadas: string;
  frequencia_percentual?: number;
  observacoes: string;
  finalidade: string;
  responsavel_emissao: string;
  data_emissao: string;
}

interface ReciboData {
  tipo: 'auxilio_transporte' | 'auxilio_alimentacao' | 'material_didatico' | 'outro';
  beneficiaria_id: number;
  descricao: string;
  valor: number;
  data_recebimento: string;
  periodo_referencia: string;
  observacoes: string;
  responsavel_entrega: string;
}

export default function DeclaracoesRecibos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [beneficiaria, setBeneficiaria] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'declaracao' | 'recibo'>('declaracao');
  
  const [declaracaoData, setDeclaracaoData] = useState<Partial<DeclaracaoData>>({
    beneficiaria_id: parseInt(id || '0'),
    tipo: 'comparecimento',
    data_inicio: new Date().toISOString().split('T')[0],
    data_emissao: new Date().toISOString().split('T')[0],
    responsavel_emissao: 'Usuário Logado'
  });

  const [reciboData, setReciboData] = useState<Partial<ReciboData>>({
    beneficiaria_id: parseInt(id || '0'),
    tipo: 'auxilio_transporte',
    data_recebimento: new Date().toISOString().split('T')[0],
    valor: 0,
    responsavel_entrega: 'Usuário Logado'
  });

  useEffect(() => {
    if (id) {
      carregarBeneficiaria();
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

  const gerarDeclaracao = async () => {
    try {
      setLoading(true);
      console.log('Tentando gerar declaração:', declaracaoData);
      
      // Validação básica dos dados obrigatórios
      if (!declaracaoData.atividades_participadas || !declaracaoData.finalidade) {
        alert('Por favor, preencha as atividades participadas e a finalidade da declaração.');
        return;
      }

      const response = await apiService.post('/declaracoes/gerar', declaracaoData);
      console.log('Resposta da API:', response);

      if (response.success) {
        alert('Declaração gerada com sucesso!');
        
        // Fazer download do PDF usando utilitário
        const declaracaoId = (response.data as any)?.declaracao?.id;
        if (declaracaoId) {
          const downloadOk = await downloadDeclaracao(declaracaoId);
          
          if (!downloadOk) {
            alert('PDF gerado, mas houve problema no download. Verifique se permite downloads neste site.');
          }
        }
      } else {
        alert(`Erro: ${response.message || 'Não foi possível gerar a declaração'}`);
      }
    } catch (error) {
      console.error('Erro ao gerar declaração:', error);
      alert('Erro de comunicação com o servidor. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const gerarRecibo = async () => {
    try {
      setLoading(true);
      console.log('Tentando gerar recibo:', reciboData);
      
      // Validação básica dos dados obrigatórios
      if (!reciboData.descricao || !reciboData.valor || !reciboData.periodo_referencia) {
        alert('Por favor, preencha a descrição, valor e período de referência do recibo.');
        return;
      }

      const response = await apiService.post('/recibos/gerar', reciboData);
      console.log('Resposta da API:', response);

      if (response.success) {
        alert('Recibo gerado com sucesso!');
        
        // Fazer download do PDF usando utilitário
        const reciboId = (response.data as any)?.recibo?.id;
        if (reciboId) {
          const downloadOk = await downloadRecibo(reciboId);
          
          if (!downloadOk) {
            alert('PDF gerado, mas houve problema no download. Verifique se permite downloads neste site.');
          }
        }
      } else {
        alert(`Erro: ${response.message || 'Não foi possível gerar o recibo'}`);
      }
    } catch (error) {
      console.error('Erro ao gerar recibo:', error);
      alert('Erro de comunicação com o servidor. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
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
              <FileText className="h-6 w-6" />
              Declarações e Recibos
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
            variant={activeTab === 'declaracao' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('declaracao')}
            className="flex-1"
          >
            <Award className="h-4 w-4 mr-2" />
            Declaração
          </Button>
          <Button
            variant={activeTab === 'recibo' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('recibo')}
            className="flex-1"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Recibo
          </Button>
        </div>

        {/* Declaração */}
        {activeTab === 'declaracao' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Gerar Declaração
              </CardTitle>
              <CardDescription>
                Emita declarações de participação, comparecimento ou conclusão de atividades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_declaracao">Tipo de Declaração</Label>
                <Select
                  value={declaracaoData.tipo || ''}
                  onValueChange={(value: any) => setDeclaracaoData({...declaracaoData, tipo: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comparecimento">Declaração de Comparecimento</SelectItem>
                    <SelectItem value="participacao">Declaração de Participação</SelectItem>
                    <SelectItem value="conclusao">Declaração de Conclusão</SelectItem>
                    <SelectItem value="frequencia">Declaração de Frequência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio_decl">Data de Início</Label>
                  <Input
                    id="data_inicio_decl"
                    type="date"
                    value={declaracaoData.data_inicio || ''}
                    onChange={(e) => setDeclaracaoData({...declaracaoData, data_inicio: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_fim_decl">Data de Fim (opcional)</Label>
                  <Input
                    id="data_fim_decl"
                    type="date"
                    value={declaracaoData.data_fim || ''}
                    onChange={(e) => setDeclaracaoData({...declaracaoData, data_fim: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carga_horaria">Carga Horária (horas)</Label>
                  <Input
                    id="carga_horaria"
                    type="number"
                    placeholder="0"
                    value={declaracaoData.carga_horaria || ''}
                    onChange={(e) => setDeclaracaoData({...declaracaoData, carga_horaria: parseInt(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequencia_percentual">Frequência (%)</Label>
                  <Input
                    id="frequencia_percentual"
                    type="number"
                    max="100"
                    placeholder="0"
                    value={declaracaoData.frequencia_percentual || ''}
                    onChange={(e) => setDeclaracaoData({...declaracaoData, frequencia_percentual: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="atividades_participadas">Atividades Participadas</Label>
                <Textarea
                  id="atividades_participadas"
                  placeholder="Descreva as atividades, oficinas ou cursos participados..."
                  value={declaracaoData.atividades_participadas || ''}
                  onChange={(e) => setDeclaracaoData({...declaracaoData, atividades_participadas: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="finalidade">Finalidade da Declaração</Label>
                <Input
                  id="finalidade"
                  placeholder="Para que será utilizada esta declaração? (ex: processo seletivo, trabalho, etc.)"
                  value={declaracaoData.finalidade || ''}
                  onChange={(e) => setDeclaracaoData({...declaracaoData, finalidade: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responsavel_emissao">Responsável pela Emissão</Label>
                  <Input
                    id="responsavel_emissao"
                    placeholder="Nome do responsável"
                    value={declaracaoData.responsavel_emissao || ''}
                    onChange={(e) => setDeclaracaoData({...declaracaoData, responsavel_emissao: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_emissao">Data de Emissão</Label>
                  <Input
                    id="data_emissao"
                    type="date"
                    value={declaracaoData.data_emissao || ''}
                    onChange={(e) => setDeclaracaoData({...declaracaoData, data_emissao: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes_decl">Observações</Label>
                <Textarea
                  id="observacoes_decl"
                  placeholder="Observações adicionais para a declaração..."
                  value={declaracaoData.observacoes || ''}
                  onChange={(e) => setDeclaracaoData({...declaracaoData, observacoes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={gerarDeclaracao} disabled={loading}>
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Gerando...' : 'Gerar Declaração'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recibo */}
        {activeTab === 'recibo' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Gerar Recibo
              </CardTitle>
              <CardDescription>
                Emita recibos de auxílios e benefícios recebidos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_recibo">Tipo de Benefício</Label>
                <Select
                  value={reciboData.tipo || ''}
                  onValueChange={(value: any) => setReciboData({...reciboData, tipo: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auxilio_transporte">Auxílio Transporte</SelectItem>
                    <SelectItem value="auxilio_alimentacao">Auxílio Alimentação</SelectItem>
                    <SelectItem value="material_didatico">Material Didático</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao_recibo">Descrição do Benefício</Label>
                <Textarea
                  id="descricao_recibo"
                  placeholder="Descreva detalhadamente o benefício recebido..."
                  value={reciboData.descricao || ''}
                  onChange={(e) => setReciboData({...reciboData, descricao: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_recibo">Valor (R$)</Label>
                  <Input
                    id="valor_recibo"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={reciboData.valor || ''}
                    onChange={(e) => setReciboData({...reciboData, valor: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_recebimento">Data do Recebimento</Label>
                  <Input
                    id="data_recebimento"
                    type="date"
                    value={reciboData.data_recebimento || ''}
                    onChange={(e) => setReciboData({...reciboData, data_recebimento: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodo_referencia">Período de Referência</Label>
                <Input
                  id="periodo_referencia"
                  placeholder="Ex: Janeiro/2024, Semestre 1/2024, etc."
                  value={reciboData.periodo_referencia || ''}
                  onChange={(e) => setReciboData({...reciboData, periodo_referencia: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsavel_entrega">Responsável pela Entrega</Label>
                <Input
                  id="responsavel_entrega"
                  placeholder="Nome do responsável"
                  value={reciboData.responsavel_entrega || ''}
                  onChange={(e) => setReciboData({...reciboData, responsavel_entrega: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes_recibo">Observações</Label>
                <Textarea
                  id="observacoes_recibo"
                  placeholder="Observações adicionais para o recibo..."
                  value={reciboData.observacoes || ''}
                  onChange={(e) => setReciboData({...reciboData, observacoes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={gerarRecibo} disabled={loading}>
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Gerando...' : 'Gerar Recibo'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Documentos Gerados Anteriormente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Histórico de documentos será implementado em breve
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
