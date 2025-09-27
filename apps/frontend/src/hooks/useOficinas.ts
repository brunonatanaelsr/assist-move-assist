import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { oficinasService } from '../services/oficinas.service';
import type {
  AddParticipanteDTO,
  CreateOficinaDTO,
  ListOficinasParams,
  Oficina,
  OficinaResumo,
  UpdateOficinaDTO,
  OficinasApiResponse,
} from '@/types/oficinas';
import { toast } from 'sonner';

// Keys para React Query
export const oficinasKeys = {
  all: ['oficinas'] as const,
  lists: () => [...oficinasKeys.all, 'list'] as const,
  list: (filters: ListOficinasParams) => [...oficinasKeys.lists(), { filters }] as const,
  details: () => [...oficinasKeys.all, 'detail'] as const,
  detail: (id: number) => [...oficinasKeys.details(), id] as const,
  participantes: (id: number) => [...oficinasKeys.detail(id), 'participantes'] as const,
  presencas: (id: number, data?: string) => [...oficinasKeys.detail(id), 'presencas', data] as const,
  resumo: (id: number) => [...oficinasKeys.detail(id), 'resumo'] as const,
};

// Listar oficinas
export const useOficinas = (params: ListOficinasParams = {}): UseQueryResult<OficinasApiResponse> =>
  useQuery<OficinasApiResponse>({
    queryKey: oficinasKeys.list(params),
    queryFn: () => oficinasService.listar(params),
  });
export default useOficinas;

// Buscar oficina por ID
export const useOficina = (id: number) =>
  useQuery({
    queryKey: oficinasKeys.detail(id),
    queryFn: () => oficinasService.buscarPorId(id),
    enabled: !!id,
  });

// Buscar resumo da oficina
export const useOficinaResumo = (id: number) =>
  useQuery<{ success: boolean; data?: OficinaResumo; message?: string }>({
    queryKey: oficinasKeys.resumo(id),
    queryFn: () => oficinasService.buscarResumo(id),
    enabled: !!id,
  });

// Criar oficina
export const useCreateOficina = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOficinaDTO) => oficinasService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oficinasKeys.lists() });
      toast.success('Oficina criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar oficina: ${error.message}`);
    },
  });
};

// Atualizar oficina
export const useUpdateOficina = (id: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOficinaDTO) => oficinasService.atualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oficinasKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: oficinasKeys.lists() });
      toast.success('Oficina atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar oficina: ${error.message}`);
    },
  });
};

// Excluir oficina
export const useDeleteOficina = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => oficinasService.excluir(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oficinasKeys.lists() });
      toast.success('Oficina excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir oficina: ${error.message}`);
    },
  });
};

// Listar participantes
export const useOficinaParticipantes = (id: number) => {
  return useQuery({
    queryKey: oficinasKeys.participantes(id),
    queryFn: () => oficinasService.listarParticipantes(id),
    enabled: !!id,
  });
};

// Adicionar participante
export const useAddParticipante = (oficinaId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddParticipanteDTO) => 
      oficinasService.adicionarParticipante(oficinaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oficinasKeys.participantes(oficinaId) });
      queryClient.invalidateQueries({ queryKey: oficinasKeys.detail(oficinaId) });
      toast.success('Participante adicionada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar participante: ${error.message}`);
    },
  });
};

// Remover participante
export const useRemoveParticipante = (oficinaId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (beneficiariaId: number) => 
      oficinasService.removerParticipante(oficinaId, beneficiariaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oficinasKeys.participantes(oficinaId) });
      queryClient.invalidateQueries({ queryKey: oficinasKeys.detail(oficinaId) });
      toast.success('Participante removida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover participante: ${error.message}`);
    },
  });
};

// Marcar presença
export const useMarcarPresenca = (oficinaId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      beneficiariaId, 
      data, 
      presente 
    }: { 
      beneficiariaId: number; 
      data: string; 
      presente: boolean; 
    }) => 
      oficinasService.marcarPresenca(oficinaId, beneficiariaId, data, presente),
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ 
        queryKey: oficinasKeys.presencas(oficinaId, data) 
      });
      toast.success('Presença registrada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar presença: ${error.message}`);
    },
  });
};

// Listar presenças
export const useOficinaPresencas = (oficinaId: number, data?: string) => {
  return useQuery({
    queryKey: oficinasKeys.presencas(oficinaId, data),
    queryFn: () => oficinasService.listarPresencas(oficinaId, data),
    enabled: !!oficinaId,
  });
};

// Verificar conflito de horários
export const useVerificarConflito = () => {
  return useMutation({
    mutationFn: (data: {
      data_inicio: string;
      data_fim?: string;
      horario_inicio: string;
      horario_fim: string;
      dias_semana?: string;
      excluir_oficina_id?: number;
    }) => oficinasService.verificarConflito(data),
  });
};
