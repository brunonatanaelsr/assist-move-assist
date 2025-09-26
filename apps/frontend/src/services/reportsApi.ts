import { api } from '@/services/api';

export const getMetrics = async (endpoint: string, params?: any) => {
  try {
    const response = await api.get(`/relatorios${endpoint}`, { params });
    return response.data ?? response;
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    throw error;
  }
};

export const getReportTemplates = async () => {
  try {
    const response = await api.get('/relatorios/templates');
    return response.data ?? response;
  } catch (error) {
    console.error('Erro ao buscar templates de relatório:', error);
    throw error;
  }
};

export const createReportTemplate = async (template: any) => {
  try {
    const response = await api.post('/relatorios/templates', template);
    return response.data ?? response;
  } catch (error) {
    console.error('Erro ao criar template de relatório:', error);
    throw error;
  }
};

export const updateReportTemplate = async (id: number, template: any) => {
  try {
    const response = await api.put(`/relatorios/templates/${id}`, template);
    return response.data ?? response;
  } catch (error) {
    console.error('Erro ao atualizar template de relatório:', error);
    throw error;
  }
};

export const deleteReportTemplate = async (id: number) => {
  try {
    const response = await api.delete(`/relatorios/templates/${id}`);
    return response.data ?? response;
  } catch (error) {
    console.error('Erro ao excluir template de relatório:', error);
    throw error;
  }
};

export const exportReport = async (templateId: number, format: string, options?: any) => {
  try {
    const response = await api.post(
      `/relatorios/export/${templateId}`,
      { format, options },
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    throw error;
  }
};
