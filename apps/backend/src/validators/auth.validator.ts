import { z } from '../openapi/init';

const emptyObject = z.object({}).optional();

const passwordComplexity = z
  .string()
  .min(6, 'Nova senha deve ter pelo menos 6 caracteres')
  .max(100, 'Nova senha muito longa')
  .refine(
    (password) => {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);

      return hasUpperCase && hasLowerCase && hasNumber;
    },
    {
      message: 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número'
    }
  );

export const loginBodySchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  deviceId: z.string().min(1).optional()
});

export const registerBodySchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres'),
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  role: z.string().optional()
});

export const updateProfileBodySchema = z
  .object({
    nome_completo: z.string().min(1).optional(),
    avatar_url: z.string().min(1).optional()
  })
  .partial();

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: passwordComplexity
});

export const refreshTokenBodySchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
    deviceId: z.string().min(1).optional()
  })
  .partial()
  .default({});

export const loginSchema = z.object({
  body: loginBodySchema,
  query: emptyObject,
  params: emptyObject
});

export const registerSchema = z.object({
  body: registerBodySchema,
  query: emptyObject,
  params: emptyObject
});

export const updateProfileSchema = z.object({
  body: updateProfileBodySchema,
  query: emptyObject,
  params: emptyObject
});

export const changePasswordSchema = z.object({
  body: changePasswordBodySchema,
  query: emptyObject,
  params: emptyObject
});

export const refreshTokenSchema = z.object({
  body: refreshTokenBodySchema,
  query: emptyObject,
  params: emptyObject
});

export const userSchema = z.object({
  id: z.string(),
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  papel: z.enum(['user', 'gestor', 'admin', 'super_admin']),
  telefone: z.string().nullable().optional(),
  ativo: z.boolean().default(true),
  senha_hash: z.string(),
  ultimo_login: z.date().nullable(),
  data_criacao: z.date(),
  data_atualizacao: z.date()
});

export type LoginData = z.infer<typeof loginBodySchema>;
export type RegisterData = z.infer<typeof registerBodySchema>;
export type UpdateProfileData = z.infer<typeof updateProfileBodySchema>;
export type ChangePasswordData = z.infer<typeof changePasswordBodySchema>;
export type RefreshTokenData = z.infer<typeof refreshTokenBodySchema>;
export type User = z.infer<typeof userSchema>;
