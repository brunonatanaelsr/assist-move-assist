import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projetosService, ProjetoFiltros } from '@/services/projetos.service';
import { ProjetoInput, ProjetoAtividade } from '@/types/projeto';
import { toast } from 'sonner';

// Hook para listar projetos
export function useProjetos(filtros?: ProjetoFiltros) {
  return useQuery({
    queryKey: ['projetos', filtros],
    queryFn: () => projetosService.listar(filtros)
  });
}

// Hook para buscar um projeto específico
export function useProjeto(id: number) {
  return useQuery({
    queryKey: ['projeto', id],
    queryFn: () => projetosService.buscarPorId(id),
    enabled: !!id
  });
}

// Hook para criar um novo projeto
export function useCriarProjeto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProjetoInput) => projetosService.criar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
      toast.success('Projeto criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar projeto. Tente novamente.');
    }
  });
}

// Hook para atualizar um projeto
export function useAtualizarProjeto(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Partial<ProjetoInput>) => projetosService.atualizar(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
      queryClient.invalidateQueries({ queryKey: ['projeto', id] });
      toast.success('Projeto atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar projeto. Tente novamente.');
    }
  });
}

// Hook para excluir um projeto
export function useExcluirProjeto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projetosService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
      toast.success('Projeto excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir projeto. Tente novamente.');
    }
  });
}

// Hook para buscar o resumo de um projeto
export function useProjetoResumo(id: number) {
  return useQuery({
    queryKey: ['projeto', id, 'resumo'],
    queryFn: () => projetosService.buscarResumo(id),
    enabled: !!id
  });
}

// Hook para listar participantes do projeto
export function useProjetoParticipantes(id: number) {
  return useQuery({
    queryKey: ['projeto', id, 'participantes'],
    queryFn: () => projetosService.listarParticipantes(id),
    enabled: !!id
  });
}

// Hook para adicionar participante ao projeto
export function useAddParticipante(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (beneficiariaId: number) => 
      projetosService.adicionarParticipante(id, beneficiariaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projeto', id, 'participantes'] });
      queryClient.invalidateQueries({ queryKey: ['projeto', id, 'resumo'] });
      toast.success('Participante adicionada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao adicionar participante. Tente novamente.');
    }
  });
}

// Hook para remover participante do projeto
export function useRemoveParticipante(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (beneficiariaId: number) => 
      projetosService.removerParticipante(id, beneficiariaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projeto', id, 'participantes'] });
      queryClient.invalidateQueries({ queryKey: ['projeto', id, 'resumo'] });
      toast.success('Participante removida com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover participante. Tente novamente.');
    }
  });
}

// Hook para listar atividades do projeto
export function useProjetoAtividades(id: number) {
  return useQuery({
    queryKey: ['projeto', id, 'atividades'],
    queryFn: () => projetosService.listarAtividades(id),
    enabled: !!id
  });
}

// Hook para adicionar atividade ao projeto
export function useAddAtividade(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (atividade: Omit<ProjetoAtividade, 'id'>) =>
      projetosService.adicionarAtividade(id, atividade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projeto', id, 'atividades'] });
      queryClient.invalidateQueries({ queryKey: ['projeto', id, 'resumo'] });
      toast.success('Atividade adicionada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao adicionar atividade. Tente novamente.');
    }
  });
}

// Hook para atualizar atividade do projeto
export function useAtualizarAtividade(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      atividadeId, 
      atividade 
    }: { 
      atividadeId: number; 
      atividade: Partial<ProjetoAtividade>; 
    }) => projetosService.atualizarAtividade(id, atividadeId, atividade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projeto', id, 'atividades'] });
      queryClient.invalidateQueries({ queryKey: ['projeto', id, 'resumo'] });
      toast.success('Atividade atualizada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar atividade. Tente novamente.');
    }
  });
}

// Hook para remover atividade do projeto
export function useRemoveAtividade(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (atividadeId: number) => 
      projetosService.removerAtividade(id, atividadeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projeto', id, 'atividades'] });
      queryClient.invalidateQueries({ queryKey: ['projeto', id, 'resumo'] });
      toast.success('Atividade removida com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover atividade. Tente novamente.');
    }
  });
}

// Hook para gerar relatório do projeto
export function useGerarRelatorio(id: number) {
  return useMutation({
    mutationFn: () => projetosService.gerarRelatorio(id),
    onSuccess: (data) => {
      // Cria um blob com o PDF e faz o download
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projeto-${id}-relatorio.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onError: () => {
      toast.error('Erro ao gerar relatório. Tente novamente.');
    }
  });
}
