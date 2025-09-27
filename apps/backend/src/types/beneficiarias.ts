export type BeneficiariaStatus = 'ativa' | 'inativa' | 'pendente' | 'desistente';

export interface BeneficiariaFamiliar {
  id?: number;
  nome: string;
  parentesco?: string | null;
  data_nascimento?: Date | null;
  trabalha?: boolean | null;
  renda_mensal?: number | null;
  observacoes?: string | null;
}

export interface Beneficiaria {
  id: number;
  codigo: string;
  nome_completo: string;
  cpf: string;
  rg?: string | null;
  rg_orgao_emissor?: string | null;
  rg_data_emissao?: Date | null;
  nis?: string | null;
  data_nascimento: Date;
  telefone: string;
  telefone_secundario?: string | null;
  email?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  referencia_endereco?: string | null;
  escolaridade?: string | null;
  estado_civil?: string | null;
  num_dependentes?: number | null;
  renda_familiar?: number | null;
  situacao_moradia?: string | null;
  observacoes_socioeconomicas?: string | null;
  status: BeneficiariaStatus;
  observacoes?: string | null;
  historico_violencia?: string | null;
  tipo_violencia?: string[] | null;
  medida_protetiva?: boolean | null;
  acompanhamento_juridico?: boolean | null;
  acompanhamento_psicologico?: boolean | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface BeneficiariaDetalhada extends Beneficiaria {
  familiares: BeneficiariaFamiliar[];
  vulnerabilidades: string[];
}

export interface BeneficiariaFiltros {
  search?: string;
  status?: BeneficiariaStatus;
  medida_protetiva?: boolean;
  tipo_violencia?: string[];
  data_inicio?: Date;
  data_fim?: Date;
}

export interface BeneficiariaResumo {
  id: number;
  nome_completo: string;
  cpf: string;
  telefone?: string | null;
  status: BeneficiariaStatus;
  projetos_ativos: number;
  oficinas_mes: number;
  ultimo_formulario?: Date | null;
}

export interface BeneficiariaCreatePayload
  extends Omit<Beneficiaria, 'id' | 'codigo' | 'created_at' | 'updated_at' | 'deleted_at' | 'tipo_violencia'> {
  vulnerabilidades?: string[];
  familiares?: BeneficiariaFamiliar[];
  tipo_violencia?: string[] | null;
}

export interface BeneficiariaUpdatePayload
  extends Partial<BeneficiariaCreatePayload> {}

export interface BeneficiariaResumoDetalhado {
  beneficiaria: {
    id: number;
    nome_completo: string;
    status: BeneficiariaStatus;
    created_at: Date;
    updated_at: Date;
  };
  formularios: {
    total: number;
    anamnese: number;
    ficha_evolucao: number;
    termos: number;
    visao_holistica: number;
    genericos: number;
  };
  atendimentos: {
    total: number;
    ultimo_atendimento: Date | null;
  };
  participacoes: {
    total_ativas: number;
  };
}

export type BeneficiariaAtividadeTipo =
  | 'formulario'
  | 'anamnese'
  | 'ficha_evolucao'
  | 'termos_consentimento'
  | 'visao_holistica';

export interface BeneficiariaAtividade {
  type: BeneficiariaAtividadeTipo;
  id: number;
  created_at: Date;
  created_by: number | null;
  created_by_name?: string | null;
}

export interface BeneficiariaAtividadeLista {
  data: BeneficiariaAtividade[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
