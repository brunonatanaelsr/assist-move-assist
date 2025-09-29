import { z } from 'zod';

export const participacaoSchema = z.object({
  id: z.number(),
  beneficiaria_id: z.string(),
  projeto_id: z.number(),
  status: z
    .enum(['ativa', 'concluida', 'desistente', 'em_espera', 'interesse', 'inscrita'])
    .default('inscrita'),
  data_inscricao: z.coerce.date(),
  data_conclusao: z.coerce.date().nullable().optional(),
  observacoes: z.string().max(1000).nullable().optional(),
  certificado_emitido: z.boolean().default(false),
  presenca_percentual: z.number().min(0).max(100).default(0),
  ativo: z.boolean().default(true),
  data_criacao: z.coerce.date(),
  data_atualizacao: z.coerce.date()
});

export const createParticipacaoSchema = participacaoSchema.partial().required({
  beneficiaria_id: true,
  projeto_id: true
});

export const updateParticipacaoSchema = participacaoSchema
  .partial()
  .refine(
    (data) => {
      if (data.status === 'concluida') {
        return data.data_conclusao !== undefined && data.data_conclusao !== null;
      }
      return true;
    },
    {
      message: "Data de conclusão é obrigatória quando o status é 'concluida'"
    }
  )
  .refine(
    (data) => {
      if (data.certificado_emitido) {
        return data.presenca_percentual !== undefined && data.presenca_percentual >= 75;
      }
      return true;
    },
    {
      message: 'Presença mínima de 75% é necessária para emitir certificado'
    }
  );

export const participacaoFilterSchema = z.object({
  beneficiaria_id: z.coerce.number().optional(),
  projeto_id: z.coerce.number().optional(),
  oficina_id: z.coerce.number().optional(),
  status: participacaoSchema.shape.status.optional(),
  data_inicio: z.coerce.date().optional(),
  data_fim: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(50)
});

export type Participacao = z.infer<typeof participacaoSchema>;
export type CreateParticipacaoDTO = z.infer<typeof createParticipacaoSchema>;
export type UpdateParticipacaoDTO = z.infer<typeof updateParticipacaoSchema>;
export type ParticipacaoFilters = z.infer<typeof participacaoFilterSchema>;

const emptyObject = z.object({}).optional();
const anyOptional = z.any().optional();

export const createParticipacaoRequestSchema = z.object({
  body: createParticipacaoSchema,
  params: emptyObject,
  query: anyOptional
});

export const updateParticipacaoRequestSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: updateParticipacaoSchema,
  query: anyOptional
});
