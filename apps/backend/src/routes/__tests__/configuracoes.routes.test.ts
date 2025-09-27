import request from 'supertest';
import express from 'express';

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.REDIS_DISABLED = 'true';

const authenticateToken = jest.fn((req: any, _res: any, next: any) => {
  req.user = { id: '1', role: 'admin', email: 'admin@move.com' };
  next();
});

const authorizeMiddleware = jest.fn((_req: any, _res: any, next: any) => next());
const authorize = jest.fn(() => authorizeMiddleware);
const requireProfissional = jest.fn((_req: any, _res: any, next: any) => next());
const requireGestor = jest.fn((_req: any, _res: any, next: any) => next());

jest.mock('../../middleware/auth', () => ({
  authenticateToken,
  authorize: authorize as any,
  requireProfissional,
  requireGestor,
}));

const mockQuery = jest.fn();

jest.mock('../../config/database', () => {
  const pool = { query: mockQuery } as any;
  return { pool, default: pool };
});

let app: express.Express;

const setupApp = () => {
  const { apiRoutes } = require('../api');
  const application = express();
  application.use(express.json());
  application.use(apiRoutes);
  return application;
};

describe('Configurações globais - rotas /configuracoes', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    app = setupApp();
  });

  it('deve retornar configurações padrão quando não houver registros', async () => {
    const defaultConfig = {
      tema: 'sistema',
      idioma: 'pt-BR',
      fusoHorario: 'America/Sao_Paulo',
      notificacoes: { habilitarEmails: true, habilitarPush: false },
      organizacao: { nome: null, emailSuporte: null },
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // ensure table
      .mockResolvedValueOnce({ rows: [] }) // select existing
      .mockResolvedValueOnce({ rows: [{ payload: defaultConfig, updated_at: '2024-05-10T12:00:00.000Z' }] }); // insert default

    const response = await request(app).get('/configuracoes');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      ...defaultConfig,
      atualizadoEm: '2024-05-10T12:00:00.000Z',
    });
    expect(authorize).toHaveBeenCalledWith('users.manage');
  });

  it('deve atualizar parcialmente as configurações globais', async () => {
    const existingConfig = {
      tema: 'sistema',
      idioma: 'pt-BR',
      fusoHorario: 'America/Sao_Paulo',
      notificacoes: { habilitarEmails: true, habilitarPush: false },
      organizacao: { nome: null, emailSuporte: null },
    };

    const updatedConfig = {
      ...existingConfig,
      tema: 'escuro',
      notificacoes: { habilitarEmails: false, habilitarPush: false },
      organizacao: { nome: 'Move Marias', emailSuporte: 'contato@move.org' },
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // ensure table
      .mockResolvedValueOnce({ rows: [{ payload: existingConfig, updated_at: '2024-05-10T12:00:00.000Z' }] }) // load
      .mockResolvedValueOnce({ rows: [{ payload: updatedConfig, updated_at: '2024-06-01T08:30:00.000Z' }] }); // persist

    const response = await request(app)
      .put('/configuracoes')
      .send({
        tema: 'ESCuro',
        notificacoes: { habilitarEmails: false },
        organizacao: { nome: 'Move Marias', emailSuporte: 'contato@move.org ' },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      ...updatedConfig,
      atualizadoEm: '2024-06-01T08:30:00.000Z',
    });
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  it('deve rejeitar payload vazio', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(app).put('/configuracoes').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Nenhuma configuração válida fornecida');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
