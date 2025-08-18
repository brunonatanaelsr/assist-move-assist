import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Shield, FileText, User, CheckCircle, AlertCircle, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiFetch } from '@/lib/api';

interface TermoConsentimento {
  beneficiaria_id: number;
  tipo_termo: 'lgpd' | 'tratamento_dados' | 'uso_imagem' | 'participacao_pesquisa' | 'atendimento_psicossocial';
  aceito: boolean;
  data_aceite?: string;
  testemunha1_nome?: string;
  testemunha1_cpf?: string;
  testemunha2_nome?: string;
  testemunha2_cpf?: string;
  observacoes: string;
  responsavel_aplicacao: string;
  local_aplicacao: string;
  finalidades_especificas: string;
  direitos_conhecidos: string[];
  revogacao_informada: boolean;
}

export default function TermosConsentimento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [beneficiaria, setBeneficiaria] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'novo' | 'historico'>('novo');
  
  const [termoData, setTermoData] = useState<Partial<TermoConsentimento>>({
    beneficiaria_id: parseInt(id || '0'),
    tipo_termo: 'lgpd',
    aceito: false,
    revogacao_informada: false,
    direitos_conhecidos: [],
    responsavel_aplicacao: 'Usuário Logado',
    local_aplicacao: 'Sede do Projeto Move Marias'
  });

  const [termosExistentes, setTermosExistentes] = useState<any[]>([]);

  const tiposTermos = {
    'lgpd': 'Termo de Consentimento LGPD',
    'tratamento_dados': 'Termo de Tratamento de Dados',
    'uso_imagem': 'Termo de Uso de Imagem e Voz',
    'participacao_pesquisa': 'Termo de Participação em Pesquisa',
    'atendimento_psicossocial': 'Termo de Atendimento Psicossocial'
  };

  const direitosLGPD = [
    'Direito à informação sobre o tratamento',
    'Direito de acesso aos dados',
    'Direito de correção de dados',
    'Direito de anonimização ou bloqueio',
    'Direito de eliminação dos dados',
    'Direito de portabilidade',
    'Direito de revogação do consentimento'
  ];

  useEffect(() => {
    if (id) {
      carregarBeneficiaria();
      carregarTermosExistentes();
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

  const carregarTermosExistentes = async () => {
    try {
      const response = await apiFetch(`/api/termos-consentimento/${id}`);
      if (response.success) {
        setTermosExistentes(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar termos:', error);
    }
  };

  const salvarTermo = async () => {
    if (!termoData.aceito) {
      alert('É necessário marcar o aceite para salvar o termo');
      return;
    }

    try {
      setLoading(true);
      const response = await apiFetch('/api/termos-consentimento', {
        method: 'POST',
        body: JSON.stringify({
          ...termoData,
          data_aceite: new Date().toISOString()
        })
      });

      if (response.success) {
        alert('Termo de consentimento salvo com sucesso!');
        setActiveSection('historico');
        carregarTermosExistentes();
        // Reset form
        setTermoData({
          beneficiaria_id: parseInt(id || '0'),
          tipo_termo: 'lgpd',
          aceito: false,
          revogacao_informada: false,
          direitos_conhecidos: [],
          responsavel_aplicacao: 'Usuário Logado',
          local_aplicacao: 'Sede do Projeto Move Marias'
        });
      }
    } catch (error) {
      console.error('Erro ao salvar termo:', error);
      alert('Erro ao salvar termo de consentimento');
    } finally {
      setLoading(false);
    }
  };

  const gerarPDF = async (termoId: number) => {
    try {
      const response = await apiFetch(`/api/termos-consentimento/${termoId}/pdf`);
      if (response.success) {
        window.open(response.data.url, '_blank');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  const revogarTermo = async (termoId: number) => {
    if (!confirm('Deseja realmente revogar este termo de consentimento?')) {
      return;
    }

    try {
      const response = await apiFetch(`/api/termos-consentimento/${termoId}/revogar`, {
        method: 'PUT'
      });

      if (response.success) {
        alert('Termo revogado com sucesso!');
        carregarTermosExistentes();
      }
    } catch (error) {
      console.error('Erro ao revogar termo:', error);
    }
  };

  const generatePAEDI = (beneficiaria: any) => {
    if (!beneficiaria || !beneficiaria.id) return 'N/A';
    try {
      const dataCriacao = new Date(beneficiaria.data_cadastro || beneficiaria.data_criacao);
      if (isNaN(dataCriacao.getTime())) return 'N/A';
      
      const ano = dataCriacao.getFullYear().toString().slice(-2);
      const mes = (dataCriacao.getMonth() + 1).toString().padStart(2, '0');
      const sequence = beneficiaria.id.toString().padStart(3, '0').slice(-3);
      return `${ano}${mes}${sequence}`;
    } catch (err) {
      console.error('Erro ao gerar PAEDI:', err);
      return 'N/A';
    }
  };

  const handleDireitosChange = (direito: string, checked: boolean) => {
    if (checked) {
      setTermoData({
        ...termoData,
        direitos_conhecidos: [...(termoData.direitos_conhecidos || []), direito]
      });
    } else {
      setTermoData({
        ...termoData,
        direitos_conhecidos: (termoData.direitos_conhecidos || []).filter(d => d !== direito)
      });
    }
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
              <Shield className="h-6 w-6" />
              Termos de Consentimento
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
            variant={activeSection === 'novo' ? 'default' : 'ghost'}
            onClick={() => setActiveSection('novo')}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            Novo Termo
          </Button>
          <Button
            variant={activeSection === 'historico' ? 'default' : 'ghost'}
            onClick={() => setActiveSection('historico')}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Histórico
          </Button>
        </div>

        {/* Novo Termo */}
        {activeSection === 'novo' && (
          <div className="space-y-6">
            {/* Tipo de Termo */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Consentimento</CardTitle>
                <CardDescription>
                  Selecione o tipo de termo de consentimento a ser aplicado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_termo">Tipo do Termo</Label>
                  <Select
                    value={termoData.tipo_termo || ''}
                    onValueChange={(value: any) => setTermoData({...termoData, tipo_termo: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tiposTermos).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finalidades">Finalidades Específicas</Label>
                  <Textarea
                    id="finalidades"
                    placeholder="Descreva as finalidades específicas para o tratamento dos dados ou uso da imagem..."
                    value={termoData.finalidades_especificas || ''}
                    onChange={(e) => setTermoData({...termoData, finalidades_especificas: e.target.value})}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Direitos LGPD */}
            {termoData.tipo_termo === 'lgpd' && (
              <Card>
                <CardHeader>
                  <CardTitle>Direitos da LGPD</CardTitle>
                  <CardDescription>
                    Marque os direitos que foram explicados e compreendidos pela beneficiária
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {direitosLGPD.map((direito, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`direito-${index}`}
                          checked={(termoData.direitos_conhecidos || []).includes(direito)}
                          onCheckedChange={(checked) => handleDireitosChange(direito, !!checked)}
                        />
                        <Label htmlFor={`direito-${index}`} className="text-sm">
                          {direito}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Testemunhas */}
            <Card>
              <CardHeader>
                <CardTitle>Testemunhas (Opcional)</CardTitle>
                <CardDescription>
                  Informe os dados das testemunhas presentes na aplicação do termo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="testemunha1_nome">Nome da 1ª Testemunha</Label>
                    <Input
                      id="testemunha1_nome"
                      placeholder="Nome completo"
                      value={termoData.testemunha1_nome || ''}
                      onChange={(e) => setTermoData({...termoData, testemunha1_nome: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="testemunha1_cpf">CPF da 1ª Testemunha</Label>
                    <Input
                      id="testemunha1_cpf"
                      placeholder="000.000.000-00"
                      value={termoData.testemunha1_cpf || ''}
                      onChange={(e) => setTermoData({...termoData, testemunha1_cpf: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="testemunha2_nome">Nome da 2ª Testemunha</Label>
                    <Input
                      id="testemunha2_nome"
                      placeholder="Nome completo"
                      value={termoData.testemunha2_nome || ''}
                      onChange={(e) => setTermoData({...termoData, testemunha2_nome: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="testemunha2_cpf">CPF da 2ª Testemunha</Label>
                    <Input
                      id="testemunha2_cpf"
                      placeholder="000.000.000-00"
                      value={termoData.testemunha2_cpf || ''}
                      onChange={(e) => setTermoData({...termoData, testemunha2_cpf: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados da Aplicação */}
            <Card>
              <CardHeader>
                <CardTitle>Dados da Aplicação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="responsavel">Responsável pela Aplicação</Label>
                    <Input
                      id="responsavel"
                      placeholder="Nome do profissional responsável"
                      value={termoData.responsavel_aplicacao || ''}
                      onChange={(e) => setTermoData({...termoData, responsavel_aplicacao: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="local">Local da Aplicação</Label>
                    <Input
                      id="local"
                      placeholder="Local onde foi aplicado o termo"
                      value={termoData.local_aplicacao || ''}
                      onChange={(e) => setTermoData({...termoData, local_aplicacao: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Observações sobre a aplicação do termo..."
                    value={termoData.observacoes || ''}
                    onChange={(e) => setTermoData({...termoData, observacoes: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Consentimento */}
            <Card>
              <CardHeader>
                <CardTitle>Consentimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
                  <Checkbox
                    id="revogacao"
                    checked={termoData.revogacao_informada}
                    onCheckedChange={(checked) => setTermoData({...termoData, revogacao_informada: !!checked})}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="revogacao" className="text-sm font-medium">
                      Direito de Revogação Informado
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      A beneficiária foi informada sobre seu direito de revogar este consentimento a qualquer momento.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border-2 border-primary rounded-lg">
                  <Checkbox
                    id="aceite"
                    checked={termoData.aceito}
                    onCheckedChange={(checked) => setTermoData({...termoData, aceito: !!checked})}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="aceite" className="text-sm font-medium">
                      Aceite do Termo de Consentimento *
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Confirmo que li e compreendi todas as informações apresentadas e aceito os termos descritos.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={salvarTermo} 
                    disabled={loading || !termoData.aceito}
                    size="lg"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {loading ? 'Salvando...' : 'Salvar Termo de Consentimento'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Histórico */}
        {activeSection === 'historico' && (
          <Card>
            <CardHeader>
              <CardTitle>Termos de Consentimento Assinados</CardTitle>
              <CardDescription>
                Histórico de todos os termos de consentimento desta beneficiária
              </CardDescription>
            </CardHeader>
            <CardContent>
              {termosExistentes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum termo de consentimento encontrado
                </p>
              ) : (
                <div className="space-y-4">
                  {termosExistentes.map((termo, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Shield className={`h-4 w-4 ${termo.ativo ? 'text-green-500' : 'text-red-500'}`} />
                          <h3 className="font-medium">
                            {tiposTermos[termo.tipo_termo as keyof typeof tiposTermos]}
                          </h3>
                          {!termo.ativo && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                              Revogado
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => gerarPDF(termo.id)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          {termo.ativo && (
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => revogarTermo(termo.id)}
                            >
                              Revogar
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <strong>Data do Aceite:</strong> {format(new Date(termo.data_aceite), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                        <p>
                          <strong>Responsável:</strong> {termo.responsavel_aplicacao}
                        </p>
                        {termo.observacoes && (
                          <p>
                            <strong>Observações:</strong> {termo.observacoes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
