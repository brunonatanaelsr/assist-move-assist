import { User } from './auth';

export interface FormularioBase {
  id: number;
  beneficiaria_id: number;
  beneficiaria_nome?: string;
  responsavel_preenchimento: string;
  data_criacao: Date;
  data_atualizacao: Date;
  ativo: boolean;
}

export interface AnamneseSocial extends FormularioBase {
  tipo: 'anamnese_social';
  composicao_familiar: string | null;
  situacao_habitacional: string | null;
  tipo_moradia: string | null;
  condicoes_moradia: string | null;
  renda_familiar_total: number | null;
  fonte_renda: string | null;
  beneficios_sociais: string[];
  gastos_principais: string | null;
  condicao_saude_geral: string | null;
  problemas_saude: string | null;
  uso_medicamentos: boolean;
  medicamentos_uso: string | null;
  acompanhamento_medico: boolean;
  nivel_escolaridade: string | null;
  desejo_capacitacao: string | null;
  areas_interesse: string[];
  rede_apoio: string | null;
  participacao_comunitaria: string | null;
  violencias_enfrentadas: string | null;
  expectativas_programa: string | null;
  objetivos_pessoais: string | null;
  disponibilidade_participacao: string | null;
  observacoes: string | null;
}

export interface RodaDaVida extends FormularioBase {
  tipo: 'roda_da_vida';
  saude_bem_estar: number;
  desenvolvimento_pessoal: number;
  vida_social: number;
  ambiente_moradia: number;
  trabalho_carreira: number;
  financeiro: number;
  relacoes_familiares: number;
  vida_amorosa: number;
  objetivos_acoes: Record<string, string>;
  observacoes: string | null;
}

export interface PlanoDesenvolvimento extends FormularioBase {
  tipo: 'plano_desenvolvimento';
  objetivos: {
    curto_prazo: string[];
    medio_prazo: string[];
    longo_prazo: string[];
  };
  acoes_planejadas: Array<{
    objetivo: string;
    acao: string;
    prazo: Date;
    status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';
  }>;
  recursos_necessarios: string[];
  suporte_requerido: string | null;
  barreiras_identificadas: string[];
  proximos_passos: string | null;
  observacoes: string | null;
}

export type TipoFormulario = 'anamnese_social' | 'roda_da_vida' | 'plano_desenvolvimento';

export type Formulario = AnamneseSocial | RodaDaVida | PlanoDesenvolvimento;

export interface FormularioFiltros {
  tipo?: TipoFormulario;
  beneficiaria_id?: number;
  data_inicio?: Date;
  data_fim?: Date;
  responsavel?: string;
}

export const TIPOS_FORMULARIO = {
  anamnese_social: 'Anamnese Social',
  roda_da_vida: 'Roda da Vida',
  plano_desenvolvimento: 'Plano de Desenvolvimento'
} as const;
