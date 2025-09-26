import { OpenAPIObject } from 'openapi3-ts/oas31';

export const apiSpec: Partial<OpenAPIObject> = {
  openapi: '3.1.0',
  info: {
    title: 'Assist Move API',
    description: 'API para o sistema de gestão Assist Move Assist',
    version: '1.0.0',
    contact: {
      name: 'Equipe Assist Move',
      email: 'suporte@assistmove.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Servidor de desenvolvimento'
    }
  ],
  tags: [
    { name: 'Auth', description: 'Autenticação e autorização' },
    { name: 'Beneficiárias', description: 'Gestão de beneficiárias' },
    { name: 'Projetos', description: 'Gestão de projetos e oficinas' },
    { name: 'Formulários', description: 'Formulários e documentos' },
    { name: 'Feed', description: 'Feed de atividades e comunicação' },
    { name: 'Chat', description: 'Chat interno' },
    { name: 'Dashboard', description: 'Painéis analíticos' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    { bearerAuth: [] }
  ]
};