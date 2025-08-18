export interface BeneficiariaDetalhes {
  id: number;
  nome_completo: string;
  cpf: string;
  data_criacao?: string;
  data_cadastro?: string;
  rg?: string;
  data_nascimento?: string;
  idade?: number;
  contato1: string;
  contato2?: string;
  email?: string;
  endereco?: string;
  bairro?: string;
  cep?: string;
  cidade: string;
  estado: string;
  nis?: string;
  escolaridade?: string;
  profissao?: string;
  renda_familiar?: number;
  composicao_familiar?: number;
  referencia?: string;
  data_inicio_instituto?: string;
  programa_servico?: string;
  observacoes?: string;
  necessidades_especiais?: string;
  medicamentos?: string;
  alergias?: string;
  contato_emergencia?: string;
  documentos_pendentes?: string[];
  responsavel_cadastro?: number;
  data_atualizacao?: string;
  ativo: boolean;
  
  // Campos adicionais
  status?: string;
  estado_civil?: string;
  tem_filhos?: boolean;
  quantidade_filhos?: number;
  situacao_vulnerabilidade?: string;
}
