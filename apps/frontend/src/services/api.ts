import { z } from 'zod';
import { beneficiariaSchema } from '../validation/zodSchemas';
import { apiService } from '@/services/apiService';
import type {
  BeneficiariaListResponse,
  BeneficiariaResponse,
  BeneficiariaResumoResponse,
  ListBeneficiariasParams,
} from '@/types/beneficiarias';

type Beneficiaria = z.infer<typeof beneficiariaSchema>;

// Wrapper fino para compatibilidade com axios-like
type ResponseLike<T> = { data: T };

async function wrapGet<T>(url: string, config?: any): Promise<ResponseLike<T>> {
  const res = await apiService.get<T>(url, config);
  if (res.success) return { data: res.data as T };
  throw new Error(res.message || 'Erro na requisição');
}

async function wrapPost<T>(url: string, data?: any, config?: any): Promise<ResponseLike<T>> {
  const res = await apiService.post<T>(url, data, config);
  if (res.success) return { data: res.data as T };
  throw new Error(res.message || 'Erro na requisição');
}

async function wrapPut<T>(url: string, data?: any, _config?: any): Promise<ResponseLike<T>> {
  const res = await apiService.put<T>(url, data);
  if (res.success) return { data: res.data as T };
  throw new Error(res.message || 'Erro na requisição');
}

async function wrapPatch<T>(url: string, data?: any, _config?: any): Promise<ResponseLike<T>> {
  const res = await apiService.patch<T>(url, data);
  if (res.success) return { data: res.data as T };
  throw new Error(res.message || 'Erro na requisição');
}

async function wrapDelete<T = any>(url: string, _config?: any): Promise<ResponseLike<T>> {
  const res = await apiService.delete<T>(url);
  if (res.success) return { data: (res.data as T) };
  throw new Error(res.message || 'Erro na requisição');
}

// Expor objeto `api` compatível com uso existente (get/post/... retornando {data})
export const api = {
  get: wrapGet,
  post: wrapPost,
  put: wrapPut,
  patch: wrapPatch,
  delete: wrapDelete
};

// Serviços para beneficiárias delegando ao apiService
export const beneficiariasService = {
  listar: async (params: ListBeneficiariasParams = {}): Promise<BeneficiariaListResponse> => {
    const response = await apiService.getBeneficiarias(params);

    const payload = response.data;
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as any)?.data)
        ? (payload as any).data
        : [];
    const pagination = (!Array.isArray(payload) && (payload as any)?.pagination) ?? response.pagination;

    return {
      ...response,
      data: {
        items,
        pagination,
      },
      pagination,
    } satisfies BeneficiariaListResponse;
  },
  buscarPorId: async (id: string): Promise<BeneficiariaResponse> => {
    const response = await apiService.getBeneficiaria(id);

    if (!response.success) {
      return response as BeneficiariaResponse;
    }

    return {
      ...response,
      data: response.data,
    } satisfies BeneficiariaResponse;
  },
  buscarResumo: async (id: string): Promise<BeneficiariaResumoResponse> => {
    const response = await apiService.get(`/beneficiarias/${id}/resumo`);

    if (!response.success) {
      return {
        ...response,
        data: undefined,
      } satisfies BeneficiariaResumoResponse;
    }

    return response as BeneficiariaResumoResponse;
  },
  criar: async (beneficiaria: Omit<Beneficiaria, 'id'>) => {
    return apiService.createBeneficiaria(beneficiaria as any);
  },
  atualizar: async (id: string, beneficiaria: Partial<Beneficiaria>) => {
    return apiService.updateBeneficiaria(id, beneficiaria as any);
  },
  excluir: async (id: string) => {
    return apiService.deleteBeneficiaria(id);
  },
};

// Serviços para formulários
export const formulariosService = {
  anamnese: {
    criar: async (formulario: any) => {
      const res = await apiService.createFormulario('anamnese', formulario);
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao criar anamnese');
    },
    buscar: async (id: string) => {
      const res = await apiService.getFormulario('anamnese', Number(id));
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao buscar anamnese');
    },
    atualizar: async (id: string, formulario: any) => {
      const res = await apiService.updateFormulario('anamnese', Number(id), formulario);
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao atualizar anamnese');
    },
  },
  rodaVida: {
    criar: async (formulario: any) => {
      const res = await apiService.createFormulario('roda-vida', formulario);
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao criar Roda da Vida');
    },
    buscar: async (id: string) => {
      const res = await apiService.getFormulario('roda-vida', Number(id));
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao buscar Roda da Vida');
    },
    atualizar: async (id: string, formulario: any) => {
      const res = await apiService.updateFormulario('roda-vida', Number(id), formulario);
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao atualizar Roda da Vida');
    },
  },
  visaoHolistica: {
    criar: async (formulario: any) => {
      const res = await apiService.createFormulario('visao-holistica', formulario);
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao criar Visão Holística');
    },
    buscar: async (id: string) => {
      const res = await apiService.getFormulario('visao-holistica', Number(id));
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao buscar Visão Holística');
    },
    atualizar: async (id: string, formulario: any) => {
      const res = await apiService.updateFormulario('visao-holistica', Number(id), formulario);
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao atualizar Visão Holística');
    },
  },
  fichaEvolucao: {
    criar: async (formulario: any) => {
      const res = await apiService.createFormulario('ficha-evolucao', formulario);
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao criar Ficha de Evolução');
    },
    buscar: async (id: string) => {
      const res = await apiService.getFormulario('ficha-evolucao', Number(id));
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao buscar Ficha de Evolução');
    },
    listar: async (beneficiariaId: string) => {
      const res = await apiService.get(`/formularios/ficha-evolucao/beneficiaria/${beneficiariaId}`);
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao listar Ficha de Evolução');
    },
  },
};

// Serviços para oficinas
export const oficinasService = {
  listar: async (params?: { page?: number; limit?: number; status?: string }) => {
    const res = await apiService.getOficinas(params);
    if (res.success) return res.data;
    throw new Error(res.message || 'Erro ao listar oficinas');
  },
  buscarPorId: async (id: string) => {
    const res = await apiService.get(`/oficinas/${id}`);
    if (res.success) return res.data;
    throw new Error(res.message || 'Erro ao buscar oficina');
  },
  criar: async (oficina: any) => {
    const res = await apiService.createOficina(oficina);
    if (res.success) return res.data;
    throw new Error(res.message || 'Erro ao criar oficina');
  },
  atualizar: async (id: string, oficina: any) => {
    const res = await apiService.updateOficina(id, oficina);
    if (res.success) return res.data;
    throw new Error(res.message || 'Erro ao atualizar oficina');
  },
  excluir: async (id: string) => {
    const res = await apiService.deleteOficina(id);
    if (res.success) return res.data;
    throw new Error(res.message || 'Erro ao excluir oficina');
  },
  presencas: {
    registrar: async (presenca: any) => {
      const res = await apiService.post('/oficinas/presencas', presenca);
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao registrar presença');
    },
    listar: async (oficinaId: string, data?: string) => {
      const res = await apiService.get(`/oficinas/${oficinaId}/presencas`, { params: { data } });
      if (res.success) return res.data;
      throw new Error(res.message || 'Erro ao listar presenças');
    },
  },
};
