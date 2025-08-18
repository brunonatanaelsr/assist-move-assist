import api from './api';
import { IProjeto } from '../types/projetos';

export const ProjetosService = {
  listar: async (params?: { 
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
  }) => {
    const response = await api.get('/projetos', { params });
    return response.data;
  },

  obter: async (id: string) => {
    const response = await api.get(`/projetos/${id}`);
    return response.data;
  },

  criar: async (projeto: Partial<IProjeto>) => {
    const response = await api.post('/projetos', projeto);
    return response.data;
  },

  atualizar: async (id: string, projeto: Partial<IProjeto>) => {
    const response = await api.put(`/projetos/${id}`, projeto);
    return response.data;
  },

  excluir: async (id: string, motivo: string) => {
    const response = await api.delete(`/projetos/${id}`, {
      data: { motivo }
    });
    return response.data;
  }
};
