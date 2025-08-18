export interface Beneficiaria {
  id: number;
  nome_completo: string;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string | null;
  email: string;
  telefone: string;
  telefone_alternativo: string | null;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string;
  estado: string;
  escolaridade: string | null;
  profissao: string | null;
  renda_familiar: number | null;
  situacao_trabalho: string | null;
  tem_filhos: boolean;
  quantidade_filhos: number;
  observacoes: string | null;
  status: string;
  ativo: boolean;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface Mensagem {
  id: number;
  assunto: string;
  conteudo: string;
  tipo: 'mensagem' | 'notificacao' | 'lembrete' | 'alerta';
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  remetente_id: number;
  destinatario_id: number | null;
  beneficiaria_id: number | null;
  lida: boolean;
  data_leitura: string | null;
  anexos: string[];
  tags: string[];
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
  remetente_nome: string;
  destinatario_nome: string | null;
  beneficiaria_nome: string | null;
}

export type FormData = Record<string, unknown>;
