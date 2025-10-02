import { z } from '../openapi/init';
import { isCPF } from 'brazilian-values';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const optionalDate = z.string()
  .regex(dateRegex, 'Data deve estar no formato YYYY-MM-DD')
  .transform(value => new Date(value))
  .optional()
  .nullable()
  .refine(value => !value || value < new Date(), 'Data informada não pode ser futura');

const requiredDate = z.string()
  .regex(dateRegex, 'Data deve estar no formato YYYY-MM-DD')
  .transform(value => new Date(value))
  .refine(value => value < new Date(), 'Data informada não pode ser futura');

const familiarSchema = z.object({
  nome: z.string().min(2, 'Nome do familiar é obrigatório').max(150),
  parentesco: z.string().max(80, 'Parentesco deve ter no máximo 80 caracteres').optional(),
  data_nascimento: optionalDate,
  trabalha: z.boolean().optional(),
  renda_mensal: z.number().min(0, 'Renda deve ser positiva').optional(),
  observacoes: z.string().max(255).optional()
});

export const beneficiariaSchema = z.object({
  nome_completo: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(150, 'Nome deve ter no máximo 150 caracteres')
    .transform(nome => nome.trim()),

  cpf: z.string()
    .length(11, 'CPF deve ter 11 dígitos')
    .refine(cpf => isCPF(cpf), 'CPF inválido'),

  rg: z.string().max(20).optional().nullable(),
  rg_orgao_emissor: z.string().max(50).optional().nullable(),
  rg_data_emissao: optionalDate,
  nis: z.string().max(20).optional().nullable(),

  data_nascimento: z.string()
    .regex(dateRegex, 'Data deve estar no formato YYYY-MM-DD')
    .transform(data => new Date(data))
    .refine(data => data < new Date(), 'Data de nascimento não pode ser futura'),

  telefone: z.string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),

  telefone_secundario: z.string()
    .regex(/^\d{10,11}$/, 'Telefone secundário deve ter 10 ou 11 dígitos')
    .optional()
    .nullable(),

  email: z.string()
    .email('Email inválido')
    .optional()
    .nullable(),

  endereco: z.string().max(255).optional().nullable(),
  bairro: z.string().max(120).optional().nullable(),
  cidade: z.string().max(120).optional().nullable(),
  estado: z.string().length(2, 'Estado deve ter 2 caracteres').optional().nullable(),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional().nullable(),
  referencia_endereco: z.string().max(255).optional().nullable(),

  escolaridade: z.string().max(100).optional().nullable(),
  estado_civil: z.string().max(50).optional().nullable(),
  num_dependentes: z.number().min(0).max(25).optional().nullable(),
  renda_familiar: z.number().min(0).optional().nullable(),
  situacao_moradia: z.string().max(120).optional().nullable(),
  observacoes_socioeconomicas: z.string().optional().nullable(),

  status: z.enum(['ativa', 'inativa', 'pendente', 'desistente']).optional(),
  observacoes: z.string().optional().nullable(),

  familiares: z.array(familiarSchema).optional(),
  vulnerabilidades: z.array(z.string()).optional()
});

export type BeneficiariaInput = z.infer<typeof beneficiariaSchema>;

export const validateBeneficiaria = async (
  data: Partial<BeneficiariaInput>,
  partial = false
) => {
  const schema = partial ? beneficiariaSchema.partial() : beneficiariaSchema;
  return schema.parseAsync(data);
};

export const infoSocioeconomicaSchema = z.object({
  renda_familiar: z.number().min(0).optional().nullable(),
  quantidade_moradores: z.number().int().min(0).optional().nullable(),
  tipo_moradia: z.string().max(120).optional().nullable(),
  escolaridade: z.string().max(120).optional().nullable(),
  profissao: z.string().max(120).optional().nullable(),
  situacao_trabalho: z.string().max(120).optional().nullable(),
  beneficios_sociais: z.array(z.string().max(120)).optional().nullable()
});

export const dependenteSchema = z.object({
  nome_completo: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(150, 'Nome deve ter no máximo 150 caracteres'),
  data_nascimento: requiredDate,
  parentesco: z
    .string()
    .min(2, 'Parentesco deve ter no mínimo 2 caracteres')
    .max(120, 'Parentesco deve ter no máximo 120 caracteres'),
  cpf: z
    .string()
    .length(11, 'CPF deve ter 11 dígitos')
    .refine(cpf => isCPF(cpf), 'CPF inválido')
    .optional()
    .nullable()
});

export const atendimentoSchema = z.object({
  tipo: z
    .string()
    .min(3, 'Tipo do atendimento deve ter ao menos 3 caracteres')
    .max(120, 'Tipo do atendimento deve ter no máximo 120 caracteres'),
  data: z.coerce
    .date()
    .refine((value) => !Number.isNaN(value.getTime()), 'Data do atendimento é obrigatória'),
  descricao: z
    .string()
    .min(5, 'Descrição deve ter ao menos 5 caracteres'),
  encaminhamentos: z.string().optional().nullable(),
  profissional_id: z.number().int().positive().optional().nullable()
});
