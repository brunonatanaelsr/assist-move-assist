import { z } from 'zod';
import { isCPF } from 'brazilian-values';

export const beneficiariaSchema = z.object({
  nome_completo: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .transform(nome => nome.trim()),

  cpf: z.string()
    .length(11, 'CPF deve ter 11 dígitos')
    .refine(cpf => isCPF(cpf), 'CPF inválido'),

  data_nascimento: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .transform(data => new Date(data))
    .refine(data => data < new Date(), 'Data de nascimento não pode ser futura'),

  telefone: z.string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),

  email: z.string()
    .email('Email inválido')
    .optional()
    .nullable(),
});

export type BeneficiariaInput = z.infer<typeof beneficiariaSchema>;

export const validateBeneficiaria = async (
  data: Partial<BeneficiariaInput>,
  partial = false
) => {
  const schema = partial ? beneficiariaSchema.partial() : beneficiariaSchema;
  return schema.parseAsync(data);
};
