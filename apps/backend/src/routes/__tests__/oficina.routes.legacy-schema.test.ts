import supertest from 'supertest';
import express from 'express';

const mockPool = {
  query: jest.fn(),
  on: jest.fn()
} as any;

const availableColumns = new Set([
  'id',
  'titulo',
  'descricao',
  'data',
  'horario_inicio',
  'horario_fim',
  'local',
  'capacidade_maxima',
  'projeto_id',
  'responsavel_id',
  'status',
  'created_at',
  'updated_at'
]);

const redisMock = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(0),
  keys: jest.fn().mockResolvedValue([]),
  expire: jest.fn(),
  incr: jest.fn(),
  multi: jest.fn().mockReturnValue({
    setex: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([])
  })
};

jest.mock('../../config/database', () => ({
  pool: mockPool
}));

jest.mock('../../lib/redis', () => ({
  __esModule: true,
  redis: redisMock,
  default: redisMock
}));

jest.mock('../../services/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  loggerService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
    performance: jest.fn(),
    request: jest.fn()
  }
}));

jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: '1', role: 'admin' };
    next();
  },
  requireGestor: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next()
}));

describe('Oficinas routes - schema legado', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.resetModules();
    mockPool.query.mockReset();

    mockPool.query.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('information_schema.columns')) {
        if (params?.[0] !== 'oficinas') {
          throw new Error('Unexpected table introspection');
        }
        return {
          rows: Array.from(availableColumns).map((column_name) => ({ column_name }))
        } as any;
      }

      if (sql.includes('COUNT(*) OVER() as total_count')) {
        const forbiddenColumns = [
          'o.nome',
          'o.data_inicio',
          'o.vagas_total',
          'o.data_criacao',
          'o.data_atualizacao'
        ];
        for (const fragment of forbiddenColumns) {
          if (sql.includes(fragment)) {
            throw new Error(`Consulta referenciou coluna indisponível: ${fragment}`);
          }
        }
        return {
          rows: [
            {
              id: 1,
              nome: 'Oficina Legada',
              descricao: 'Descrição antiga',
              instrutor: 'Instrutor X',
              data_inicio: new Date('2024-01-10T00:00:00Z'),
              data_fim: null,
              horario_inicio: '09:00',
              horario_fim: '11:00',
              local: 'Sala 1',
              vagas_total: 20,
              projeto_id: 5,
              responsavel_id: 9,
              status: 'ativa',
              ativo: true,
              data_criacao: new Date('2024-01-01T00:00:00Z'),
              data_atualizacao: new Date('2024-01-05T00:00:00Z'),
              projeto_nome: null,
              responsavel_nome: null,
              total_count: '1'
            }
          ]
        } as any;
      }

      if (sql.includes('FROM role_permissions') || sql.includes('FROM user_permissions')) {
        return { rows: [] } as any;
      }

      throw new Error(`Query não esperada em teste: ${sql}`);
    });

    const oficinasRoutes = require('../oficina.routes').default;
    app = express();
    app.use(express.json());
    app.use('/oficinas', oficinasRoutes);
  });

  it('retorna 200 ao listar oficinas com colunas legadas', async () => {
    const response = await supertest(app).get('/oficinas');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.data).toHaveLength(1);
    expect(response.body.data?.data?.[0]).toEqual(
      expect.objectContaining({
        nome: 'Oficina Legada',
        vagas_total: 20,
        horario_inicio: '09:00'
      })
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('information_schema.columns'),
      ['oficinas']
    );
  });
});
