import { z } from 'zod';

// Schema base para projeto
export const projetoSchema = z.object({
  id: z.number(),
  nome: z.string().min(3).max(255),
  descricao: z.string().max(2000).nullable().optional(),
  data_inicio: z.string().transform(val => new Date(val)).or(z.date()),
  data_fim_prevista: z.string().transform(val => new Date(val)).or(z.date()).nullable().optional(),
  data_fim_real: z.string().transform(val => new Date(val)).or(z.date()).nullable().optional(),
  status: z.enum(['planejamento', 'em_andamento', 'concluido', 'cancelado']).default('planejamento'),
  responsavel_id: z.number(),
  orcamento: z.number().nullable().optional(),
  local_execucao: z.string().max(255).nullable().optional(),
  ativo: z.boolean().default(true),
  data_criacao: z.date(),
  data_atualizacao: z.date()
});

// Schema para criação de projeto
export const createProjetoSchema = projetoSchema
  .omit({
    id: true,
    data_fim_real: true,
    data_criacao: true,
    data_atualizacao: true,
    ativo: true
  });

// Schema para atualização de projeto
export const updateProjetoSchema = projetoSchema
  .omit({
    id: true,
    responsavel_id: true,
    data_criacao: true,
    data_atualizacao: true,
    ativo: true
  })
  .partial();

// Schema para filtros de listagem
export const projetoFilterSchema = z.object({
  page: z.string().optional().transform(val => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform(val => (val ? parseInt(val) : 50)),
  status: projetoSchema.shape.status.optional(),
  search: z.string().optional()
});

// Types
export type Projeto = z.infer<typeof projetoSchema>;
export type CreateProjetoDTO = z.infer<typeof createProjetoSchema>;
export type UpdateProjetoDTO = z.infer<typeof updateProjetoSchema>;
export type ProjetoFilters = z.infer<typeof projetoFilterSchema>;
