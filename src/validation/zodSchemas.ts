import { z } from 'zod';

export const beneficiariaSchema = z.object({
  nome_completo: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  cpf: z.string()
    .regex(/^\d{11}$/, 'CPF deve conter 11 dígitos'),
  data_nascimento: z.string().datetime(),
  telefone: z.string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
    .optional(),
  email: z.string().email('Email inválido').optional().nullable(),
  endereco: z.object({
    cep: z.string().regex(/^\d{8}$/, 'CEP deve conter 8 dígitos'),
    logradouro: z.string().min(3).max(100),
    numero: z.string(),
    complemento: z.string().optional(),
    bairro: z.string(),
    cidade: z.string(),
    estado: z.string().length(2)
  }).optional(),
  escolaridade: z.enum([
    'fundamental_incompleto',
    'fundamental_completo',
    'medio_incompleto',
    'medio_completo', 
    'superior_incompleto',
    'superior_completo',
    'pos_graduacao'
  ]).optional(),
  status: z.enum([
    'ativa',
    'inativa', 
    'pendente',
    'desligada',
    'arquivada'
  ]).default('pendente')
});
