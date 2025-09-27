import { api } from './api';
import type { ApiResponse, Pagination } from '@/types/api';
import type {
  AddParticipanteDTO,
  CreateOficinaDTO,
  ListOficinasParams,
  Oficina,
  OficinaResumo,
  UpdateOficinaDTO,
} from '@/types/oficinas';

interface ListOficinasPayload {
  data: Oficina[];
  pagination?: Pagination & { totalPages?: number };
}

export const OficinasService = {
  // Listar oficinas com filtros e paginação
  listar: async (params: ListOficinasParams = {}) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const { data: payload } = await api.get<ApiResponse<ListOficinasPayload>>(
      `/oficinas?${searchParams.toString()}`
    );

    if (!payload?.success) {
      return {
        success: false,
        message: payload?.message,
        data: [],
        pagination: payload?.pagination,
      } satisfies ApiResponse<Oficina[]>;
    }

    const listData = payload.data;

    return {
      success: true,
      message: payload.message,
      data: listData?.data ?? [],
      pagination: listData?.pagination ?? payload.pagination,
    } satisfies ApiResponse<Oficina[]>;
  },

  // Buscar oficina por ID
  buscarPorId: async (id: number): Promise<ApiResponse<Oficina>> => {
    const response = await api.get<ApiResponse<Oficina>>(`/oficinas/${id}`);
    return response.data;
  },

  // Criar nova oficina
  criar: async (data: CreateOficinaDTO): Promise<ApiResponse<Oficina>> => {
    const response = await api.post<ApiResponse<Oficina>>('/oficinas', data);
    return response.data;
  },

  // Atualizar oficina existente
  atualizar: async (id: number, data: UpdateOficinaDTO): Promise<ApiResponse<Oficina>> => {
    const response = await api.put<ApiResponse<Oficina>>(`/oficinas/${id}`, data);
    return response.data;
  },

  // Excluir oficina
  excluir: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/oficinas/${id}`);
    return response.data;
  },

  // Adicionar participante à oficina
  adicionarParticipante: async (id: number, data: AddParticipanteDTO): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>(`/oficinas/${id}/participantes`, data);
    return response.data;
  },

  // Remover participante da oficina
  removerParticipante: async (id: number, beneficiariaId: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/oficinas/${id}/participantes/${beneficiariaId}`);
    return response.data;
  },

  // Listar participantes de uma oficina
  listarParticipantes: async (id: number): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>(`/oficinas/${id}/participantes`);
    return response.data;
  },

  // Marcar presença
  marcarPresenca: async (oficinaId: number, beneficiariaId: number, data: string, presente: boolean) => {
    const response = await api.post<ApiResponse<void>>(`/oficinas/${oficinaId}/presencas`, {
      beneficiaria_id: beneficiariaId,
      data,
      presente
    });
    return response.data;
  },

  // Listar presenças de uma oficina
  listarPresencas: async (id: number, data?: string) => {
    const searchParams = new URLSearchParams();
    if (data) {
      searchParams.append('data', data);
    }
    const response = await api.get<ApiResponse<any>>(`/oficinas/${id}/presencas?${searchParams.toString()}`);
    return response.data;
  },

  // Buscar resumo da oficina (total de participantes, média de presença, etc)
  buscarResumo: async (id: number): Promise<ApiResponse<OficinaResumo>> => {
    const response = await api.get<ApiResponse<OficinaResumo>>(`/oficinas/${id}/resumo`);
    return response.data;
  },

  // Gerar relatório de presenças
  gerarRelatorioPresencas: async (id: number, formato: 'pdf' | 'excel' = 'pdf') => {
    const response = await api.get<Blob>(`/oficinas/${id}/relatorio-presencas?formato=${formato}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Buscar horários disponíveis para uma data específica
  buscarHorariosDisponiveis: async (data: string) => {
    const response = await api.get(`/oficinas/horarios-disponiveis?data=${data}`);
    return response.data;
  },

  // Verificar conflito de horários
  verificarConflito: async (data: {
    data_inicio: string;
    data_fim?: string;
    horario_inicio: string;
    horario_fim: string;
    dias_semana?: string;
    excluir_oficina_id?: number;
  }) => {
    const response = await api.post('/oficinas/verificar-conflito', data);
    return response.data;
  }
};

// Alias de export para compatibilidade
export const oficinasService = OficinasService;
export default OficinasService;
