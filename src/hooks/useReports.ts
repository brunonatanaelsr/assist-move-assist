import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FilterParams, DashboardMetrics, ProjectMetrics, FormMetrics, RegionalMetrics, ReportTemplate, ExportFormat } from '../types/report';
import { api } from '../services/api';

const REPORTS_CACHE_KEY = 'reports';

export function useReports() {
  const queryClient = useQueryClient();

  const getDashboardMetrics = (filters?: FilterParams) => {
    return useQuery({
      queryKey: [REPORTS_CACHE_KEY, 'dashboard', filters],
      queryFn: () => api.get<DashboardMetrics>('/relatorios/dashboard', { params: filters }),
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  };

  const getProjectMetrics = (projectId: number, filters?: FilterParams) => {
    return useQuery({
      queryKey: [REPORTS_CACHE_KEY, 'project', projectId, filters],
      queryFn: () => api.get<ProjectMetrics>(`/relatorios/projetos/${projectId}`, { params: filters }),
      staleTime: 5 * 60 * 1000,
    });
  };

  const getFormMetrics = (formId: number, filters?: FilterParams) => {
    return useQuery({
      queryKey: [REPORTS_CACHE_KEY, 'form', formId, filters],
      queryFn: () => api.get<FormMetrics>(`/relatorios/formularios/${formId}`, { params: filters }),
      staleTime: 5 * 60 * 1000,
    });
  };

  const getRegionalMetrics = (filters?: FilterParams) => {
    return useQuery({
      queryKey: [REPORTS_CACHE_KEY, 'regional', filters],
      queryFn: () => api.get<RegionalMetrics[]>('/relatorios/regional', { params: filters }),
      staleTime: 5 * 60 * 1000,
    });
  };

  const getTemplates = () => {
    return useQuery({
      queryKey: [REPORTS_CACHE_KEY, 'templates'],
      queryFn: () => api.get<ReportTemplate[]>('/relatorios/templates'),
      staleTime: 30 * 60 * 1000, // 30 minutos
    });
  };

  const createTemplate = useMutation({
    mutationFn: (template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'>) =>
      api.post<ReportTemplate>('/relatorios/templates', template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_CACHE_KEY, 'templates'] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, ...template }: Partial<ReportTemplate> & { id: number }) =>
      api.put<ReportTemplate>(`/relatorios/templates/${id}`, template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_CACHE_KEY, 'templates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: number) => api.delete(`/relatorios/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_CACHE_KEY, 'templates'] });
    },
  });

  const exportReport = async (templateId: number, format: ExportFormat) => {
    const response = await api.post(`/relatorios/export/${templateId}`, format, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], {
      type: format.type === 'pdf' ? 'application/pdf' : 
            format.type === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
            'text/csv'
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${templateId}.${format.type}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return {
    getDashboardMetrics,
    getProjectMetrics,
    getFormMetrics,
    getRegionalMetrics,
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    exportReport
  };
}
