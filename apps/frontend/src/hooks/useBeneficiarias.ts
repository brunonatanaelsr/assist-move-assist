import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { beneficiariasService } from '../services/api';
import type { Beneficiaria } from '@/types/shared';
import type {
  BeneficiariaListResponse,
  BeneficiariaResponse,
  BeneficiariaResumoResponse,
  ListBeneficiariasParams,
} from '@/types/beneficiarias';
import { toast } from 'sonner';

const normalizeListResponse = (response: BeneficiariaListResponse): BeneficiariaListResponse => {
  const items = response.data?.items ?? [];
  const pagination = response.data?.pagination ?? response.pagination;

  return {
    ...response,
    data: {
      items,
      pagination,
    },
    pagination,
  } satisfies BeneficiariaListResponse;
};

// Keys para React Query
export const beneficiariasKeys = {
  all: ['beneficiarias'] as const,
  lists: () => [...beneficiariasKeys.all, 'list'] as const,
  list: (filters?: Record<string, string | number | undefined>) => [...beneficiariasKeys.lists(), { filters }] as const,
  details: () => [...beneficiariasKeys.all, 'detail'] as const,
  detail: (id: string) => [...beneficiariasKeys.details(), id] as const,
};

// Hook para listar beneficiárias
export const useBeneficiarias = (params: ListBeneficiariasParams = {}): UseQueryResult<BeneficiariaListResponse> => {
  return useQuery<BeneficiariaListResponse, Error, BeneficiariaListResponse>({
    queryKey: beneficiariasKeys.list(params),
    queryFn: () => beneficiariasService.listar(params),
    select: normalizeListResponse,
  });
};

export default useBeneficiarias;

// Hook para buscar beneficiária por ID
export const useBeneficiaria = (id: string): UseQueryResult<BeneficiariaResponse> => {
  return useQuery<BeneficiariaResponse>({
    queryKey: beneficiariasKeys.detail(id),
    queryFn: () => beneficiariasService.buscarPorId(id),
    enabled: !!id,
  });
};

// Hook para buscar resumo da beneficiária
export const useBeneficiariaResumo = (id: string): UseQueryResult<BeneficiariaResumoResponse> => {
  return useQuery<BeneficiariaResumoResponse>({
    queryKey: [...beneficiariasKeys.detail(id), 'resumo'],
    queryFn: () => beneficiariasService.buscarResumo(id),
    enabled: !!id,
  });
};

// Hook para criar beneficiária
export const useCreateBeneficiaria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: beneficiariasService.criar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: beneficiariasKeys.lists() });
      toast.success('Beneficiária cadastrada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cadastrar beneficiária: ${error.message}`);
    },
  });
};

// Hook para atualizar beneficiária
export const useUpdateBeneficiaria = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Beneficiaria>) => beneficiariasService.atualizar(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: beneficiariasKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: beneficiariasKeys.lists() });
      toast.success('Beneficiária atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar beneficiária: ${error.message}`);
    },
  });
};

// Hook para excluir beneficiária
export const useDeleteBeneficiaria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: beneficiariasService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: beneficiariasKeys.lists() });
      toast.success('Beneficiária removida com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover beneficiária: ${error.message}`);
    },
  });
};
