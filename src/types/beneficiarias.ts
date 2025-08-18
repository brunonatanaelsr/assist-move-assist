export interface IBeneficiaria {
  id: string;
  nome_completo: string;
  cpf: string;
  rg?: string;
  data_nascimento: Date | string;
  email?: string;
  telefone?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  estado_civil?: string;
  escolaridade?: string;
  profissao?: string;
  renda_familiar?: number;
  possui_filhos?: boolean;
  quantidade_filhos?: number;
  rede_apoio?: string;
  situacao_moradia?: string;
  tipo_moradia?: string;
  composicao_familiar?: string;
  historico_violencia?: string;
  tipo_violencia?: string;
  medida_protetiva?: boolean;
  acompanhamento_psicologico?: boolean;
  encaminhamento_servico_social?: boolean;
  observacoes?: string;
  documentos_pendentes?: string[];
  meta_dados?: Record<string, any>;
  ativo: boolean;
  data_criacao: Date | string;
  data_atualizacao?: Date | string;
  status?: 'ATIVA' | 'INATIVA' | 'ACOMPANHAMENTO' | 'CONCLUIDO';
}

export interface IAtividadeBeneficiaria {
  id: string;
  beneficiaria_id: string;
  tipo: 'OFICINA' | 'PROJETO' | 'ATENDIMENTO';
  atividade_id: string;
  data_inicio: Date | string;
  data_fim?: Date | string;
  status: 'INSCRITA' | 'PARTICIPANDO' | 'CONCLUIDO' | 'DESISTENTE';
  observacoes?: string;
  meta_dados?: Record<string, any>;
  ativo: boolean;
  data_criacao: Date | string;
  data_atualizacao?: Date | string;
}
