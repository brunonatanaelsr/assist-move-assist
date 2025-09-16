import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, UserPlus, Loader2 } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useAuth } from '@/hooks/useAuth';
import type { Beneficiaria } from '@/types/shared';
import { MaskedInput } from '@/components/form/MaskedInput';
import { useBeneficiariaValidation } from '@/hooks/useFormValidation';
import { translateErrorMessage } from '@/lib/apiError';
import useCEP from '@/hooks/useCEP';

export default function CadastroBeneficiaria() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    rg: '',
    orgao_emissor_rg: '',
    data_emissao_rg: '',
    data_nascimento: '',
    endereco: '',
    bairro: '',
    cep: '',
    cidade: '',
    estado: '',
    nis: '',
    contato1: '',
    contato2: '',
    referencia: '',
    data_inicio_instituto: new Date().toISOString().split('T')[0],
    programa_servico: ''
  });

  const { validateField, validateForm, clearFieldError } = useBeneficiariaValidation();
  const { fetchCEP, loading: loadingCEP, error: cepError } = useCEP();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpa erro do campo ao alterar
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const doValidateForm = () => {
    const { isValid, errors: validationErrors } = validateForm(formData as any);
    const combinedErrors: { [key: string]: string } = { ...validationErrors };

    if (!formData.contato1?.replace(/\D/g, '')) {
      combinedErrors.contato1 = 'Telefone é obrigatório';
    }
    if (!formData.data_nascimento) {
      combinedErrors.data_nascimento = 'Data de nascimento é obrigatória';
    }

    setFieldErrors(combinedErrors);

    if (!isValid || Object.keys(combinedErrors).length > 0) {
      setError('Verifique os campos destacados');
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doValidateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanData: any = {
        // Backend expects telefone/endereco fields
        nome_completo: formData.nome_completo,
        cpf: formData.cpf.replace(/\D/g, ''),
        rg: formData.rg || undefined,
        orgao_emissor_rg: formData.orgao_emissor_rg || undefined,
        data_emissao_rg: formData.data_emissao_rg || null,
        data_nascimento: formData.data_nascimento,
        endereco: formData.endereco || undefined,
        telefone: formData.contato1.replace(/\D/g, ''),
        contato2: formData.contato2 ? formData.contato2.replace(/\D/g, '') : null,
        bairro: formData.bairro || undefined,
        nis: formData.nis || null,
        referencia: formData.referencia || null,
        programa_servico: formData.programa_servico || null,
      };

      const data = await apiService.createBeneficiaria(cleanData);

      setSuccess(true);
      setTimeout(() => {
        navigate('/beneficiarias');
      }, 2000);

    } catch (error: any) {
      console.error('Erro ao cadastrar beneficiária:', error);
      const friendly = translateErrorMessage(error?.message);
      setError(`Erro ao cadastrar beneficiária: ${friendly}`);
    } finally {
      setLoading(false);
    }
  };

  const onBlurValidate = (field: string, value: string) => {
    const msg = validateField(field, value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (msg) {
        next[field] = msg;
      } else {
        delete next[field];
      }
      return next;
    });
    if (!msg) clearFieldError(field);
  };

  // CEP autocomplete
  const handleCepBlur = async () => {
    const data = await fetchCEP(formData.cep);
    if (data) {
      setFormData(prev => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }));
    }
  };

  // Atalhos de teclado: salvar (Ctrl/Cmd+S), cancelar (Esc)
  const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      (e.currentTarget as HTMLFormElement).requestSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      navigate('/beneficiarias');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/beneficiarias')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nova Beneficiária</h1>
          <p className="text-muted-foreground">
            Cadastro completo de nova beneficiária no sistema
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <Alert className="border-success" data-testid="success-message">
          <AlertDescription className="text-success">
            Beneficiária cadastrada com sucesso! Redirecionando...
            <Button variant="link" className="ml-2 p-0" onClick={() => navigate('/beneficiarias')} data-testid="voltar-lista">Voltar à lista</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" data-testid="error-message">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} onKeyDown={onKeyDown} className="space-y-6">
        {/* Dados Pessoais */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Dados Pessoais
            </CardTitle>
            <CardDescription>
              Informações básicas da beneficiária
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
              <Label htmlFor="nome_completo">Nome Completo *</Label>
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e) => handleInputChange('nome_completo', e.target.value)}
                onBlur={(e) => onBlurValidate('nome_completo', e.target.value)}
                placeholder="Nome completo da beneficiária"
                required
                aria-invalid={!!fieldErrors.nome_completo}
              />
              {fieldErrors.nome_completo && (
                <p className="text-sm text-destructive" data-testid="error-nome">{fieldErrors.nome_completo}</p>
              )}
              </div>
              <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <MaskedInput
                mask="cpf"
                id="cpf"
                value={formData.cpf}
                onValueChange={(masked, unmasked) => handleInputChange('cpf', masked)}
                onBlur={(e: any) => onBlurValidate('cpf', e.target.value)}
                placeholder="000.000.000-00"
                maxLength={14}
                required
                aria-invalid={!!fieldErrors.cpf}
              />
              {fieldErrors.cpf && (
                <p className="text-sm text-destructive" data-testid="error-cpf">{fieldErrors.cpf}</p>
              )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={formData.rg}
                  onChange={(e) => handleInputChange('rg', e.target.value)}
                  placeholder="Número do RG"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgao_emissor_rg">Órgão Emissor</Label>
                <Input
                  id="orgao_emissor_rg"
                  value={formData.orgao_emissor_rg}
                  onChange={(e) => handleInputChange('orgao_emissor_rg', e.target.value)}
                  placeholder="Ex: SSP-SP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_emissao_rg">Data de Emissão</Label>
                <Input
                  id="data_emissao_rg"
                  type="date"
                  value={formData.data_emissao_rg}
                  onChange={(e) => handleInputChange('data_emissao_rg', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                  onBlur={(e) => onBlurValidate('data_nascimento', e.target.value)}
                  required
                  aria-invalid={!!fieldErrors.data_nascimento}
                />
              {fieldErrors.data_nascimento && (
                <p className="text-sm text-destructive">{fieldErrors.data_nascimento}</p>
              )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nis">NIS</Label>
                <Input
                  id="nis"
                  value={formData.nis}
                  onChange={(e) => handleInputChange('nis', e.target.value)}
                  placeholder="Número de Identificação Social"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>
              Informações de endereço e localização
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => handleInputChange('cep', e.target.value)}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {loadingCEP && <p className="text-xs text-muted-foreground">Buscando endereço…</p>}
                {cepError && <p className="text-xs text-destructive">{cepError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={formData.cidade} onChange={(e) => handleInputChange('cidade', e.target.value)} placeholder="Cidade" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input id="estado" value={formData.estado} onChange={(e) => handleInputChange('estado', e.target.value)} placeholder="UF" maxLength={2} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço Completo</Label>
              <Textarea
                id="endereco"
                value={formData.endereco}
                onChange={(e) => handleInputChange('endereco', e.target.value)}
                placeholder="Rua, número, complemento..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.bairro}
                onChange={(e) => handleInputChange('bairro', e.target.value)}
                placeholder="Nome do bairro"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Contato</CardTitle>
            <CardDescription>
              Telefones e informações de contato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contato1">Telefone Principal *</Label>
                <MaskedInput
                  mask="telefone"
                  id="contato1"
                  name="telefone"
                  value={formData.contato1}
                  onValueChange={(masked) => handleInputChange('contato1', masked)}
                  onBlur={(e: any) => onBlurValidate('telefone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  required
                  aria-invalid={!!fieldErrors.contato1}
                />
              {fieldErrors.contato1 && (
                <p className="text-sm text-destructive">{fieldErrors.contato1}</p>
              )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contato2">Telefone Secundário</Label>
                <MaskedInput
                  mask="telefone"
                  id="contato2"
                  value={formData.contato2}
                  onValueChange={(masked) => handleInputChange('contato2', masked)}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados do Instituto */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Informações do Instituto</CardTitle>
            <CardDescription>
              Dados relacionados ao acompanhamento no instituto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="referencia">Como chegou ao Instituto</Label>
                <Select
                  value={formData.referencia}
                  onValueChange={(value) => handleInputChange('referencia', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indicacao">Indicação</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="redes_sociais">Redes Sociais</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="programa_servico">Programa/Serviço</Label>
                <Select
                  value={formData.programa_servico}
                  onValueChange={(value) => handleInputChange('programa_servico', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o programa..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oficinas_educativas">Oficinas Educativas</SelectItem>
                    <SelectItem value="acompanhamento_psicossocial">Acompanhamento Psicossocial</SelectItem>
                    <SelectItem value="capacitacao_profissional">Capacitação Profissional</SelectItem>
                    <SelectItem value="apoio_juridico">Apoio Jurídico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_inicio_instituto">Data de Início no Instituto</Label>
              <Input
                id="data_inicio_instituto"
                type="date"
                value={formData.data_inicio_instituto}
                onChange={(e) => handleInputChange('data_inicio_instituto', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/beneficiarias')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Cadastrar Beneficiária
          </Button>
        </div>
      </form>
    </div>
  );
}
