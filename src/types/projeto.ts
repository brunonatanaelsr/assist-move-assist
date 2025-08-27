export interface Projeto {
  id: number;
  nome: string;
  descricao?: string;
  objetivo: string;
  data_inicio: string;
  data_fim?: string;
  status: 'ativo' | 'inativo' | 'concluido';
  responsavel_id: number;
  responsavel_nome: string;
  orcamento?: number;
  orcamento_utilizado?: number;
  meta_beneficiarias?: number;
  total_beneficiarias: number;
  created_at: string;
  updated_at: string;
}

export interface ProjetoInput {
  nome: string;
  descricao?: string;
  objetivo: string;
  data_inicio: string;
  data_fim?: string;
  responsavel_id: number;
  orcamento?: number;
  meta_beneficiarias?: number;
}

export interface ProjetoResumo {
  total_atividades: number;
  total_oficinas: number;
  total_beneficiarias: number;
  percentual_conclusao: number;
  orcamento_utilizado: number;
  percentual_orcamento: number;
  atividades_pendentes: number;
  atividades_concluidas: number;
  proximas_atividades: ProjetoAtividade[];
}

export interface ProjetoParticipante {
  id: number;
  nome_completo: string;
  cpf: string;
  telefone?: string;
  email?: string;
  data_entrada: string;
  status: 'ativo' | 'inativo';
  total_atividades: number;
  atividades_concluidas: number;
}

export interface ProjetoAtividade {
  id: number;
  titulo: string;
  descricao?: string;
  tipo: 'oficina' | 'evento' | 'reuniao' | 'outro';
  data_inicio: string;
  data_fim?: string;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  responsavel_id?: number;
  responsavel_nome?: string;
  local?: string;
  meta?: string;
  resultado?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}
