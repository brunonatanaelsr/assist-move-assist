import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { apiService } from '@/services/apiService';
import {
  useDashboardStats,
  useDashboardActivities,
  useDashboardTasks,
  useInvalidateDashboard,
  defaultDashboardStats,
  dashboardKeys,
} from '../useDashboard';
import { translateErrorMessage } from '@/lib/apiError';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { Wrapper, queryClient };
}

describe('useDashboard hooks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna estatísticas normalizadas com sucesso', async () => {
    const { Wrapper } = createWrapper();

    vi.spyOn(apiService, 'getDashboardStats').mockResolvedValue({
      success: true,
      data: {
        totalBeneficiarias: '5',
        activeBeneficiarias: 3,
        inactiveBeneficiarias: 2,
        totalFormularios: '10',
        totalAtendimentos: 4,
        engajamento: 75,
      },
    } as any);

    const { result } = renderHook(() => useDashboardStats(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        totalBeneficiarias: 5,
        beneficiariasAtivas: 3,
        beneficiariasInativas: 2,
        formularios: 10,
        atendimentosMes: 4,
        engajamento: '75%',
      });
    });
  });

  it('usa valores padrão quando não há dados de estatística', async () => {
    const { Wrapper } = createWrapper();

    vi.spyOn(apiService, 'getDashboardStats').mockResolvedValue({
      success: true,
      data: undefined,
    } as any);

    const { result } = renderHook(() => useDashboardStats(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(defaultDashboardStats);
    });
  });

  it('propaga erro traduzido ao carregar estatísticas', async () => {
    const { Wrapper } = createWrapper();
    const errorMessage = 'Erro interno do servidor';

    vi.spyOn(apiService, 'getDashboardStats').mockResolvedValue({
      success: false,
      message: errorMessage,
    } as any);

    const { result } = renderHook(() => useDashboardStats(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe(translateErrorMessage(errorMessage));
  });

  it('retorna lista de atividades', async () => {
    const { Wrapper } = createWrapper();
    const activities = [{ id: 1 }, { id: 2 }];

    vi.spyOn(apiService, 'getDashboardActivities').mockResolvedValue({
      success: true,
      data: activities,
    } as any);

    const { result } = renderHook(() => useDashboardActivities(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(activities);
    });
  });

  it('retorna lista de tarefas', async () => {
    const { Wrapper } = createWrapper();
    const tasks = [{ id: 'a' }];

    vi.spyOn(apiService, 'getDashboardTasks').mockResolvedValue({
      success: true,
      data: tasks,
    } as any);

    const { result } = renderHook(() => useDashboardTasks(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(tasks);
    });
  });

  it('retorna listas vazias quando a API falha para atividades e tarefas', async () => {
    const { Wrapper } = createWrapper();
    const errorMessage = 'Erro 500';

    vi.spyOn(apiService, 'getDashboardActivities').mockResolvedValue({
      success: false,
      message: errorMessage,
    } as any);

    const activitiesHook = renderHook(() => useDashboardActivities(), { wrapper: Wrapper });

    await waitFor(() => expect(activitiesHook.result.current.isError).toBe(true));
    expect(activitiesHook.result.current.error?.message).toBe(translateErrorMessage(errorMessage));

    vi.spyOn(apiService, 'getDashboardTasks').mockResolvedValue({
      success: false,
      message: errorMessage,
    } as any);

    const tasksHook = renderHook(() => useDashboardTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(tasksHook.result.current.isError).toBe(true));
    expect(tasksHook.result.current.error?.message).toBe(translateErrorMessage(errorMessage));
  });

  it('invalida caches relevantes', () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useInvalidateDashboard(), { wrapper: Wrapper });

    result.current.invalidateAll();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.all });

    result.current.invalidateStats();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.stats() });

    result.current.invalidateActivities();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.activities() });

    result.current.invalidateTasks();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.tasks() });
  });
});

