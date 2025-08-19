import { z } from 'zod';

export interface Beneficiaria {
  id: number;
  nome_completo: string;
  data_nascimento: Date;
  cpf?: string;
  rg?: string;
  telefone?: string;
  email?: string;
  endereco?: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  estado_civil?: string;
  num_filhos?: number;
  escolaridade?: string;
  profissao?: string;
  renda_familiar?: number;
  status: 'ativa' | 'inativa' | 'pendente' | 'desligada';
  foto_url?: string;
  observacoes?: string;
  ativo: boolean;
  usuario_criacao: number;
  usuario_atualizacao: number;
  data_criacao: Date;
  data_atualizacao: Date;
}

export interface BeneficiariaFiltros {
  search?: string;
  status?: Beneficiaria['status'];
  data_inicio?: Date;
  data_fim?: Date;
  escolaridade?: string;
  renda_min?: number;
  renda_max?: number;
}

export interface BeneficiariaResumo {
  id: number;
  nome_completo: string;
  cpf?: string;
  telefone?: string;
  status: Beneficiaria['status'];
  projetos_ativos: number;
  oficinas_mes: number;
  ultimo_formulario?: Date;
}

export const enderecoSchema = z.object({
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  logradouro: z.string().min(3).max(100),
  numero: z.string().max(10),
  complemento: z.string().max(50).optional(),
  bairro: z.string().min(2).max(50),
  cidade: z.string().min(2).max(50),
  estado: z.string().length(2)
});

export const beneficiariaSchema = z.object({
  nome_completo: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  data_nascimento: z.date()
    .min(new Date(1900, 0, 1), 'Data de nascimento inválida')
    .max(new Date(), 'Data de nascimento não pode ser futura'),
  cpf: z.string()
    .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido')
    .optional(),
  rg: z.string().max(20).optional(),
  telefone: z.string()
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido')
    .optional(),
  email: z.string().email('Email inválido').optional(),
  endereco: enderecoSchema.optional(),
  estado_civil: z.enum([
    'solteira',
    'casada',
    'divorciada',
    'viuva',
    'uniao_estavel'
  ]).optional(),
  num_filhos: z.number().min(0).max(20).optional(),
  escolaridade: z.enum([
    'fundamental_incompleto',
    'fundamental_completo',
    'medio_incompleto',
    'medio_completo',
    'superior_incompleto',
    'superior_completo',
    'pos_graduacao'
  ]).optional(),
  profissao: z.string().max(100).optional(),
  renda_familiar: z.number().min(0).optional(),
  status: z.enum([
    'ativa',
    'inativa',
    'pendente',
    'desligada'
  ]).default('pendente'),
  foto_url: z.string().url('URL inválida').optional(),
  observacoes: z.string().max(500).optional()
});
