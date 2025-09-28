import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('@/hooks/useBeneficiariaForm', () => ({
  useBeneficiariaForm: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

import CadastroBeneficiaria from '../CadastroBeneficiaria';
import { useBeneficiariaForm } from '@/hooks/useBeneficiariaForm';
import { useNavigate } from 'react-router-dom';

describe('CadastroBeneficiaria page', () => {
  const useBeneficiariaFormMock = vi.mocked(useBeneficiariaForm);
  const useNavigateMock = vi.mocked(useNavigate);

  const createHookReturn = () => ({
    formData: {
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
      data_inicio_instituto: '2024-01-01',
      programa_servico: '',
    },
    fieldErrors: {},
    error: null,
    success: false,
    successMessage: null,
    loading: false,
    loadingCEP: false,
    cepError: null,
    handleInputChange: vi.fn(),
    onBlurValidate: vi.fn(),
    handleSubmit: vi.fn(),
    handleCepBlur: vi.fn(),
  });

  let hookReturn: ReturnType<typeof createHookReturn>;
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    hookReturn = createHookReturn();
    navigateMock = vi.fn();
    useBeneficiariaFormMock.mockReturnValue(hookReturn as any);
    useNavigateMock.mockReturnValue(navigateMock as any);
  });

  it('renders layout and calls submit handler', () => {
    const { container } = render(<CadastroBeneficiaria />);

    expect(screen.getByText('Nova Beneficiária')).toBeInTheDocument();

    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(hookReturn.handleSubmit).toHaveBeenCalled();
    expect(useBeneficiariaForm).toHaveBeenCalledWith(expect.objectContaining({ onSuccess: expect.any(Function) }));
  });

  it('propagates input changes to hook handlers', () => {
    render(<CadastroBeneficiaria />);

    fireEvent.change(screen.getByLabelText('Nome Completo *'), { target: { value: 'Fulana' } });
    expect(hookReturn.handleInputChange).toHaveBeenCalledWith('nome_completo', 'Fulana');

    fireEvent.blur(screen.getByLabelText('CPF *'), { target: { value: '123.456.789-01' } });
    expect(hookReturn.onBlurValidate).toHaveBeenCalledWith('cpf', '123.456.789-01');
  });

  it('shows messages based on hook state', () => {
    const navigate = vi.fn();
    useNavigateMock.mockReturnValue(navigate as any);
    useBeneficiariaFormMock.mockReturnValue({
      ...hookReturn,
      success: true,
      successMessage: 'Tudo certo',
    } as any);

    render(<CadastroBeneficiaria />);

    expect(screen.getByTestId('success-message')).toHaveTextContent('Tudo certo');
    fireEvent.click(screen.getByTestId('voltar-lista'));
    expect(navigate).toHaveBeenCalledWith('/beneficiarias');
  });

  it('displays error alert when hook sets error', () => {
    useBeneficiariaFormMock.mockReturnValue({
      ...hookReturn,
      error: 'Erro ao salvar',
    } as any);

    render(<CadastroBeneficiaria />);

    expect(screen.getByTestId('error-message')).toHaveTextContent('Erro ao salvar');
  });
});
