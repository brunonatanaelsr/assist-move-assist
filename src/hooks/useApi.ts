import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { toast } from 'sonner';
import { z } from 'zod';
import { beneficiariaSchema } from '../validation/zodSchemas';

type Beneficiaria = z.infer<typeof beneficiariaSchema>;

// Hooks para beneficiárias
export const useBeneficiarias = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['beneficiarias', params],
    queryFn: async () => {
      const response = await apiService.getBeneficiarias();
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
};

export const useBeneficiaria = (id: string) => {
  return useQuery({
    queryKey: ['beneficiaria', id],
    queryFn: async () => {
      const response = await apiService.getBeneficiaria(id);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
};

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
};

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
};

// Hooks para participações
export const useParticipacoes = (beneficiariaId: string) => {
  return useQuery({
    queryKey: ['participacoes', beneficiariaId],
    queryFn: async () => {
      const response = await apiService.getParticipacoes(beneficiariaId);
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
      queryClient.invalidateQueries({
        queryKey: ['participacoes', variables.beneficiaria_id],
      });
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
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiService.updateParticipacao(id, data);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['participacoes'],
      });
      toast.success('Participação atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar participação: ${error.message}`);
    },
  });
};
