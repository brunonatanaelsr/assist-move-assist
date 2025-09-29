import { z } from 'zod';
import { optionalStringPreprocess, sanitizeEmail, sanitizeText } from '../sanitizers';

const emptyObject = z.object({}).optional();

const sanitizedEmailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Formato de email inválido')
  .transform(sanitizeEmail);

const optionalSanitizedString = optionalStringPreprocess(
  z.string().trim().max(255).transform(sanitizeText)
);

/**
 * Esquema de validação para autenticação básica via email e senha.
 */
export const loginSchema = z.object({
  body: z.object({
    email: sanitizedEmailField,
    password: z.string().min(1, 'Senha é obrigatória'),
    deviceId: optionalSanitizedString
  }),
  query: emptyObject,
  params: emptyObject
});

/**
 * Esquema de validação utilizado durante o processo de registro de usuário.
 */
export const registerSchema = z.object({
  body: z.object({
    email: sanitizedEmailField,
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    nome_completo: z.string().trim().min(1, 'Nome completo é obrigatório').transform(sanitizeText),
    role: optionalSanitizedString
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
      nome_completo: optionalSanitizedString,
      avatar_url: optionalSanitizedString
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
      refreshToken: optionalSanitizedString,
      deviceId: optionalSanitizedString
    })
    .partial()
    .default({}),
  query: emptyObject,
  params: emptyObject
});
