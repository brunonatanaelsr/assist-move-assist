import { z } from 'zod';
import { OpenAPIRegistry, OpenAPIGenerator, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Configurar o Zod com OpenAPI
extendZodWithOpenApi(z);

// Criar registro global
export const registry = new OpenAPIRegistry();

// Auth Schemas
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const TokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string()
});

// Registrar schemas
registry.register('Login', LoginSchema);
registry.register('Token', TokenSchema);

// Gerar documento OpenAPI
export const generator = new OpenAPIGenerator({
  title: 'Assist Move API',
  version: '1.0.0',
  baseUrl: '/api/v1',
});

// Exportar z configurado
export { z };