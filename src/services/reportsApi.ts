import axios from 'axios';
import { getAuthHeader } from '../utils/auth';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const reportsApi = axios.create({
  baseURL: `${baseURL}/api/v1`,
  headers: {
    'Content-Type': 'application/json'
  }
});

reportsApi.interceptors.request.use(async (config) => {
  const authHeader = await getAuthHeader();
  if (authHeader) {
    config.headers.Authorization = authHeader;
  }
  return config;
});

export const getMetrics = async (endpoint: string, params?: any) => {
  try {
    const response = await reportsApi.get(endpoint, { params });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    throw error;
  }
};

export const getReportTemplates = async () => {
  try {
    const response = await reportsApi.get('/reports/templates');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar templates de relatório:', error);
    throw error;
  }
};

export const createReportTemplate = async (template: any) => {
  try {
    const response = await reportsApi.post('/reports/templates', template);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar template de relatório:', error);
    throw error;
  }
};

export const updateReportTemplate = async (id: number, template: any) => {
  try {
    const response = await reportsApi.put(`/reports/templates/${id}`, template);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar template de relatório:', error);
    throw error;
  }
};

export const deleteReportTemplate = async (id: number) => {
  try {
    const response = await reportsApi.delete(`/reports/templates/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao excluir template de relatório:', error);
    throw error;
  }
};

export const exportReport = async (templateId: number, format: string, options?: any) => {
  try {
    const response = await reportsApi.post(
      `/reports/export/${templateId}`,
      { format, options },
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    throw error;
  }
};
