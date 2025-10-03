import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import type { Pagination } from '@/types/api';
import { toast } from 'sonner';
import { z } from 'src/openapi/init';
import { beneficiariaSchema } from '../validation/zodSchemas';

type Beneficiaria = z.infer<typeof beneficiariaSchema>;

// Hooks para beneficiárias
type BeneficiariasQueryResult = { data: Beneficiaria[]; pagination?: Pagination };

export const useBeneficiarias = (params?: { page?: number; limit?: number }) => {
  const queryKey = ['beneficiarias', params] as const;

  return useQuery<BeneficiariasQueryResult>({
    queryKey,
    queryFn: async () => {
      const response = await apiService.getBeneficiarias(params);
      if (!response.success) {
        throw new Error(response.message);
      }

      const payload = response.data;
      const data = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as any)?.data)
          ? (payload as any).data
          : [];

      const pagination = (!Array.isArray(payload) && (payload as any)?.pagination)
        || response.pagination;

      return {
        data,
        pagination,
      };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}


export const useCreateBeneficiaria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Beneficiaria) => {
      const response = await apiService.createBeneficiaria(data as any);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiarias'] });
      toast.success('Beneficiária cadastrada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cadastrar beneficiária: ${error.message}`);
    },
  });
}

export const useUpdateBeneficiaria = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Beneficiaria>) => {
      const response = await apiService.updateBeneficiaria(id, data as any);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiarias'] });
      queryClient.invalidateQueries({ queryKey: ['beneficiaria', id] });
      toast.success('Beneficiária atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar beneficiária: ${error.message}`);
    },
  });
};

// Hooks para atividades
export const useAtividades = (beneficiariaId: string) => {
  return useQuery({
    queryKey: ['atividades', beneficiariaId],
    queryFn: async () => {
      const response = await apiService.get<any>(`/beneficiarias/${beneficiariaId}/atividades`);
      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar atividades');
      }
      return response.data?.data;
    },
    enabled: !!beneficiariaId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
export default useBeneficiarias;

// Hooks para participações
const participacoesQueryKey = (params: { beneficiaria_id: string }) =>
  ['participacoes', params] as const;

export const useParticipacoes = (beneficiariaId: string) => {
  const params = { beneficiaria_id: beneficiariaId };
  const queryKey = participacoesQueryKey(params);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await apiService.getParticipacoes(params);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!beneficiariaId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateParticipacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiService.createParticipacao(data);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      if (variables?.beneficiaria_id) {
        const queryKey = participacoesQueryKey({ beneficiaria_id: variables.beneficiaria_id });
        queryClient.invalidateQueries({ queryKey });
      }
      toast.success('Participação registrada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar participação: ${error.message}`);
    },
  });
};

export const useUpdateParticipacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data, beneficiaria_id }: { id: string; data: any; beneficiaria_id?: string }) => {
      const response = await apiService.updateParticipacao(id, data);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      const beneficiariaId = variables.beneficiaria_id ?? variables.data?.beneficiaria_id;
      if (beneficiariaId) {
        const queryKey = participacoesQueryKey({ beneficiaria_id: beneficiariaId });
        queryClient.invalidateQueries({ queryKey });
      }
      toast.success('Participação atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar participação: ${error.message}`);
    },
  });
};
