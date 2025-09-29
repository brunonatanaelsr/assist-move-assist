import { z } from 'zod';

const anyOptional = z.any().optional();
const emptyObject = z.object({}).optional();
const organizacaoIdParams = z.object({ id: z.coerce.number() });

export const organizacaoPayloadSchema = z.object({
  nome: z.string().trim().min(2),
  cnpj: z.string().trim().min(11).max(18).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  telefone: z.string().trim().min(8).max(20).optional().nullable(),
  endereco: z.string().trim().max(255).optional().nullable(),
  ativo: z.boolean().optional()
});

export const getOrganizacaoRequestSchema = z.object({
  params: organizacaoIdParams,
  query: anyOptional,
  body: anyOptional
});

export const createOrganizacaoRequestSchema = z.object({
  body: organizacaoPayloadSchema,
  params: emptyObject,
  query: anyOptional
});

export const updateOrganizacaoRequestSchema = z.object({
  params: organizacaoIdParams,
  body: organizacaoPayloadSchema.partial(),
  query: anyOptional
});

export const deleteOrganizacaoRequestSchema = z.object({
  params: organizacaoIdParams,
  body: anyOptional,
  query: anyOptional
});
