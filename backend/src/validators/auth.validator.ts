import { z } from 'zod';
import { USER_ROLES } from '../types/auth';

// Schema para login
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

// Schema para alterar senha
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string()
    .min(6, 'Nova senha deve ter pelo menos 6 caracteres')
    .max(100, 'Nova senha muito longa')
    .refine(
      (password) => {
        // Pelo menos uma letra maiúscula
        const hasUpperCase = /[A-Z]/.test(password);
        // Pelo menos uma letra minúscula
        const hasLowerCase = /[a-z]/.test(password);
        // Pelo menos um número
        const hasNumber = /[0-9]/.test(password);
        
        return hasUpperCase && hasLowerCase && hasNumber;
      },
      {
        message: 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número'
      }
    )
});

// Schema para usuário
export const userSchema = z.object({
  id: z.string(),
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  papel: z.enum(USER_ROLES),
  telefone: z.string().nullable().optional(),
  ativo: z.boolean().default(true),
  senha_hash: z.string(),
  ultimo_login: z.date().nullable(),
  data_criacao: z.date(),
  data_atualizacao: z.date()
});

export type LoginData = z.infer<typeof loginSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type User = z.infer<typeof userSchema>;
