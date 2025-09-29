import { z } from 'zod';
import { isCPF } from 'brazilian-values';
import { digitsOnly, sanitizeEmail, sanitizeText } from './sanitizers';

const cpfSchema = z
  .string()
  .transform(digitsOnly)
  .pipe(z.string().length(11, 'CPF deve conter 11 dígitos'))
  .refine((value) => isCPF(value), 'CPF inválido');

const telefoneSchema = z
  .string()
  .transform(digitsOnly)
  .pipe(z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'));

const cepSchema = z
  .string()
  .transform(digitsOnly)
  .pipe(z.string().length(8, 'CEP deve conter 8 dígitos'));

const horarioRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

const sanitizedString = (min?: number, max?: number) => {
  let schema = z.string().trim();
  if (typeof min === 'number') {
    schema = schema.min(min);
  }
  if (typeof max === 'number') {
    schema = schema.max(max);
  }
  return schema.transform(sanitizeText);
};

const sanitizedOptionalString = (max?: number) =>
  z
    .string()
    .trim()
    .max(max ?? 255)
    .transform(sanitizeText)
    .optional()
    .nullable();

export const beneficiariaSchema = z.object({
  nome_completo: sanitizedString(3, 100),
  cpf: cpfSchema,
  data_nascimento: z
    .string()
    .trim()
    .transform(sanitizeText)
    .pipe(z.string().datetime()),
  telefone: telefoneSchema,
  email: z
    .string()
    .trim()
    .transform(sanitizeEmail)
    .pipe(z.string().email('Email inválido'))
    .optional()
    .nullable(),
  endereco: z.object({
    cep: cepSchema,
    logradouro: sanitizedString(3, 100),
    numero: sanitizedString(1, 60),
    complemento: sanitizedOptionalString(120),
    bairro: sanitizedString(2, 120),
    cidade: sanitizedString(2, 120),
    estado: z
      .string()
      .trim()
      .length(2, 'Estado deve conter 2 caracteres')
      .transform((value) => sanitizeText(value).toUpperCase())
  }),
  status: z.enum(['ativa', 'inativa', 'arquivada']).default('ativa')
});

export const oficinaSchema = z.object({
  titulo: sanitizedString(3, 100),
  descricao: sanitizedString(10),
  data_inicio: z
    .string()
    .trim()
    .transform(sanitizeText)
    .pipe(z.string().datetime()),
  data_fim: z
    .string()
    .trim()
    .transform(sanitizeText)
    .pipe(z.string().datetime())
    .nullable(),
  horario_inicio: z
    .string()
    .trim()
    .transform(sanitizeText)
    .refine((value) => horarioRegex.test(value), 'Formato inválido de hora'),
  horario_fim: z
    .string()
    .trim()
    .transform(sanitizeText)
    .refine((value) => horarioRegex.test(value), 'Formato inválido de hora'),
  dias_semana: z
    .array(
      z.enum(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'])
    )
    .min(1),
  vagas_total: z.number().int().positive(),
  projeto_id: z.number().int().positive(),
  responsavel_id: z.number().int().positive(),
  status: z.enum(['ativa', 'inativa', 'cancelada', 'concluida']).default('ativa')
});

export const projetoSchema = z.object({
  titulo: sanitizedString(3, 100),
  descricao: sanitizedString(10),
  data_inicio: z
    .string()
    .trim()
    .transform(sanitizeText)
    .pipe(z.string().datetime()),
  data_fim: z
    .string()
    .trim()
    .transform(sanitizeText)
    .pipe(z.string().datetime())
    .nullable(),
  coordenador_id: z.number().int().positive(),
  status: z.enum(['ativo', 'inativo', 'concluido']).default('ativo')
});

export const inscricaoOficinaSchema = z.object({
  beneficiaria_id: z.number().int().positive(),
  oficina_id: z.number().int().positive(),
  data_inscricao: z
    .string()
    .trim()
    .transform(sanitizeText)
    .pipe(z.string().datetime())
    .default(() => new Date().toISOString()),
  status: z.enum(['pendente', 'confirmada', 'cancelada']).default('pendente'),
  observacoes: sanitizedOptionalString()
});

export const presencaSchema = z.object({
  inscricao_id: z.number().int().positive(),
  data_aula: z
    .string()
    .trim()
    .transform(sanitizeText)
    .pipe(z.string().datetime()),
  presente: z.boolean(),
  observacoes: sanitizedOptionalString()
});

export type Beneficiaria = z.infer<typeof beneficiariaSchema>;
export type Oficina = z.infer<typeof oficinaSchema>;
export type Projeto = z.infer<typeof projetoSchema>;
export type InscricaoOficina = z.infer<typeof inscricaoOficinaSchema>;
export type Presenca = z.infer<typeof presencaSchema>;
