import api from './api';
import { IOficina } from '../types/oficinas';

export const OficinasService = {
  listar: async (params?: { 
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
  }) => {
    const response = await api.get('/oficinas', { params });
    return response.data;
  },

  obter: async (id: string) => {
    const response = await api.get(`/oficinas/${id}`);
    return response.data;
  },

  criar: async (oficina: Partial<IOficina>) => {
    const response = await api.post('/oficinas', oficina);
    return response.data;
  },

  atualizar: async (id: string, oficina: Partial<IOficina>) => {
    const response = await api.put(`/oficinas/${id}`, oficina);
    return response.data;
  },

  excluir: async (id: string, motivo: string) => {
    const response = await api.delete(`/oficinas/${id}`, {
      data: { motivo }
    });
    return response.data;
  },

  listarParticipantes: async (id: string) => {
    const response = await api.get(`/oficinas/${id}/participantes`);
    return response.data;
  },
};
