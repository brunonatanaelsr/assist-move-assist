import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

const registry = new OpenAPIRegistry();

// Auth Schemas
const loginSchema = registry.register('Login', z.object({
  email: z.string().email(),
  password: z.string().min(6)
}));

const tokenSchema = registry.register('Token', z.object({
  accessToken: z.string(),
  refreshToken: z.string()
}));

// Beneficiária Schemas
const beneficiariaSchema = registry.register('Beneficiaria', z.object({
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
}));

// Projeto Schemas
const projetoSchema = registry.register('Projeto', z.object({
  id: z.string().uuid(),
  nome: z.string(),
  descricao: z.string(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'CONCLUIDO']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}));

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