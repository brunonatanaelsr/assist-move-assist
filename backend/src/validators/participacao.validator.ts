import { z } from 'zod';

const coerceDate = z.preprocess((value) => value, z.coerce.date());
const coerceNullableDate = z.preprocess(
  (value) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return value;
  },
  z.coerce.date()
).nullable().optional();

// Schema para participação
export const participacaoSchema = z.object({
  id: z.coerce.number(),
  beneficiaria_id: z.coerce.number(),
  projeto_id: z.coerce.number(),
  status: z.enum([
    'ativa', 
    'concluida', 
    'desistente', 
    'em_espera',
    'interesse',
    'inscrita'
  ]).default('inscrita'),
  data_inscricao: coerceDate,
  data_conclusao: coerceNullableDate,
  observacoes: z.string().max(1000).nullable().optional(),
  certificado_emitido: z.boolean().default(false),
  presenca_percentual: z.number().min(0).max(100).default(0),
  ativo: z.boolean().default(true),
  data_criacao: coerceDate,
  data_atualizacao: coerceDate
});

// Schema para criação de participação
export const createParticipacaoSchema = participacaoSchema
  .partial()
  .required({
    beneficiaria_id: true,
    projeto_id: true
  });

// Schema para atualização de participação
export const updateParticipacaoSchema = participacaoSchema
  .partial()
  .refine(
    (data) => {
      // Se status for 'concluida', data_conclusao é obrigatória
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
      // Se certificado_emitido é true, presenca_percentual deve ser >= 75%
      if (data.certificado_emitido) {
        return data.presenca_percentual !== undefined && data.presenca_percentual >= 75;
      }
      return true;
    },
    {
      message: "Presença mínima de 75% é necessária para emitir certificado"
    }
  );

// Schema para filtros de listagem
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

// Types
export type Participacao = z.infer<typeof participacaoSchema>;
export type CreateParticipacaoDTO = z.infer<typeof createParticipacaoSchema>;
export type UpdateParticipacaoDTO = z.infer<typeof updateParticipacaoSchema>;
export type ParticipacaoFilters = z.infer<typeof participacaoFilterSchema>;
