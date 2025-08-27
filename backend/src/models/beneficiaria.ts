export interface Beneficiaria {
  id: number;
  nome_completo: string;
  cpf: string;
  data_nascimento: Date;
  telefone?: string;
  email?: string;
  endereco?: string;
  estado_civil?: string;
  escolaridade?: string;
  renda_familiar?: number;
  num_dependentes?: number;
  situacao_moradia?: string;
  historico_violencia?: string;
  tipo_violencia?: string[];
  medida_protetiva?: boolean;
  acompanhamento_juridico?: boolean;
  acompanhamento_psicologico?: boolean;
  status: 'ativa' | 'inativa' | 'em_acompanhamento';
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}
