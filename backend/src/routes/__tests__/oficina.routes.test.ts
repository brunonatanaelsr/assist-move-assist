import supertest from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import oficinasRoutes from '../oficina.routes';

jest.mock('pg');
jest.mock('ioredis');
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: '1', role: 'admin' };
    next();
  },
  requireGestor: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next()
}));

describe('Oficinas Routes', () => {
  let app: express.Express;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    app = express();
    app.use(express.json());
    app.use('/oficinas', oficinasRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /oficinas/horarios-disponiveis - requer data válida', async () => {
    const res = await supertest(app).get('/oficinas/horarios-disponiveis');
    expect(res.status).toBe(400);
  });

  it('GET /oficinas/horarios-disponiveis - retorna slots', async () => {
    (mockPool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [] } as any);
    const res = await supertest(app).get('/oficinas/horarios-disponiveis?data=2025-01-01');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.disponiveis)).toBe(true);
  });

  it('POST /oficinas/:id/presencas - valida obrigatórios', async () => {
    const res = await supertest(app).post('/oficinas/1/presencas').send({});
    expect(res.status).toBe(400);
  });

  it('GET /oficinas/:id/relatorio-presencas - 404 quando oficina inexiste', async () => {
    (mockPool.query as unknown as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] } as any);
    const res = await supertest(app).get('/oficinas/999/relatorio-presencas');
    expect(res.status).toBe(404);
  });
});
