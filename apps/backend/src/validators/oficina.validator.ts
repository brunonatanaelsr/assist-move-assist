import { z } from '../openapi/init';

// Schema para horários (formato HH:mm)
const horarioSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido. Use HH:mm');

// Schema para oficinas
export const oficinaSchema = z.object({
  id: z.number(),
  nome: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(200, 'Nome muito longo'),
  descricao: z.string()
    .max(2000, 'Descrição muito longa')
    .nullable()
    .optional(),
  instrutor: z.string()
    .min(3, 'Nome do instrutor deve ter pelo menos 3 caracteres')
    .max(100, 'Nome do instrutor muito longo')
    .nullable()
    .optional(),
  data_inicio: z.string().transform(val => new Date(val)).or(z.date()),
  data_fim: z.string().transform(val => new Date(val)).or(z.date()).nullable().optional(),
  horario_inicio: horarioSchema,
  horario_fim: horarioSchema,
  local: z.string()
    .min(3, 'Local deve ter pelo menos 3 caracteres')
    .max(200, 'Local muito longo')
    .nullable()
    .optional(),
  vagas_total: z.number()
    .int('Número de vagas deve ser inteiro')
    .min(1, 'Número mínimo de vagas é 1')
    .max(1000, 'Número máximo de vagas é 1000')
    .nullable()
    .optional(),
  projeto_id: z.number().nullable().optional(),
  responsavel_id: z.union([z.string(), z.number()]).transform((val) => 
    typeof val === 'string' ? parseInt(val, 10) : val
  ).nullable().optional(),
  status: z.enum(['ativa', 'cancelada', 'concluida', 'em_andamento', 'planejada']),
  ativo: z.boolean().default(true),
  data_criacao: z.date(),
  data_atualizacao: z.date()
});

// Schema para criação de oficina (campos obrigatórios)
export const createOficinaSchema = oficinaSchema
  .partial()
  .required({
    nome: true,
    data_inicio: true,
    horario_inicio: true,
    horario_fim: true,
    vagas_total: true
  });

// Schema para atualização de oficina (todos os campos opcionais)
export const updateOficinaSchema = oficinaSchema.partial();

// Schema para filtros de listagem
export const oficinaFilterSchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(50),
  projeto_id: z.coerce.number().optional(),
  status: z.enum(['ativa', 'cancelada', 'concluida', 'em_andamento', 'planejada']).optional(),
  data_inicio: z.coerce.date().optional(),
  data_fim: z.coerce.date().optional(),
  instrutor: z.string().optional(),
  local: z.string().optional(),
  search: z.string().optional()
});

// Types
export type Oficina = z.infer<typeof oficinaSchema>;
export type CreateOficinaDTO = z.infer<typeof createOficinaSchema>;
export type UpdateOficinaDTO = z.infer<typeof updateOficinaSchema>;
export type OficinaFilters = z.infer<typeof oficinaFilterSchema>;
