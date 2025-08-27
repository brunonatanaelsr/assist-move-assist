import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formsService, FormFiltros } from '@/services/forms.service';
import { FormInput, FormSubmissionInput } from '@/types/form';
import { toast } from 'sonner';

// Hook para listar formulários
export function useForms(filtros?: FormFiltros) {
  return useQuery({
    queryKey: ['forms', filtros],
    queryFn: () => formsService.listar(filtros)
  });
}

// Hook para buscar um formulário específico
export function useForm(id: number) {
  return useQuery({
    queryKey: ['form', id],
    queryFn: () => formsService.buscarPorId(id),
    enabled: !!id
  });
}

// Hook para criar um novo formulário
export function useCriarForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FormInput) => formsService.criar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Formulário criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar formulário. Tente novamente.');
    }
  });
}

// Hook para atualizar um formulário
export function useAtualizarForm(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Partial<FormInput>) => formsService.atualizar(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['form', id] });
      toast.success('Formulário atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar formulário. Tente novamente.');
    }
  });
}

// Hook para excluir um formulário
export function useExcluirForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: formsService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Formulário excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir formulário. Tente novamente.');
    }
  });
}

// Hook para publicar um formulário
export function usePublicarForm(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => formsService.publicar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['form', id] });
      toast.success('Formulário publicado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao publicar formulário. Tente novamente.');
    }
  });
}

// Hook para arquivar um formulário
export function useArquivarForm(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => formsService.arquivar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['form', id] });
      toast.success('Formulário arquivado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao arquivar formulário. Tente novamente.');
    }
  });
}

// Hook para listar submissões
export function useFormSubmissoes(id: number) {
  return useQuery({
    queryKey: ['form', id, 'submissoes'],
    queryFn: () => formsService.listarSubmissoes(id),
    enabled: !!id
  });
}

// Hook para buscar uma submissão específica
export function useFormSubmissao(formId: number, submissionId: number) {
  return useQuery({
    queryKey: ['form', formId, 'submissao', submissionId],
    queryFn: () => formsService.buscarSubmissao(formId, submissionId),
    enabled: !!formId && !!submissionId
  });
}

// Hook para enviar uma submissão
export function useEnviarSubmissao(formId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FormSubmissionInput) => 
      formsService.enviarSubmissao(formId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form', formId, 'submissoes'] });
      toast.success('Formulário enviado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao enviar formulário. Tente novamente.');
    }
  });
}

// Hook para excluir uma submissão
export function useExcluirSubmissao(formId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (submissionId: number) => 
      formsService.excluirSubmissao(formId, submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form', formId, 'submissoes'] });
      toast.success('Submissão excluída com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir submissão. Tente novamente.');
    }
  });
}

// Hook para exportar submissões
export function useExportarSubmissoes(id: number) {
  return useMutation({
    mutationFn: () => formsService.exportarSubmissoes(id),
    onSuccess: (data) => {
      // Cria um blob com o CSV e faz o download
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-${id}-submissoes.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onError: () => {
      toast.error('Erro ao exportar submissões. Tente novamente.');
    }
  });
}

// Hook para duplicar formulário
export function useDuplicarForm(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => formsService.duplicar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Formulário duplicado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao duplicar formulário. Tente novamente.');
    }
  });
}
