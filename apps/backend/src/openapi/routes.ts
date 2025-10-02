import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

const registry = new OpenAPIRegistry();

// Auth Schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

registry.register('Login', loginSchema);

const tokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string()
});

registry.register('Token', tokenSchema);

// Beneficiária Schemas
const beneficiariaSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  cpf: z.string(),
  dataNascimento: z.string().datetime(),
  telefone: z.string(),
  email: z.string().email().optional(),
  endereco: z.string(),
  status: z.enum(['ATIVA', 'INATIVA', 'AGUARDANDO']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

registry.register('Beneficiaria', beneficiariaSchema);

// Projeto Schemas
const projetoSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  descricao: z.string(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'CONCLUIDO']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

registry.register('Projeto', projetoSchema);

// Auth Routes
registry.registerPath({
  method: 'post',
  path: '/auth/login',
  description: 'Autenticação de usuário',
  tags: ['Auth'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Login realizado com sucesso',
      content: {
        'application/json': {
          schema: tokenSchema
        }
      }
    }
  }
});

// Beneficiárias Routes
registry.registerPath({
  method: 'get',
  path: '/beneficiarias',
  description: 'Lista todas as beneficiárias',
  tags: ['Beneficiárias'],
  responses: {
    200: {
      description: 'Lista de beneficiárias',
      content: {
        'application/json': {
          schema: z.array(beneficiariaSchema)
        }
      }
    }
  }
});

export { registry };