import { useCallback, useMemo, useState } from 'react';
import { useCreateBeneficiaria } from '@/hooks/useApi';
import { useBeneficiariaValidation } from '@/hooks/useFormValidation';
import { translateErrorMessage } from '@/lib/apiError';
import useCEP from '@/hooks/useCEP';

type FormFieldErrors = Record<string, string | undefined>;

type UseBeneficiariaFormOptions = {
  onSuccess?: (payload: { message: string }) => void;
};

type BeneficiariaFormData = {
  nome_completo: string;
  cpf: string;
  rg: string;
  orgao_emissor_rg: string;
  data_emissao_rg: string;
  data_nascimento: string;
  endereco: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  nis: string;
  contato1: string;
  contato2: string;
  referencia: string;
  data_inicio_instituto: string;
  programa_servico: string;
};

export const createInitialBeneficiariaFormData = (): BeneficiariaFormData => ({
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
  programa_servico: '',
});

const sanitizePayload = (formData: BeneficiariaFormData) => {
  const digits = (value: string) => value.replace(/\D/g, '');

  return {
    nome_completo: formData.nome_completo,
    cpf: digits(formData.cpf),
    rg: formData.rg || undefined,
    orgao_emissor_rg: formData.orgao_emissor_rg || undefined,
    data_emissao_rg: formData.data_emissao_rg || null,
    data_nascimento: formData.data_nascimento,
    endereco: formData.endereco || undefined,
    telefone: digits(formData.contato1),
    contato2: formData.contato2 ? digits(formData.contato2) : null,
    bairro: formData.bairro || undefined,
    nis: formData.nis || null,
    referencia: formData.referencia || null,
    programa_servico: formData.programa_servico || null,
  };
};

export const useBeneficiariaForm = (options: UseBeneficiariaFormOptions = {}) => {
  const [formData, setFormData] = useState<BeneficiariaFormData>(createInitialBeneficiariaFormData);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { validateField, validateForm, clearFieldError } = useBeneficiariaValidation();
  const { mutateAsync, isPending } = useCreateBeneficiaria();
  const { fetchCEP, loading: loadingCEP, error: cepError } = useCEP();

  const handleInputChange = useCallback((field: keyof BeneficiariaFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setFieldErrors((prev) => {
      const keysToClear = new Set<string>([field]);
      if (field === 'contato1') {
        keysToClear.add('telefone');
      }

      let changed = false;
      const next = { ...prev };
      keysToClear.forEach((key) => {
        if (next[key]) {
          delete next[key];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, []);

  const onBlurValidate = useCallback((field: string, value: string) => {
    const message = validateField(field, value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
    if (!message) {
      clearFieldError(field);
    }
  }, [clearFieldError, validateField]);

  const validateBeforeSubmit = useCallback(() => {
    const { isValid, errors: validationErrors } = validateForm(formData as any);
    const combinedErrors: FormFieldErrors = { ...validationErrors };

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
  }, [formData, validateForm]);

  const handleCepBlur = useCallback(async () => {
    const data = await fetchCEP(formData.cep);
    if (data) {
      setFormData((prev) => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }));
    }
  }, [fetchCEP, formData.cep]);

  const handleSubmit = useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!validateBeforeSubmit()) {
      return;
    }

    setError(null);
    setSuccess(false);
    setSuccessMessage(null);

    try {
      const payload = sanitizePayload(formData);
      await mutateAsync(payload as any);

      const message = 'Beneficiária cadastrada com sucesso! Redirecionando...';
      setSuccess(true);
      setSuccessMessage(message);
      options.onSuccess?.({ message });
    } catch (err: any) {
      console.error('Erro ao cadastrar beneficiária:', err);
      const apiMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      const friendly = translateErrorMessage(apiMessage);
      setSuccess(false);
      setSuccessMessage(null);
      setError(`Erro ao cadastrar beneficiária: ${friendly}`);
    }
  }, [formData, mutateAsync, options, validateBeforeSubmit]);

  const isSubmitDisabled = useMemo(() => isPending, [isPending]);

  return {
    formData,
    fieldErrors,
    error,
    success,
    successMessage,
    loading: isSubmitDisabled,
    loadingCEP,
    cepError,
    handleInputChange,
    onBlurValidate,
    handleSubmit,
    handleCepBlur,
  };
};

export default useBeneficiariaForm;
