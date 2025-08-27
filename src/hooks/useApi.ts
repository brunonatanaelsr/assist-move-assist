import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { z } from 'zod';
import { beneficiariaSchema } from '../validation/zodSchemas';

type Beneficiaria = z.infer<typeof beneficiariaSchema>;

// Hooks para beneficiárias
export const useBeneficiarias = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['beneficiarias', params],
    queryFn: async () => {
      const response = await api.getBeneficiarias();
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
  });
};

export const useBeneficiaria = (id: string) => {
  return useQuery({
    queryKey: ['beneficiaria', id],
    queryFn: async () => {
      const response = await api.getBeneficiaria(id);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateBeneficiaria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Beneficiaria) => {
      const response = await api.createBeneficiaria(data);
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
      const response = await api.updateBeneficiaria(id, data);
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
      const response = await api.getAtividades(beneficiariaId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!beneficiariaId,
  });
};

// Hooks para participações
export const useParticipacoes = (beneficiariaId: string) => {
  return useQuery({
    queryKey: ['participacoes', beneficiariaId],
    queryFn: async () => {
      const response = await api.getParticipacoes(beneficiariaId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!beneficiariaId,
  });
};

export const useCreateParticipacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.createParticipacao(data);
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
      const response = await api.updateParticipacao(id, data);
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
