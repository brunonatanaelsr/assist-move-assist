export interface IOficina {
  id: string;
  titulo: string;
  descricao: string;
  objetivo?: string;
  metodologia?: string;
  requisitos?: string[];
  data_inicio: Date | string;
  data_fim: Date | string;
  horario_inicio: string;
  horario_fim: string;
  dias_semana: string[];
  local: string;
  endereco: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  vagas_total: number;
  vagas_disponiveis: number;
  facilitadora: string;
  area_atuacao: string[];
  status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  publico_alvo?: string;
  recursos_necessarios?: string[];
  recursos_disponiveis?: string[];
  parceiros?: string[];
  patrocinadores?: string[];
  observacoes?: string;
  meta_dados?: Record<string, any>;
  imagem_url?: string;
  documentos_url?: string[];
  ativo: boolean;
  data_criacao: Date | string;
  data_atualizacao?: Date | string;
}

export interface IParticipanteOficina {
  id: string;
  oficina_id: string;
  beneficiaria_id: string;
  data_inscricao: Date | string;
  status: 'INSCRITA' | 'PARTICIPANDO' | 'CONCLUIDO' | 'DESISTENTE';
  presencas?: number;
  faltas?: number;
  nota_avaliacao?: number;
  observacoes?: string;
  meta_dados?: Record<string, any>;
  ativo: boolean;
  data_criacao: Date | string;
  data_atualizacao?: Date | string;
}
