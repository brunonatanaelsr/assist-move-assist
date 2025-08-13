import request from 'supertest';
import { db } from '../../services/db';

jest.mock('../../services/db');
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (_req: any, _res: any, next: any) => {
    _req.user = { id: '123', email: 'bruno@move.com', role: 'admin' };
    next();
  },
  requireProfissional: (_req: any, _res: any, next: any) => next(),
  AuthService: { verifyToken: jest.fn() }
}));

import app from '../../app';

const mockDb = db as jest.Mocked<typeof db>;

describe('Beneficiarias Routes', () => {
  it('should list beneficiarias', async () => {
    mockDb.getBeneficiarias.mockResolvedValue([
      { id: '1', nome_completo: 'Maria Silva', cpf: '123', status: 'ativa', created_at: new Date() }
    ] as any);
    mockDb.query.mockResolvedValue([{ total: '1' }] as any);

    const res = await request(app)
      .get('/api/beneficiarias')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.beneficiarias).toHaveLength(1);
  });
});
