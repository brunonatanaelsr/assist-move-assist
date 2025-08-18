/**
 * Tipos para formulários do sistema
 */

export interface BeneficiariaFormData {
  nome_completo: string;
  cpf: string;
  rg?: string;
  data_nascimento: string;
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
  rede_apoio?: string[];
  situacao_moradia?: string;
  tipo_moradia?: string;
  composicao_familiar?: string;
  historico_violencia?: string;
  tipo_violencia?: string[];
  medida_protetiva?: boolean;
  acompanhamento_psicologico?: boolean;
  encaminhamento_servico_social?: string;
  observacoes?: string;
  documentos_pendentes?: string[];
  meta_dados?: Record<string, any>;
}

export interface ProjetoFormData {
  nome: string;
  descricao?: string;
  objetivo?: string;
  data_inicio: string;
  data_fim?: string;
  orcamento?: number;
  status?: 'planejamento' | 'em_andamento' | 'concluido' | 'cancelado' | 'pausado';
  responsavel_id: number;
  meta_indicadores?: Record<string, any>;
  resultados_alcancados?: Record<string, any>;
  arquivos_anexos?: string[];
  meta_dados?: Record<string, any>;
}

export interface OficinaFormData {
  nome: string;
  descricao?: string;
  instrutor?: string;
  data_inicio: string;
  data_fim?: string;
  horario_inicio: string;
  horario_fim: string;
  local?: string;
  vagas_totais: number;
  projeto_id?: number;
  responsavel_id: number;
  status_detalhado?: 'em_planejamento' | 'inscricoes_abertas' | 'em_andamento' | 'concluida' | 'cancelada' | 'pausada' | 'em_revisao';
  tem_lista_espera?: boolean;
  lista_espera_limite?: number;
  publico_alvo?: string;
  pre_requisitos?: string[];
  objetivos?: string[];
  categoria?: string;
  nivel?: 'iniciante' | 'intermediario' | 'avancado';
  carga_horaria?: number;
  certificado_disponivel?: boolean;
  materiais_necessarios?: string[];
  meta_dados?: Record<string, any>;
}

export interface ParticipacaoFormData {
  beneficiaria_id: number;
  oficina_id: number;
  status_participacao?: 'inscrita' | 'confirmada' | 'em_andamento' | 'concluida' | 'desistente' | 'reprovada';
  motivo_desistencia?: string;
  certificado_emitido?: boolean;
  data_conclusao?: string;
  meta_dados?: Record<string, any>;
}

export interface AvaliacaoFormData {
  oficina_id: number;
  beneficiaria_id: number;
  nota: number;
  comentario?: string;
  aspectos_positivos?: string[];
  aspectos_negativos?: string[];
  sugestoes?: string;
  meta_dados?: Record<string, any>;
}
