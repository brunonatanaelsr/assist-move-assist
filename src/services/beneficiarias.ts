import api from './api';
import { IBeneficiaria } from '../types/beneficiarias';

export const BeneficiariasService = {
  listar: async (params?: { 
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
  }) => {
    const response = await api.get('/beneficiarias', { params });
    return response.data;
  },

  obter: async (id: string) => {
    const response = await api.get(`/beneficiarias/${id}`);
    return response.data;
  },

  criar: async (beneficiaria: Partial<IBeneficiaria>) => {
    const response = await api.post('/beneficiarias', beneficiaria);
    return response.data;
  },

  atualizar: async (id: string, beneficiaria: Partial<IBeneficiaria>) => {
    const response = await api.put(`/beneficiarias/${id}`, beneficiaria);
    return response.data;
  },

  excluir: async (id: string, motivo: string) => {
    const response = await api.delete(`/beneficiarias/${id}`, {
      data: { motivo }
    });
    return response.data;
  },

  listarAtividades: async (id: string) => {
    const response = await api.get(`/beneficiarias/${id}/atividades`);
    return response.data;
  },

  estatisticasBairros: async () => {
    const response = await api.get('/beneficiarias/stats/bairros');
    return response.data;
  }
};
