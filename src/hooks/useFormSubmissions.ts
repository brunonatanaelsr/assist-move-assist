import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FormSubmissionInput, FormSubmissionOutput } from '@/types/form';
import { toast } from 'sonner';
import axios from 'axios';

// Hook para listar respostas de um formulário
export function useFormSubmissions(formId: number, filters?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['form-submissions', formId, filters],
    queryFn: async () => {
      const response = await axios.get(`/api/forms/${formId}/submissions`, {
        params: filters,
      });
      return response.data;
    },
    enabled: !!formId,
  });
}

// Hook para buscar uma resposta específica
export function useFormSubmission(formId: number, submissionId: number) {
  return useQuery({
    queryKey: ['form-submissions', formId, submissionId],
    queryFn: async () => {
      const response = await axios.get(
        `/api/forms/${formId}/submissions/${submissionId}`
      );
      return response.data as FormSubmissionOutput;
    },
    enabled: !!formId && !!submissionId,
  });
}

// Hook para enviar resposta
export function useEnviarResposta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FormSubmissionInput) => {
      const response = await axios.post(
        `/api/forms/${data.form_id}/submissions`,
        data
      );
      return response.data;
    },
    onSuccess: (_, { form_id }) => {
      queryClient.invalidateQueries({
        queryKey: ['form-submissions', form_id],
      });
      toast.success('Resposta enviada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao enviar resposta');
    },
  });
}

// Hook para excluir resposta
export function useExcluirResposta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      form_id,
      submission_id,
    }: {
      form_id: number;
      submission_id: number;
    }) => {
      await axios.delete(`/api/forms/${form_id}/submissions/${submission_id}`);
    },
    onSuccess: (_, { form_id }) => {
      queryClient.invalidateQueries({
        queryKey: ['form-submissions', form_id],
      });
      toast.success('Resposta excluída com sucesso');
    },
    onError: () => {
      toast.error('Erro ao excluir resposta');
    },
  });
}

// Hook para exportar respostas
export function useExportarRespostas(form_id: number) {
  return useMutation({
    mutationFn: async (format: 'csv' | 'xlsx' = 'xlsx') => {
      const response = await axios.get(`/api/forms/${form_id}/submissions/export`, {
        params: { format },
        responseType: 'blob',
      });
      return response.data;
    },
    onSuccess: (data, format) => {
      const blob = new Blob([data], {
        type:
          format === 'csv'
            ? 'text/csv'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respostas-${form_id}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Respostas exportadas com sucesso');
    },
    onError: () => {
      toast.error('Erro ao exportar respostas');
    },
  });
}
