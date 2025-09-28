import { z } from 'zod';

const emptyObject = z.object({}).optional();

/**
 * Esquema de validação para autenticação básica via email e senha.
 */
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Formato de email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
    deviceId: z.string().min(1).optional()
  }),
  query: emptyObject,
  params: emptyObject
});

/**
 * Esquema de validação utilizado durante o processo de registro de usuário.
 */
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Formato de email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
    role: z.string().optional()
  }),
  query: emptyObject,
  params: emptyObject
});

/**
 * Esquema de validação para atualização de perfil do usuário autenticado.
 */
export const updateProfileSchema = z.object({
  body: z
    .object({
      nome_completo: z.string().min(1).optional(),
      avatar_url: z.string().min(1).optional()
    })
    .partial(),
  query: emptyObject,
  params: emptyObject
});

/**
 * Esquema de validação para alteração de senha do usuário.
 */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres')
  }),
  query: emptyObject,
  params: emptyObject
});

export const refreshTokenSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().min(1).optional(),
      deviceId: z.string().min(1).optional()
    })
    .partial()
    .default({}),
  query: emptyObject,
  params: emptyObject
});
