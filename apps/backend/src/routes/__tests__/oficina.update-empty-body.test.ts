import supertest from 'supertest';
import express from 'express';
import oficinasRoutes from '../oficina.routes';
import { mockPool } from '../../setupTests';

jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: '1', role: 'admin' };
    next();
  },
  requireGestor: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next()
}));

describe('PUT /api/oficinas/:id', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/oficinas', oficinasRoutes);
  });

  it('retorna 400 quando nenhum campo é enviado para atualização', async () => {
    (mockPool.query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('information_schema.columns')) {
        return Promise.resolve({
          rows: [
            { column_name: 'id' },
            { column_name: 'nome' },
            { column_name: 'data_inicio' },
            { column_name: 'horario_inicio' },
            { column_name: 'horario_fim' },
            { column_name: 'vagas_total' },
            { column_name: 'responsavel_id' },
            { column_name: 'ativo' },
            { column_name: 'data_atualizacao' }
          ]
        });
      }

      if (sql.includes('FROM oficinas')) {
        return Promise.resolve({
          rows: [{ responsavel_id: 1 }],
          rowCount: 1
        });
      }

      return Promise.resolve({ rows: [] });
    });

    const response = await supertest(app)
      .put('/api/oficinas/1')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Nenhum campo para atualizar');
    expect(mockPool.query).toHaveBeenCalled();
  });
});
