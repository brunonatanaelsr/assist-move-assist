import { act, renderHook } from '@testing-library/react';
import { vi, describe, beforeEach, it, expect } from 'vitest';

vi.mock('@/hooks/useApi', () => ({
  useCreateBeneficiaria: vi.fn(),
}));

vi.mock('@/hooks/useFormValidation', () => ({
  useBeneficiariaValidation: vi.fn(),
}));

vi.mock('@/hooks/useCEP', () => ({
  __esModule: true,
  default: vi.fn(),
}));

import { useBeneficiariaForm } from '../useBeneficiariaForm';
import { useCreateBeneficiaria } from '@/hooks/useApi';
import { useBeneficiariaValidation } from '@/hooks/useFormValidation';
import useCEP from '@/hooks/useCEP';

describe('useBeneficiariaForm', () => {
  const mutateAsync = vi.fn();
  const validateForm = vi.fn();
  const validateField = vi.fn();
  const clearFieldError = vi.fn();
  const fetchCEP = vi.fn();

  const useCreateBeneficiariaMock = vi.mocked(useCreateBeneficiaria);
  const useBeneficiariaValidationMock = vi.mocked(useBeneficiariaValidation);
  const useCEPMock = vi.mocked(useCEP);

  beforeEach(() => {
    vi.clearAllMocks();

    useCreateBeneficiariaMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    useBeneficiariaValidationMock.mockReturnValue({
      validateForm,
      validateField,
      clearFieldError,
    });

    useCEPMock.mockReturnValue({
      fetchCEP,
      loading: false,
      error: null,
    });
  });

  it('submits sanitized payload and triggers success callback', async () => {
    validateForm.mockReturnValue({ isValid: true, errors: {} });
    mutateAsync.mockResolvedValueOnce({});
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useBeneficiariaForm({ onSuccess }));

    act(() => {
      result.current.handleInputChange('nome_completo', 'Fulana de Tal');
      result.current.handleInputChange('cpf', '123.456.789-01');
      result.current.handleInputChange('data_nascimento', '2000-01-01');
      result.current.handleInputChange('contato1', '(11) 99999-9999');
      result.current.handleInputChange('contato2', '(11) 98888-7777');
      result.current.handleInputChange('rg', '1234567');
      result.current.handleInputChange('orgao_emissor_rg', 'SSP');
      result.current.handleInputChange('data_emissao_rg', '2020-01-01');
      result.current.handleInputChange('endereco', 'Rua X, 123');
      result.current.handleInputChange('bairro', 'Centro');
      result.current.handleInputChange('nis', '123');
      result.current.handleInputChange('referencia', 'indicacao');
      result.current.handleInputChange('programa_servico', 'programa');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      nome_completo: 'Fulana de Tal',
      cpf: '12345678901',
      rg: '1234567',
      orgao_emissor_rg: 'SSP',
      data_emissao_rg: '2020-01-01',
      data_nascimento: '2000-01-01',
      endereco: 'Rua X, 123',
      telefone: '11999999999',
      contato2: '11988887777',
      bairro: 'Centro',
      nis: '123',
      referencia: 'indicacao',
      programa_servico: 'programa',
    });

    expect(result.current.success).toBe(true);
    expect(result.current.successMessage).toBe('Beneficiária cadastrada com sucesso! Redirecionando...');
    expect(onSuccess).toHaveBeenCalledWith({ message: 'Beneficiária cadastrada com sucesso! Redirecionando...' });
  });

  it('sets error when validation fails', async () => {
    validateForm.mockReturnValue({ isValid: false, errors: { nome_completo: 'obrigatório' } });
    const { result } = renderHook(() => useBeneficiariaForm());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Verifique os campos destacados');
  });

  it('translates API errors when mutation fails', async () => {
    validateForm.mockReturnValue({ isValid: true, errors: {} });
    mutateAsync.mockRejectedValueOnce({ response: { data: { message: 'CPF inválido' } } });

    const { result } = renderHook(() => useBeneficiariaForm());

    act(() => {
      result.current.handleInputChange('data_nascimento', '2000-01-01');
      result.current.handleInputChange('contato1', '(11) 99999-9999');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Erro ao cadastrar beneficiária: Verifique o CPF informado. Use um CPF válido.');
    expect(result.current.success).toBe(false);
  });

  it('preenche dados de endereço a partir do CEP', async () => {
    validateForm.mockReturnValue({ isValid: true, errors: {} });
    fetchCEP.mockResolvedValueOnce({
      logradouro: 'Rua Y',
      bairro: 'Bairro Z',
      localidade: 'Cidade W',
      uf: 'SP',
    });

    const { result } = renderHook(() => useBeneficiariaForm());

    act(() => {
      result.current.handleInputChange('cep', '01001-000');
    });

    await act(async () => {
      await result.current.handleCepBlur();
    });

    expect(fetchCEP).toHaveBeenCalledWith('01001-000');
    expect(result.current.formData.endereco).toBe('Rua Y');
    expect(result.current.formData.bairro).toBe('Bairro Z');
    expect(result.current.formData.cidade).toBe('Cidade W');
    expect(result.current.formData.estado).toBe('SP');
  });
});
