import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { translateErrorMessage } from '@/lib/apiError';
import type { DashboardStatsResponse } from '@/types/dashboard';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  activities: () => [...dashboardKeys.all, 'activities'] as const,
  tasks: () => [...dashboardKeys.all, 'tasks'] as const,
};

export interface DashboardStatsSummary {
  totalBeneficiarias: number;
  beneficiariasAtivas: number;
  beneficiariasInativas: number;
  formularios: number;
  atendimentosMes: number;
  engajamento: string;
}

export interface DashboardActivity {
  id: string | number;
  icon?: string;
  type?: string;
  description?: string;
  time?: string | Date;
  [key: string]: unknown;
}

export interface DashboardTask {
  id: string | number;
  title?: string;
  due?: string;
  priority?: string;
  [key: string]: unknown;
}

export const defaultDashboardStats: DashboardStatsSummary = {
  totalBeneficiarias: 0,
  beneficiariasAtivas: 0,
  beneficiariasInativas: 0,
  formularios: 0,
  atendimentosMes: 0,
  engajamento: '0%',
};

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function normalizeStats(data?: DashboardStatsResponse | null): DashboardStatsSummary {
  if (!data) {
    return { ...defaultDashboardStats };
  }

  const engajamentoValor = (() => {
    if (typeof data.engajamento === 'number') {
      return data.engajamento;
    }
    if (typeof data.engajamento === 'string') {
      const parsed = Number.parseFloat(data.engajamento.replace(/%/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  })();

  return {
    totalBeneficiarias: toNumber(data.totalBeneficiarias),
    beneficiariasAtivas: toNumber(data.activeBeneficiarias),
    beneficiariasInativas: toNumber(data.inactiveBeneficiarias),
    formularios: toNumber(data.totalFormularios),
    atendimentosMes: toNumber(data.totalAtendimentos),
    engajamento: `${engajamentoValor}%`,
  };
}

type StatsQueryOptions = Omit<
  UseQueryOptions<DashboardStatsSummary, Error, DashboardStatsSummary, ReturnType<typeof dashboardKeys.stats>>,
  'queryKey' | 'queryFn'
>;

type ActivitiesQueryOptions = Omit<
  UseQueryOptions<DashboardActivity[], Error, DashboardActivity[], ReturnType<typeof dashboardKeys.activities>>,
  'queryKey' | 'queryFn'
>;

type TasksQueryOptions = Omit<
  UseQueryOptions<DashboardTask[], Error, DashboardTask[], ReturnType<typeof dashboardKeys.tasks>>,
  'queryKey' | 'queryFn'
>;

export function useDashboardStats(options?: StatsQueryOptions) {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async () => {
      const response = await apiService.getDashboardStats();
      if (!response.success) {
        throw new Error(translateErrorMessage(response.message));
      }
      return normalizeStats(response.data ?? null);
    },
    placeholderData: defaultDashboardStats,
    ...options,
  });
}

export function useDashboardActivities(options?: ActivitiesQueryOptions) {
  return useQuery({
    queryKey: dashboardKeys.activities(),
    queryFn: async () => {
      const response = await apiService.getDashboardActivities();
      if (!response.success) {
        throw new Error(translateErrorMessage(response.message));
      }
      return Array.isArray(response.data) ? response.data : [];
    },
    initialData: [],
    ...options,
  });
}

export function useDashboardTasks(options?: TasksQueryOptions) {
  return useQuery({
    queryKey: dashboardKeys.tasks(),
    queryFn: async () => {
      const response = await apiService.getDashboardTasks();
      if (!response.success) {
        throw new Error(translateErrorMessage(response.message));
      }
      return Array.isArray(response.data) ? response.data : [];
    },
    initialData: [],
    ...options,
  });
}

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    invalidateStats: () => queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() }),
    invalidateActivities: () => queryClient.invalidateQueries({ queryKey: dashboardKeys.activities() }),
    invalidateTasks: () => queryClient.invalidateQueries({ queryKey: dashboardKeys.tasks() }),
  };
}

