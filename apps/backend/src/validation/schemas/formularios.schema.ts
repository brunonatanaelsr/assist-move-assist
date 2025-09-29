import { z } from 'zod';

const anyOptional = z.any().optional();

export const revokeTermoConsentimentoRequestSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({ motivo: z.string().trim().max(500).optional() }),
  query: anyOptional
});

export const createGenericFormularioRequestSchema = z.object({
  params: z.object({ tipo: z.string().trim().min(1) }),
  body: z.object({
    beneficiaria_id: z.coerce.number(),
    dados: z.any().optional(),
    status: z.string().trim().optional(),
    observacoes: z.string().trim().optional()
  }),
  query: anyOptional
});
