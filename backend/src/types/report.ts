// Substitui dependência do Prisma por um tipo JSON local
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

export interface ReportTemplate {
  id: number;
  name: string;
  description?: string;
  type: string;
  filters: JSONValue;
  metrics: string[];
  charts: JSONValue;
  schedule?: JSONValue;
  created_at: Date;
  updated_at: Date;
}

export interface Beneficiaria {
  id: number;
  nome: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Projeto {
  id: number;
  nome: string;
  status: string;
  participantes: Beneficiaria[];
  atividades: Atividade[];
  avaliacoes: Avaliacao[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Atividade {
  id: number;
  nome: string;
  status: string;
  projetoId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Avaliacao {
  id: number;
  nota: number;
  projetoId: number;
  createdAt: Date;
}

export interface Formulario {
  id: number;
  titulo: string;
  questoes: Questao[];
  respostas: RespostaFormulario[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Questao {
  id: number;
  texto: string;
  tipo: string;
  formularioId: number;
}

export interface RespostaFormulario {
  id: number;
  formularioId: number;
  status: string;
  tipo: string;
  nota: number;
  respostas: RespostaQuestao[];
  dataCriacao: Date;
  dataFinalizacao?: Date;
}

export interface RespostaQuestao {
  id: number;
  questaoId: number;
  respostaFormularioId: number;
  valor: string;
}

export interface Regiao {
  id: number;
  nome: string;
  beneficiarias: Beneficiaria[];
  projetos: Projeto[];
  createdAt: Date;
  updatedAt: Date;
}
