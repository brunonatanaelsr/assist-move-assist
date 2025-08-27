import { apiService } from '@/lib/api';
import { 
  Projeto,
  ProjetoInput,
  ProjetoResumo,
  ProjetoParticipante,
  ProjetoAtividade
} from '@/types/projeto';

export interface ProjetoFiltros {
  status?: 'ativo' | 'inativo' | 'concluido';
  search?: string;
  responsavel_id?: number;
  data_inicio?: string;
  data_fim?: string;
}

export const projetosService = {
  // Busca lista de projetos com filtros opcionais
  listar: (filtros?: ProjetoFiltros) => {
    return apiService.projetos.listar(filtros) as Promise<Projeto[]>;
  },

  // Busca um projeto específico por ID
  buscarPorId: (id: number) => {
    return apiService.projetos.buscarPorId(id) as Promise<Projeto>;
  },

  // Cria um novo projeto
  criar: (input: ProjetoInput) => {
    return apiService.projetos.criar(input) as Promise<Projeto>;
  },

  // Atualiza um projeto existente
  atualizar: (id: number, input: Partial<ProjetoInput>) => {
    return apiService.projetos.atualizar(id, input) as Promise<Projeto>;
  },

  // Exclui um projeto
  excluir: (id: number) => {
    return apiService.projetos.excluir(id);
  },

  // Busca o resumo de um projeto (métricas, status geral, etc)
  buscarResumo: (id: number) => {
    return apiService.projetos.buscarResumo(id) as Promise<ProjetoResumo>;
  },

  // Lista os participantes de um projeto
  listarParticipantes: (id: number) => {
    return apiService.projetos.buscarParticipantes(id) as Promise<ProjetoParticipante[]>;
  },

  // Adiciona um participante ao projeto
  adicionarParticipante: (id: number, beneficiariaId: number) => {
    return apiService.projetos.adicionarParticipante(id, beneficiariaId) as Promise<ProjetoParticipante>;
  },

  // Remove um participante do projeto
  removerParticipante: (id: number, beneficiariaId: number) => {
    return apiService.projetos.removerParticipante(id, beneficiariaId);
  },

  // Lista as atividades de um projeto
  listarAtividades: (id: number) => {
    return apiService.projetos.buscarAtividades(id) as Promise<ProjetoAtividade[]>;
  },

  // Adiciona uma nova atividade ao projeto
  adicionarAtividade: (id: number, atividade: Omit<ProjetoAtividade, 'id'>) => {
    return apiService.projetos.adicionarAtividade(id, atividade) as Promise<ProjetoAtividade>;
  },

  // Atualiza uma atividade do projeto
  atualizarAtividade: (
    id: number, 
    atividadeId: number, 
    atividade: Partial<ProjetoAtividade>
  ) => {
    return apiService.projetos.atualizarAtividade(id, atividadeId, atividade) as Promise<ProjetoAtividade>;
  },

  // Remove uma atividade do projeto
  removerAtividade: (id: number, atividadeId: number) => {
    return apiService.projetos.removerAtividade(id, atividadeId);
  },

  // Gera relatório do projeto em PDF
  gerarRelatorio: (id: number) => {
    return apiService.projetos.gerarRelatorio(id);
  }
};
