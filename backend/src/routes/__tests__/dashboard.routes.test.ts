import request from 'supertest';
import express from 'express';

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.REDIS_DISABLED = 'true';

const mockUser = {
  id: '1',
  role: 'admin',
  email: 'admin@move.com'
};

const authenticateToken = jest.fn((req: any, _res: any, next: any) => {
  req.user = mockUser;
  next();
});

const getTarefasStatsMock = jest.fn();
const passThroughMiddleware = jest.fn((_req: any, _res: any, next: any) => next());

jest.mock('../../middleware/auth', () => ({
  AuthService: {
    login: jest.fn(),
    getProfile: jest.fn(),
    register: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn()
  },
  authenticateToken,
  requireProfissional: passThroughMiddleware,
  requireAdmin: passThroughMiddleware,
  requireGestor: passThroughMiddleware,
  requirePermissions: () => passThroughMiddleware,
  requireRole: () => passThroughMiddleware,
  authorize: () => passThroughMiddleware,
  PERMISSIONS: {
    READ_BENEFICIARIA: 'beneficiarias.ler',
    CREATE_BENEFICIARIA: 'beneficiarias.criar',
    UPDATE_BENEFICIARIA: 'beneficiarias.editar',
    DELETE_BENEFICIARIA: 'beneficiarias.excluir'
  }
}));

jest.mock('../../repositories/DashboardRepository', () => ({
  DashboardRepository: jest.fn().mockImplementation(() => ({
    getTarefasStats: getTarefasStatsMock
  }))
}));

const { apiRoutes } = require('../api');

const app = express();
app.use(express.json());
app.use(apiRoutes);

describe('Dashboard routes - tasks endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    passThroughMiddleware.mockClear();
  });

  it('should map tarefa stats into dashboard tasks', async () => {
    getTarefasStatsMock.mockResolvedValueOnce([
      {
        responsavel_id: 10,
        responsavel_nome: 'Maria Silva',
        total_tarefas: '12',
        pendentes: '6',
        concluidas: '6',
        media_dias_conclusao: '4.5',
        taxa_conclusao: '50.00'
      },
      {
        responsavel_id: null,
        responsavel_nome: null,
        total_tarefas: '2',
        pendentes: '0',
        concluidas: '2',
        media_dias_conclusao: null,
        taxa_conclusao: '100.00'
      }
    ]);

    const response = await request(app).get('/dashboard/tasks');

    expect(response.status).toBe(200);
    expect(getTarefasStatsMock).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual([
      {
        id: '10',
        title: 'Pendências de Maria Silva',
        due: 'Em aberto (6 pendentes)',
        priority: 'Média',
        meta: {
          total: 12,
          pendentes: 6,
          concluidas: 6,
          mediaDiasConclusao: 4.5,
          taxaConclusao: 50
        }
      },
      {
        id: 'responsavel-1',
        title: 'Pendências sem responsável',
        due: 'Nenhuma pendência',
        priority: 'Baixa',
        meta: {
          total: 2,
          pendentes: 0,
          concluidas: 2,
          mediaDiasConclusao: null,
          taxaConclusao: 100
        }
      }
    ]);
  });

  it('should return 500 when repository fails', async () => {
    getTarefasStatsMock.mockRejectedValueOnce(new Error('db down'));

    const response = await request(app).get('/dashboard/tasks');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Erro interno do servidor' });
  });
});
