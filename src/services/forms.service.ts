import { apiService } from '@/lib/api';
import { Form, FormInput, FormSubmission, FormSubmissionInput } from '@/types/form';

export interface FormFiltros {
  status?: 'draft' | 'published' | 'archived';
  search?: string;
  data_inicio?: string;
  data_fim?: string;
}

export const formsService = {
  // Busca lista de formulários com filtros opcionais
  listar: (filtros?: FormFiltros) => {
    return apiService.forms.listar(filtros) as Promise<Form[]>;
  },

  // Busca um formulário específico por ID
  buscarPorId: (id: number) => {
    return apiService.forms.buscarPorId(id) as Promise<Form>;
  },

  // Cria um novo formulário
  criar: (input: FormInput) => {
    return apiService.forms.criar(input) as Promise<Form>;
  },

  // Atualiza um formulário existente
  atualizar: (id: number, input: Partial<FormInput>) => {
    return apiService.forms.atualizar(id, input) as Promise<Form>;
  },

  // Exclui um formulário
  excluir: (id: number) => {
    return apiService.forms.excluir(id);
  },

  // Publica um formulário
  publicar: (id: number) => {
    return apiService.forms.publicar(id) as Promise<Form>;
  },

  // Arquiva um formulário
  arquivar: (id: number) => {
    return apiService.forms.arquivar(id) as Promise<Form>;
  },

  // Lista todas as submissões de um formulário
  listarSubmissoes: (id: number) => {
    return apiService.forms.buscarSubmissoes(id) as Promise<FormSubmission[]>;
  },

  // Busca uma submissão específica
  buscarSubmissao: (formId: number, submissionId: number) => {
    return apiService.forms.buscarSubmissao(
      formId, 
      submissionId
    ) as Promise<FormSubmission>;
  },

  // Envia uma nova submissão
  enviarSubmissao: (formId: number, input: FormSubmissionInput) => {
    return apiService.forms.enviarSubmissao(
      formId, 
      input
    ) as Promise<FormSubmission>;
  },

  // Exclui uma submissão
  excluirSubmissao: (formId: number, submissionId: number) => {
    return apiService.forms.excluirSubmissao(formId, submissionId);
  },

  // Exporta as submissões em CSV
  exportarSubmissoes: (id: number) => {
    return apiService.forms.exportarSubmissoes(id);
  },

  // Copia um formulário existente
  duplicar: (id: number) => {
    return apiService.forms.duplicar(id) as Promise<Form>;
  }
};
