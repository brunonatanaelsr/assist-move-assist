import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import type { UseQueryResult } from '@tanstack/react-query';
import Dashboard from '../Dashboard';
import type { DashboardStatsSummary, DashboardActivity, DashboardTask } from '@/hooks/useDashboard';

const toastMock = vi.fn();

vi.mock('@/components/ui/use-toast', () => {
  return {
    useToast: () => ({
      toast: toastMock,
    }),
  };
});

const createQueryResult = <T,>(
  overrides: Partial<UseQueryResult<T, Error>> = {},
): UseQueryResult<T, Error> => ({
  data: undefined,
  error: null,
  isLoading: false,
  isError: false,
  status: 'success',
  fetchStatus: 'idle',
  refetch: vi.fn(),
  isFetching: false,
  isSuccess: true,
  failureCount: 0,
  isFetched: true,
  isFetchedAfterMount: true,
  isFetchingNextPage: false,
  isFetchingPreviousPage: false,
  isInitialLoading: false,
  isPaused: false,
  isPlaceholderData: false,
  isRefetchError: false,
  isRefetching: false,
  dataUpdatedAt: 0,
  errorUpdatedAt: 0,
  ...overrides,
} as UseQueryResult<T, Error>);

const statsMock = vi.fn<[], UseQueryResult<DashboardStatsSummary, Error>>();
const activitiesMock = vi.fn<[], UseQueryResult<DashboardActivity[], Error>>();
const tasksMock = vi.fn<[], UseQueryResult<DashboardTask[], Error>>();

vi.mock('@/hooks/useDashboard', () => ({
  useDashboardStats: () => statsMock(),
  useDashboardActivities: () => activitiesMock(),
  useDashboardTasks: () => tasksMock(),
  defaultDashboardStats: {
    totalBeneficiarias: 0,
    beneficiariasAtivas: 0,
    beneficiariasInativas: 0,
    formularios: 0,
    atendimentosMes: 0,
    engajamento: '0%',
  },
}));

describe('Dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockClear();
  });

  const renderDashboard = () =>
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

  it('exibe estatísticas e listas quando carregamento é bem sucedido', () => {
    statsMock.mockReturnValue(
      createQueryResult<DashboardStatsSummary>({
        data: {
          totalBeneficiarias: 10,
          beneficiariasAtivas: 7,
          beneficiariasInativas: 3,
          formularios: 5,
          atendimentosMes: 2,
          engajamento: '50%',
        },
      }),
    );
    activitiesMock.mockReturnValue(
      createQueryResult<DashboardActivity[]>({
        data: [
          { id: 1, type: 'Teste', description: 'Descrição', time: new Date().toISOString() },
        ],
      }),
    );
    tasksMock.mockReturnValue(
      createQueryResult<DashboardTask[]>({
        data: [
          { id: 1, title: 'Tarefa', due: '2024-01-01', priority: 'Alta' },
        ],
      }),
    );

    renderDashboard();

    expect(screen.getByTestId('stats-beneficiarias-count')).toHaveTextContent('10');
    expect(screen.getByText('Descrição')).toBeInTheDocument();
    expect(screen.getByText('Tarefa')).toBeInTheDocument();
  });

  it('exibe estados de carregamento quando consultas ainda estão carregando', () => {
    const loadingResult = createQueryResult({
      isLoading: true,
      isSuccess: false,
      status: 'pending',
    });

    statsMock.mockReturnValue(loadingResult);
    activitiesMock.mockReturnValue(loadingResult);
    tasksMock.mockReturnValue(loadingResult);

    renderDashboard();

    expect(screen.getAllByText('Carregando...').length).toBeGreaterThan(0);
    expect(screen.getByText('Carregando atividades...')).toBeInTheDocument();
    expect(screen.getByText('Carregando tarefas...')).toBeInTheDocument();
  });

  it('exibe mensagens de erro e dispara toast quando consultas falham', () => {
    const error = new Error('Erro interno do servidor');
    const errorResult = createQueryResult({
      isError: true,
      isSuccess: false,
      error,
      status: 'error',
    });

    statsMock.mockReturnValue(errorResult);
    activitiesMock.mockReturnValue(errorResult);
    tasksMock.mockReturnValue(errorResult);

    renderDashboard();

    expect(screen.getAllByText(/Erro interno do servidor/).length).toBeGreaterThan(0);
    expect(toastMock).toHaveBeenCalled();
  });
});

