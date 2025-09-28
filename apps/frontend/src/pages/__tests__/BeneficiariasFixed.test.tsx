import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BeneficiariasFixed from '../BeneficiariasFixed';
import * as beneficiariasHooks from '@/hooks/useBeneficiarias';

vi.mock('@/hooks/useBeneficiarias', () => ({
  useBeneficiarias: vi.fn(),
  useBeneficiaria: vi.fn(),
}));

describe('BeneficiariasFixed page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (beneficiariasHooks.useBeneficiarias as unknown as Mock).mockReturnValue({
      data: { success: true, data: { items: [], pagination: undefined } },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    (beneficiariasHooks.useBeneficiaria as unknown as Mock).mockReturnValue({});
  });

  it('renders loading skeleton when data is loading', () => {
    (beneficiariasHooks.useBeneficiarias as unknown as Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      isError: false,
    });

    render(
      <MemoryRouter>
        <BeneficiariasFixed />
      </MemoryRouter>
    );

    expect(screen.getByTestId('beneficiarias-loading')).toBeInTheDocument();
  });

  it('displays error alert when loading fails', () => {
    (beneficiariasHooks.useBeneficiarias as unknown as Mock).mockReturnValue({
      data: { success: true, data: { items: [], pagination: undefined } },
      isLoading: false,
      isError: true,
      error: new Error('Falha ao listar'),
      isFetching: false,
    });

    render(
      <MemoryRouter>
        <BeneficiariasFixed />
      </MemoryRouter>
    );

    const alert = screen.getByTestId('beneficiarias-error');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Falha ao listar');
  });

  it('displays backend error message when request succeeds with failure response', () => {
    (beneficiariasHooks.useBeneficiarias as unknown as Mock).mockReturnValue({
      data: { success: false, message: 'Erro remoto', data: { items: [], pagination: undefined } },
      isLoading: false,
      isError: false,
      isFetching: false,
    });

    render(
      <MemoryRouter>
        <BeneficiariasFixed />
      </MemoryRouter>
    );

    const alert = screen.getByTestId('beneficiarias-error');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Erro remoto');
  });
});
