import axios from 'axios';
import { z } from 'zod';
import { beneficiariaSchema } from '../validation/zodSchemas';

type Beneficiaria = z.infer<typeof beneficiariaSchema>;

// Cliente HTTP base
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Remove token e redireciona para login
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// Serviços para beneficiárias
export const beneficiariasService = {
  // Listar com paginação e filtros
  listar: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    escolaridade?: string;
  }) => {
    const { data } = await api.get('/beneficiarias', { params });
    return data;
  },

  // Buscar por ID
  buscarPorId: async (id: string) => {
    const { data } = await api.get(`/beneficiarias/${id}`);
    return data;
  },

  // Buscar resumo
  buscarResumo: async (id: string) => {
    const { data } = await api.get(`/beneficiarias/${id}/resumo`);
    return data;
  },

  // Criar nova
  criar: async (beneficiaria: Omit<Beneficiaria, 'id'>) => {
    const { data } = await api.post('/beneficiarias', beneficiaria);
    return data;
  },

  // Atualizar existente
  atualizar: async (id: string, beneficiaria: Partial<Beneficiaria>) => {
    const { data } = await api.put(`/beneficiarias/${id}`, beneficiaria);
    return data;
  },

  // Excluir (soft delete)
  excluir: async (id: string) => {
    const { data } = await api.delete(`/beneficiarias/${id}`);
    return data;
  }
};

// Serviços para formulários
export const formulariosService = {
  // Anamnese Social
  anamnese: {
    criar: async (formulario: any) => {
      const { data } = await api.post('/formularios/anamnese', formulario);
      return data;
    },
    buscar: async (id: string) => {
      const { data } = await api.get(`/formularios/anamnese/${id}`);
      return data;
    },
    atualizar: async (id: string, formulario: any) => {
      const { data } = await api.put(`/formularios/anamnese/${id}`, formulario);
      return data;
    }
  },

  // Roda da Vida
  rodaVida: {
    criar: async (formulario: any) => {
      const { data } = await api.post('/formularios/roda-vida', formulario);
      return data;
    },
    buscar: async (id: string) => {
      const { data } = await api.get(`/formularios/roda-vida/${id}`);
      return data;
    },
    atualizar: async (id: string, formulario: any) => {
      const { data } = await api.put(`/formularios/roda-vida/${id}`, formulario);
      return data;
    }
  },

  // Visão Holística
  visaoHolistica: {
    criar: async (formulario: any) => {
      const { data } = await api.post('/formularios/visao-holistica', formulario);
      return data;
    },
    buscar: async (id: string) => {
      const { data } = await api.get(`/formularios/visao-holistica/${id}`);
      return data;
    },
    atualizar: async (id: string, formulario: any) => {
      const { data } = await api.put(`/formularios/visao-holistica/${id}`, formulario);
      return data;
    }
  },

  // Ficha de Evolução
  fichaEvolucao: {
    criar: async (formulario: any) => {
      const { data } = await api.post('/formularios/ficha-evolucao', formulario);
      return data;
    },
    buscar: async (id: string) => {
      const { data } = await api.get(`/formularios/ficha-evolucao/${id}`);
      return data;
    },
    listar: async (beneficiariaId: string) => {
      const { data } = await api.get(`/formularios/ficha-evolucao/beneficiaria/${beneficiariaId}`);
      return data;
    }
  }
};

// Serviços para oficinas
export const oficinasService = {
  listar: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    const { data } = await api.get('/oficinas', { params });
    return data;
  },

  buscarPorId: async (id: string) => {
    const { data } = await api.get(`/oficinas/${id}`);
    return data;
  },

  criar: async (oficina: any) => {
    const { data } = await api.post('/oficinas', oficina);
    return data;
  },

  atualizar: async (id: string, oficina: any) => {
    const { data } = await api.put(`/oficinas/${id}`, oficina);
    return data;
  },

  excluir: async (id: string) => {
    const { data } = await api.delete(`/oficinas/${id}`);
    return data;
  },

  // Presenças
  presencas: {
    registrar: async (presenca: any) => {
      const { data } = await api.post('/oficinas/presencas', presenca);
      return data;
    },
    listar: async (oficinaId: string, data?: string) => {
      const { data: response } = await api.get(`/oficinas/${oficinaId}/presencas`, {
        params: { data }
      });
      return response;
    }
  }
};
