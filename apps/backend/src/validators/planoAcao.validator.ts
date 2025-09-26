import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const optionalDate = z.string()
  .regex(dateRegex, 'Data deve estar no formato YYYY-MM-DD')
  .transform(value => new Date(value))
  .optional()
  .nullable();

export const planoAcaoItemSchema = z.object({
  titulo: z.string().min(3, 'Título da ação é obrigatório'),
  responsavel: z.string().optional().nullable(),
  prazo: optionalDate,
  status: z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada']).optional(),
  suporte_oferecido: z.string().optional().nullable()
});

export const planoAcaoSchema = z.object({
  beneficiaria_id: z.number().int().positive(),
  criado_por: z.number().int().positive().optional(),
  objetivo_principal: z.string().min(5, 'Objetivo principal é obrigatório'),
  areas_prioritarias: z.array(z.string()).optional(),
  observacoes: z.string().optional().nullable(),
  primeira_avaliacao_em: optionalDate,
  primeira_avaliacao_nota: z.string().optional().nullable(),
  segunda_avaliacao_em: optionalDate,
  segunda_avaliacao_nota: z.string().optional().nullable(),
  assinatura_beneficiaria: z.string().optional().nullable(),
  assinatura_responsavel: z.string().optional().nullable(),
  itens: z.array(planoAcaoItemSchema).min(1, 'Informe ao menos uma ação planejada')
});

export type PlanoAcaoInput = z.infer<typeof planoAcaoSchema>;
export type PlanoAcaoItemInput = z.infer<typeof planoAcaoItemSchema>;

export const validatePlanoAcao = async (data: unknown, partial = false) => {
  const schema = partial ? planoAcaoSchema.partial() : planoAcaoSchema;
  return schema.parseAsync(data);
};
