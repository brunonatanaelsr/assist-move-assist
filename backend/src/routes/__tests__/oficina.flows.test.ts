import supertest from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import oficinasRoutes from '../oficina.routes';

jest.mock('pg');
jest.mock('ioredis');
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: '1', role: 'admin' };
    next();
  },
  requireGestor: (_req: any, _res: any, next: any) => next(),
}));

describe('Oficinas Full Flow', () => {
  let app: express.Express;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    // Mock Redis client methods used by service
    (Redis as unknown as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn(),
    }));

    mockPool = new Pool() as jest.Mocked<Pool>;
    app = express();
    app.use(express.json());
    app.use('/oficinas', oficinasRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POST /oficinas - cria oficina mínima', async () => {
    const created = {
      id: 10,
      nome: 'Oficina A',
      data_inicio: '2025-01-01',
      horario_inicio: '08:00', horario_fim: '10:00',
      vagas_total: 20,
      ativo: true,
    } as any;
    mockPool.query.mockResolvedValueOnce({ rows: [created] } as any); // INSERT RETURNING

    const res = await supertest(app)
      .post('/oficinas')
      .send({ nome: 'Oficina A', data_inicio: '2025-01-01', horario_inicio: '08:00', horario_fim: '10:00', vagas_total: 20 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(10);
  });

  it('PUT /oficinas/:id - atualiza quando responsável', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ responsavel_id: '1' }]} as any) // SELECT permissões
      .mockResolvedValueOnce({ rows: [{ id: 10, nome: 'Atualizada' }]} as any); // UPDATE RETURNING

    const res = await supertest(app)
      .put('/oficinas/10')
      .send({ nome: 'Atualizada' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /oficinas/:id - soft delete quando responsável', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ responsavel_id: '1' }]} as any) // SELECT
      .mockResolvedValueOnce({ rows: [] } as any); // UPDATE

    const res = await supertest(app).delete('/oficinas/11');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /oficinas/:id/participantes - lista participantes', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ projeto_id: 7 }], rowCount: 1 } as any) // SELECT projeto_id
      .mockResolvedValueOnce({ rows: [{ id: 1, nome_completo: 'Maria' }] } as any); // participantes

    const res = await supertest(app).get('/oficinas/7/participantes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /oficinas/:id/participantes - adiciona participação', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ projeto_id: 7 }], rowCount: 1 } as any) // get projeto id
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // exists?
      .mockResolvedValueOnce({ rows: [{ id: 100, beneficiaria_id: 2, projeto_id: 7 }] } as any); // insert

    const res = await supertest(app)
      .post('/oficinas/7/participantes')
      .send({ beneficiaria_id: 2 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /oficinas/:id/participantes/:beneficiariaId - remove participação', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ projeto_id: 7 }], rowCount: 1 } as any) // projeto
      .mockResolvedValueOnce({ rows: [{ id: 100 }], rowCount: 1 } as any) // part
      .mockResolvedValueOnce({ rows: [] } as any); // update

    const res = await supertest(app).delete('/oficinas/7/participantes/2');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /oficinas/:id/presencas - registra presença', async () => {
    const client = { query: jest.fn(), release: jest.fn() } as any;
    client.query
      .mockResolvedValueOnce({ rows: [] }) // check existing
      .mockResolvedValueOnce({ rows: [{ oficina_id: 7, beneficiaria_id: 2, presente: true }] }); // insert
    (mockPool.connect as any).mockResolvedValueOnce(client);

    const res = await supertest(app)
      .post('/oficinas/7/presencas')
      .send({ beneficiaria_id: 2, presente: true, data: '2025-01-15' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('GET /oficinas/:id/presencas - lista presenças', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ beneficiaria_id: 2, presente: true }] } as any);
    const res = await supertest(app).get('/oficinas/7/presencas');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /oficinas/:id/resumo - métricas', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ projeto_id: 7, vagas_total: 20 }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ c: 5 }] } as any)
      .mockResolvedValueOnce({ rows: [{ c: 12 }] } as any)
      .mockResolvedValueOnce({ rows: [{ c: 9 }] } as any);

    const res = await supertest(app).get('/oficinas/7/resumo');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total_participantes).toBeDefined();
  });

  it('POST /oficinas/verificar-conflito - sem conflitos', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    const res = await supertest(app)
      .post('/oficinas/verificar-conflito')
      .send({ data_inicio: '2025-01-01', horario_inicio: '09:00', horario_fim: '10:00' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.conflito).toBe(false);
  });
});

