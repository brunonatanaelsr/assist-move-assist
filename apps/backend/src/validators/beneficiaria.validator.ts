import { z } from 'zod';
import { isCPF } from 'brazilian-values';
import { digitsOnly, sanitizeEmail, sanitizeText } from '../validation/sanitizers';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const preprocessDateInput = (input: unknown): unknown => {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input !== 'string') return input;
  const sanitized = sanitizeText(input);
  return sanitized.length === 0 ? null : sanitized;
};

const baseDateSchema = z
  .string()
  .trim()
  .regex(dateRegex, 'Data deve estar no formato YYYY-MM-DD')
  .transform((value) => new Date(value));

const optionalDate = z
  .preprocess(preprocessDateInput, baseDateSchema.nullable())
  .optional()
  .refine(
    (value) => value === undefined || value === null || value < new Date(),
    'Data informada não pode ser futura'
  );

const requiredDate = z
  .preprocess(
    (input) => {
      if (typeof input !== 'string') return input;
      return sanitizeText(input);
    },
    baseDateSchema
  )
  .refine((value) => value < new Date(), 'Data informada não pode ser futura');

const familiarSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, 'Nome do familiar é obrigatório')
    .max(150, 'Nome do familiar deve ter no máximo 150 caracteres')
    .transform(sanitizeText),
  parentesco: z
    .string()
    .trim()
    .max(80, 'Parentesco deve ter no máximo 80 caracteres')
    .transform(sanitizeText)
    .optional(),
  data_nascimento: optionalDate,
  trabalha: z.boolean().optional(),
  renda_mensal: z.number().min(0, 'Renda deve ser positiva').optional(),
  observacoes: z
    .string()
    .trim()
    .max(255, 'Observações devem ter no máximo 255 caracteres')
    .transform(sanitizeText)
    .optional()
});

export const beneficiariaSchema = z.object({
  nome_completo: z
    .string()
    .trim()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(150, 'Nome deve ter no máximo 150 caracteres')
    .transform(sanitizeText),

  cpf: z
    .string()
    .transform(digitsOnly)
    .refine((cpf) => /^\d{11}$/.test(cpf), 'CPF deve ter 11 dígitos')
    .refine((cpf) => isCPF(cpf), 'CPF inválido'),

  rg: z.string().max(20).optional().nullable(),
  rg_orgao_emissor: z.string().max(50).optional().nullable(),
  rg_data_emissao: optionalDate,
  nis: z.string().max(20).optional().nullable(),

  data_nascimento: requiredDate,

  telefone: z
    .string()
    .transform(digitsOnly)
    .refine((value) => /^\d{10,11}$/.test(value), 'Telefone deve ter 10 ou 11 dígitos'),

  telefone_secundario: z
    .preprocess((input) => {
      if (input === undefined) return undefined;
      if (input === null) return null;
      if (typeof input !== 'string') return input;
      const sanitized = digitsOnly(input);
      return sanitized.length === 0 ? null : sanitized;
    },
    z
      .string()
      .regex(/^\d{10,11}$/, 'Telefone secundário deve ter 10 ou 11 dígitos')
      .nullable()
    )
    .optional(),

  email: z
    .preprocess((input) => {
      if (input === undefined) return undefined;
      if (input === null) return null;
      if (typeof input !== 'string') return input;
      const sanitized = sanitizeEmail(input);
      return sanitized.length === 0 ? null : sanitized;
    }, z.string().email('Email inválido').nullable())
    .optional(),

  endereco: z
    .string()
    .trim()
    .max(255)
    .transform(sanitizeText)
    .optional()
    .nullable(),
  bairro: z
    .string()
    .trim()
    .max(120)
    .transform(sanitizeText)
    .optional()
    .nullable(),
  cidade: z
    .string()
    .trim()
    .max(120)
    .transform(sanitizeText)
    .optional()
    .nullable(),
  estado: z
    .string()
    .trim()
    .length(2, 'Estado deve ter 2 caracteres')
    .transform((value) => sanitizeText(value).toUpperCase())
    .optional()
    .nullable(),
  cep: z
    .string()
    .transform(digitsOnly)
    .refine((value) => value.length === 0 || /^\d{8}$/.test(value), 'CEP inválido')
    .optional()
    .nullable(),
  referencia_endereco: z
    .string()
    .trim()
    .max(255)
    .transform(sanitizeText)
    .optional()
    .nullable(),

  escolaridade: z
    .string()
    .trim()
    .max(100)
    .transform(sanitizeText)
    .optional()
    .nullable(),
  estado_civil: z
    .string()
    .trim()
    .max(50)
    .transform(sanitizeText)
    .optional()
    .nullable(),
  num_dependentes: z.number().min(0).max(25).optional().nullable(),
  renda_familiar: z.number().min(0).optional().nullable(),
  situacao_moradia: z
    .string()
    .trim()
    .max(120)
    .transform(sanitizeText)
    .optional()
    .nullable(),
  observacoes_socioeconomicas: z
    .string()
    .trim()
    .max(1000)
    .transform(sanitizeText)
    .optional()
    .nullable(),

  status: z.enum(['ativa', 'inativa', 'pendente', 'desistente']).optional(),
  observacoes: z
    .string()
    .trim()
    .max(1000)
    .transform(sanitizeText)
    .optional()
    .nullable(),

  familiares: z.array(familiarSchema).optional(),
  vulnerabilidades: z.array(z.string().transform(sanitizeText)).optional()
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
  tipo_moradia: z
    .string()
    .trim()
    .max(120)
    .transform(sanitizeText)
    .optional()
    .nullable(),
  escolaridade: z
    .string()
    .trim()
    .max(120)
    .transform(sanitizeText)
    .optional()
    .nullable(),
  profissao: z
    .string()
    .trim()
    .max(120)
    .transform(sanitizeText)
    .optional()
    .nullable(),
  situacao_trabalho: z
    .string()
    .trim()
    .max(120)
    .transform(sanitizeText)
    .optional()
    .nullable(),
  beneficios_sociais: z
    .array(z.string().trim().max(120).transform(sanitizeText))
    .optional()
    .nullable()
});

export const dependenteSchema = z.object({
  nome_completo: z
    .string()
    .trim()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(150, 'Nome deve ter no máximo 150 caracteres')
    .transform(sanitizeText),
  data_nascimento: requiredDate,
  parentesco: z
    .string()
    .trim()
    .min(2, 'Parentesco deve ter no mínimo 2 caracteres')
    .max(120, 'Parentesco deve ter no máximo 120 caracteres')
    .transform(sanitizeText),
  cpf: z
    .string()
    .transform(digitsOnly)
    .refine((cpf) => cpf.length === 0 || /^\d{11}$/.test(cpf), 'CPF deve ter 11 dígitos')
    .refine((cpf) => cpf.length === 0 || isCPF(cpf), 'CPF inválido')
    .optional()
    .nullable()
});

export const atendimentoSchema = z.object({
  tipo: z
    .string()
    .trim()
    .min(3, 'Tipo do atendimento deve ter ao menos 3 caracteres')
    .max(120, 'Tipo do atendimento deve ter no máximo 120 caracteres')
    .transform(sanitizeText),
  data: z.coerce
    .date()
    .refine((value) => !Number.isNaN(value.getTime()), 'Data do atendimento é obrigatória'),
  descricao: z
    .string()
    .trim()
    .min(5, 'Descrição deve ter ao menos 5 caracteres')
    .transform(sanitizeText),
  encaminhamentos: z
    .string()
    .trim()
    .transform(sanitizeText)
    .optional()
    .nullable(),
  profissional_id: z.number().int().positive().optional().nullable()
});
