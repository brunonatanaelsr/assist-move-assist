import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Search, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AUTH_TOKEN_KEY } from "@/config";
import { downloadDeclaracao, downloadRecibo } from "@/utils/pdfDownload";
import { useBeneficiarias } from "@/hooks/useBeneficiarias";
import apiService from "@/services/apiService";

interface BeneficiariaOption {
  id: number;
  nome: string;
  cpf: string;
  telefone?: string | null;
}

interface DeclaracaoData {
  beneficiaria_id: number;
  tipo: 'comparecimento' | 'participacao' | 'conclusao' | 'frequencia';
  data_inicio: string;
  data_fim?: string;
  carga_horaria?: number;
  atividades_participadas: string;
  frequencia_percentual?: number;
  observacoes?: string;
  finalidade: string;
  responsavel_emissao: string;
  data_emissao: string;
}

interface ReciboData {
  beneficiaria_id: number;
  tipo: 'auxilio_transporte' | 'auxilio_alimentacao' | 'material_didatico' | 'outro';
  descricao: string;
  valor: number;
  data_recebimento: string;
  periodo_referencia: string;
  observacoes?: string;
  responsavel_entrega: string;
}

export default function DeclaracoesReciboGeral() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const beneficiariasQuery = useBeneficiarias({ limit: 1000 });
  const beneficiariasResponse = beneficiariasQuery.data;
  const beneficiarias: BeneficiariaOption[] = useMemo(
    () =>
      (beneficiariasResponse?.data?.items ?? []).map((beneficiaria) => ({
        id: beneficiaria.id,
        nome: beneficiaria.nome_completo,
        cpf: beneficiaria.cpf,
        telefone: beneficiaria.telefone,
      })),
    [beneficiariasResponse]
  );
  const [selectedBeneficiaria, setSelectedBeneficiaria] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'declaracao' | 'recibo'>('declaracao');
  const [loading, setLoading] = useState(false);
  
  const [declaracaoData, setDeclaracaoData] = useState<Partial<DeclaracaoData>>({
    tipo: 'comparecimento',
    data_inicio: new Date().toISOString().split('T')[0],
    data_emissao: new Date().toISOString().split('T')[0],
    atividades_participadas: '',
    finalidade: '',
    responsavel_emissao: 'Administrador Sistema',
    observacoes: ''
  });
  
  const [reciboData, setReciboData] = useState<Partial<ReciboData>>({
    tipo: 'auxilio_alimentacao',
    valor: 0,
    data_recebimento: new Date().toISOString().split('T')[0],
    periodo_referencia: '',
    descricao: '',
    responsavel_entrega: 'Administrador Sistema',
    observacoes: ''
  });

  const beneficiariasErrorMessage = beneficiariasQuery.isError
    ? (beneficiariasQuery.error as Error | undefined)?.message
    : beneficiariasResponse && beneficiariasResponse.success === false
    ? beneficiariasResponse.message
    : undefined;

  useEffect(() => {
    if (beneficiariasErrorMessage) {
      toast({
        title: 'Erro',
        description: beneficiariasErrorMessage || 'Não foi possível carregar a lista de beneficiárias',
        variant: 'destructive',
      });
    }
  }, [beneficiariasErrorMessage, toast]);

  const gerarDeclaracao = async () => {
    if (!selectedBeneficiaria) {
      toast({
        title: 'Atenção',
        description: 'Selecione uma beneficiária',
        variant: 'destructive'
      });
      return;
    }

    if (!declaracaoData.atividades_participadas || !declaracaoData.finalidade) {
      toast({
        title: 'Atenção',
        description: 'Preencha as atividades participadas e a finalidade da declaração',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Gerando declaração:', { ...declaracaoData, beneficiaria_id: selectedBeneficiaria });
      
      const response = await apiService.post('/declaracoes/gerar', { 
        ...declaracaoData, 
        beneficiaria_id: selectedBeneficiaria 
      });

      console.log('Resposta da API:', response);

      if (response.success) {
        toast({
          title: 'Sucesso',
          description: 'Declaração gerada com sucesso!'
        });
        
        // Fazer download do PDF usando utilitário
        const declaracaoId = (response.data as any)?.declaracao?.id;
        if (declaracaoId) {
          const token =
            localStorage.getItem(AUTH_TOKEN_KEY) ||
            localStorage.getItem('token') ||
            '';
          const downloadOk = await downloadDeclaracao(declaracaoId, token);
          
          if (!downloadOk) {
            toast({
              title: 'Atenção',
              description: 'PDF gerado, mas houve problema no download. Tente novamente.',
              variant: 'default'
            });
          }
        }
      } else {
        toast({
          title: 'Erro',
          description: response.message || 'Não foi possível gerar a declaração',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao gerar declaração:', error);
      toast({
        title: 'Erro',
        description: 'Erro de comunicação com o servidor',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const gerarRecibo = async () => {
    if (!selectedBeneficiaria) {
      toast({
        title: 'Atenção',
        description: 'Selecione uma beneficiária',
        variant: 'destructive'
      });
      return;
    }

    if (!reciboData.descricao || !reciboData.valor || !reciboData.periodo_referencia) {
      toast({
        title: 'Atenção',
        description: 'Preencha a descrição, valor e período de referência do recibo',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Gerando recibo:', { ...reciboData, beneficiaria_id: selectedBeneficiaria });
      
      const response = await apiService.post('/recibos/gerar', { 
        ...reciboData, 
        beneficiaria_id: selectedBeneficiaria 
      });

      console.log('Resposta da API:', response);

      if (response.success) {
        toast({
          title: 'Sucesso',
          description: 'Recibo gerado com sucesso!'
        });
        
        // Fazer download do PDF usando utilitário
        const reciboId = (response.data as any)?.recibo?.id;
        if (reciboId) {
          const token =
            localStorage.getItem(AUTH_TOKEN_KEY) ||
            localStorage.getItem('token') ||
            '';
          const downloadOk = await downloadRecibo(reciboId, token);
          
          if (!downloadOk) {
            toast({
              title: 'Atenção',
              description: 'PDF gerado, mas houve problema no download. Tente novamente.',
              variant: 'default'
            });
          }
        }
      } else {
        toast({
          title: 'Erro',
          description: response.message || 'Não foi possível gerar o recibo',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao gerar recibo:', error);
      toast({
        title: 'Erro',
        description: 'Erro de comunicação com o servidor',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const beneficiariaSelecionada = beneficiarias.find(b => b.id === selectedBeneficiaria);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Declarações e Recibos</h1>
        <p className="text-muted-foreground">Gere declarações de comparecimento e recibos de benefícios</p>
      </div>

      {/* Seleção de Beneficiária */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Selecionar Beneficiária
          </CardTitle>
          <CardDescription>
            Escolha a beneficiária para gerar os documentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedBeneficiaria?.toString() || ''} onValueChange={(value) => setSelectedBeneficiaria(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma beneficiária..." />
              </SelectTrigger>
              <SelectContent>
                {beneficiarias.map(beneficiaria => (
                  <SelectItem key={beneficiaria.id} value={beneficiaria.id.toString()}>
                    {beneficiaria.nome} - {beneficiaria.cpf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {beneficiariaSelecionada && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{beneficiariaSelecionada.nome}</p>
                <p className="text-sm text-muted-foreground">CPF: {beneficiariaSelecionada.cpf}</p>
                {beneficiariaSelecionada.telefone && (
                  <p className="text-sm text-muted-foreground">Telefone: {beneficiariaSelecionada.telefone}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formulários */}
      {selectedBeneficiaria && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gerar Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="declaracao">Declaração de Comparecimento</TabsTrigger>
                <TabsTrigger value="recibo">Recibo de Benefício</TabsTrigger>
              </TabsList>

              <TabsContent value="declaracao" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo_declaracao">Tipo de Declaração</Label>
                    <Select
                      value={declaracaoData.tipo || ''}
                      onValueChange={(value: any) => setDeclaracaoData({...declaracaoData, tipo: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comparecimento">Comparecimento</SelectItem>
                        <SelectItem value="participacao">Participação em Atividade</SelectItem>
                        <SelectItem value="conclusao">Conclusão de Curso</SelectItem>
                        <SelectItem value="frequencia">Frequência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="data_inicio">Data de Início</Label>
                    <Input
                      id="data_inicio"
                      type="date"
                      value={declaracaoData.data_inicio || ''}
                      onChange={(e) => setDeclaracaoData({...declaracaoData, data_inicio: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="data_fim">Data de Fim (opcional)</Label>
                    <Input
                      id="data_fim"
                      type="date"
                      value={declaracaoData.data_fim || ''}
                      onChange={(e) => setDeclaracaoData({...declaracaoData, data_fim: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="carga_horaria">Carga Horária (horas)</Label>
                    <Input
                      id="carga_horaria"
                      type="number"
                      min="0"
                      value={declaracaoData.carga_horaria || ''}
                      onChange={(e) => setDeclaracaoData({...declaracaoData, carga_horaria: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="atividades_participadas">Atividades Participadas *</Label>
                  <Textarea
                    id="atividades_participadas"
                    placeholder="Descreva as atividades, oficinas ou cursos participados..."
                    value={declaracaoData.atividades_participadas || ''}
                    onChange={(e) => setDeclaracaoData({...declaracaoData, atividades_participadas: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="finalidade">Finalidade da Declaração *</Label>
                  <Input
                    id="finalidade"
                    placeholder="Para que será utilizada esta declaração?"
                    value={declaracaoData.finalidade || ''}
                    onChange={(e) => setDeclaracaoData({...declaracaoData, finalidade: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="observacoes_declaracao">Observações</Label>
                  <Textarea
                    id="observacoes_declaracao"
                    placeholder="Observações adicionais..."
                    value={declaracaoData.observacoes || ''}
                    onChange={(e) => setDeclaracaoData({...declaracaoData, observacoes: e.target.value})}
                  />
                </div>

                <Button onClick={gerarDeclaracao} disabled={loading} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  {loading ? 'Gerando...' : 'Gerar Declaração'}
                </Button>
              </TabsContent>

              <TabsContent value="recibo" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo_recibo">Tipo de Benefício</Label>
                    <Select
                      value={reciboData.tipo || ''}
                      onValueChange={(value: any) => setReciboData({...reciboData, tipo: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auxilio_transporte">Auxílio Transporte</SelectItem>
                        <SelectItem value="auxilio_alimentacao">Auxílio Alimentação</SelectItem>
                        <SelectItem value="material_didatico">Material Didático</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="valor">Valor (R$) *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      min="0"
                      value={reciboData.valor || 0}
                      onChange={(e) => setReciboData({...reciboData, valor: Number(e.target.value)})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="data_recebimento">Data do Recebimento</Label>
                    <Input
                      id="data_recebimento"
                      type="date"
                      value={reciboData.data_recebimento || ''}
                      onChange={(e) => setReciboData({...reciboData, data_recebimento: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="periodo_referencia">Período de Referência *</Label>
                    <Input
                      id="periodo_referencia"
                      placeholder="Ex: Janeiro/2024, Semestre 1/2024"
                      value={reciboData.periodo_referencia || ''}
                      onChange={(e) => setReciboData({...reciboData, periodo_referencia: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição do Benefício *</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Descreva detalhadamente o benefício recebido..."
                    value={reciboData.descricao || ''}
                    onChange={(e) => setReciboData({...reciboData, descricao: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="observacoes_recibo">Observações</Label>
                  <Textarea
                    id="observacoes_recibo"
                    placeholder="Observações adicionais..."
                    value={reciboData.observacoes || ''}
                    onChange={(e) => setReciboData({...reciboData, observacoes: e.target.value})}
                  />
                </div>

                <Button onClick={gerarRecibo} disabled={loading} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  {loading ? 'Gerando...' : 'Gerar Recibo'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
