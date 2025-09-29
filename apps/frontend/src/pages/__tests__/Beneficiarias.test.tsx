import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BeneficiariasPage from '../Beneficiarias';
import * as useBeneficiariasListModule from '@/hooks/useBeneficiariasList';

vi.mock('@/hooks/useBeneficiariasList', () => ({
  __esModule: true,
  default: vi.fn(),
}));

describe('Beneficiarias page', () => {
  const baseHookResult: useBeneficiariasListModule.UseBeneficiariasListResult = {
    query: {} as any,
    beneficiarias: [],
    allBeneficiarias: [],
    filteredBeneficiarias: [],
    stats: { total: 0, ativas: 0, aguardando: 0, inativas: 0, desistentes: 0 } as any,
    rawStats: { total: 0, ativas: 0, aguardando: 0, inativas: 0, desistentes: 0 } as any,
    filters: {
      searchTerm: '',
      selectedStatus: 'Todas',
      programaFilter: 'Todos',
      currentPage: 1,
    },
    setFilters: vi.fn(),
    resetFilters: vi.fn(),
    hasSearch: false,
    showLoading: false,
    queryError: undefined,
    activeFilterCount: 0,
    pagination: {
      totalItems: 0,
      totalPages: 1,
      currentPage: 1,
      showingFrom: 0,
      showingTo: 0,
      pageSize: 10,
    },
    statusOptions: ['Todas', 'Ativa'],
    programOptions: [{ value: 'Todos', label: 'Todos' }],
    shouldPaginateClient: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useBeneficiariasListModule.default as unknown as Mock).mockReturnValue(baseHookResult);
  });

  it('renders loading skeleton when data is loading', () => {
    (useBeneficiariasListModule.default as unknown as Mock).mockReturnValue({
      ...baseHookResult,
      showLoading: true,
    });

    render(
      <MemoryRouter>
        <BeneficiariasPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('beneficiarias-loading')).toBeInTheDocument();
  });

  it('displays error alert when loading fails', () => {
    (useBeneficiariasListModule.default as unknown as Mock).mockReturnValue({
      ...baseHookResult,
      queryError: new Error('Falha ao listar'),
    });

    render(
      <MemoryRouter>
        <BeneficiariasPage />
      </MemoryRouter>
    );

    const alert = screen.getByTestId('beneficiarias-error');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Falha ao listar');
  });

  it('displays empty state when there are no beneficiarias', () => {
    render(
      <MemoryRouter>
        <BeneficiariasPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Nenhuma beneficiária cadastrada')).toBeInTheDocument();
  });
});
