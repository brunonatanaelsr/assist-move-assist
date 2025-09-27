import supertest from 'supertest';
import express from 'express';
import projetoRoutes from '../projeto.routes';
import { mockPool } from '../../setupTests';

jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: '1', role: 'admin' };
    next();
  },
  requireGestor: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next()
}));

describe('PUT /api/projetos/:id', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/projetos', projetoRoutes);
  });

  it('retorna 400 quando nenhum campo é enviado para atualização', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ id: 1 }]
    });

    const response = await supertest(app)
      .put('/api/projetos/1')
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Nenhum campo para atualizar');
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });
});
