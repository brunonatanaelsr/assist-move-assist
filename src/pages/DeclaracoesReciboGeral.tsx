import { useEffect, useState } from "react";
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
import apiService from "@/services/apiService";

interface Beneficiaria {
  id: number;
  nome: string;
  cpf: string;
  telefone?: string;
}

interface DeclaracaoData {
  beneficiaria_id: number;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  observacoes: string;
}

interface ReciboData {
  beneficiaria_id: number;
  tipo_beneficio: string;
  valor: number;
  data_pagamento: string;
  observacoes: string;
}

export default function DeclaracoesReciboGeral() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [beneficiarias, setBeneficiarias] = useState<Beneficiaria[]>([]);
  const [selectedBeneficiaria, setSelectedBeneficiaria] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'declaracao' | 'recibo'>('declaracao');
  const [loading, setLoading] = useState(false);
  
  const [declaracaoData, setDeclaracaoData] = useState<Partial<DeclaracaoData>>({
    tipo: 'comparecimento',
    data_inicio: '',
    data_fim: '',
    observacoes: ''
  });
  
  const [reciboData, setReciboData] = useState<Partial<ReciboData>>({
    tipo_beneficio: 'assistencia_social',
    valor: 0,
    data_pagamento: '',
    observacoes: ''
  });

  useEffect(() => {
    carregarBeneficiarias();
  }, []);

  const carregarBeneficiarias = async () => {
    try {
      const response = await apiService.getBeneficiarias();
      if (response.success && response.data) {
        setBeneficiarias(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar beneficiárias:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de beneficiárias',
        variant: 'destructive'
      });
    }
  };

  const gerarDeclaracao = async () => {
    if (!selectedBeneficiaria) {
      toast({
        title: 'Atenção',
        description: 'Selecione uma beneficiária',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.createFormulario('declaracao', { 
        ...declaracaoData, 
        beneficiaria_id: selectedBeneficiaria 
      });

      if (response.success) {
        toast({
          title: 'Sucesso',
          description: 'Declaração gerada com sucesso'
        });
        
        // Download do PDF
        const blob = await apiService.exportFormularioPdf('declaracao', response.data.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `declaracao_${response.data.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erro ao gerar declaração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar a declaração',
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

    try {
      setLoading(true);
      const response = await apiService.createFormulario('recibo', { 
        ...reciboData, 
        beneficiaria_id: selectedBeneficiaria 
      });

      if (response.success) {
        toast({
          title: 'Sucesso',
          description: 'Recibo gerado com sucesso'
        });
        
        // Download do PDF
        const blob = await apiService.exportFormularioPdf('recibo', response.data.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recibo_${response.data.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erro ao gerar recibo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o recibo',
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
                        <SelectItem value="atendimento">Atendimento Social</SelectItem>
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
                    <Label htmlFor="data_fim">Data de Fim</Label>
                    <Input
                      id="data_fim"
                      type="date"
                      value={declaracaoData.data_fim || ''}
                      onChange={(e) => setDeclaracaoData({...declaracaoData, data_fim: e.target.value})}
                    />
                  </div>
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
                    <Label htmlFor="tipo_beneficio">Tipo de Benefício</Label>
                    <Select
                      value={reciboData.tipo_beneficio || ''}
                      onValueChange={(value: any) => setReciboData({...reciboData, tipo_beneficio: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assistencia_social">Assistência Social</SelectItem>
                        <SelectItem value="cesta_basica">Cesta Básica</SelectItem>
                        <SelectItem value="auxilio_transporte">Auxílio Transporte</SelectItem>
                        <SelectItem value="material_escolar">Material Escolar</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="valor">Valor (R$)</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      min="0"
                      value={reciboData.valor || 0}
                      onChange={(e) => setReciboData({...reciboData, valor: Number(e.target.value)})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="data_pagamento">Data do Pagamento</Label>
                    <Input
                      id="data_pagamento"
                      type="date"
                      value={reciboData.data_pagamento || ''}
                      onChange={(e) => setReciboData({...reciboData, data_pagamento: e.target.value})}
                    />
                  </div>
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
