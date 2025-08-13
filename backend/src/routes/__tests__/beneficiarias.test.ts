import request from 'supertest';
import app from '../../app';
import { db } from '../../config/database';

jest.mock('../../config/database', () => ({
  db: {
    query: jest.fn(),
    getBeneficiarias: jest.fn(),
    findById: jest.fn(),
    insert: jest.fn(),
  }
}));

jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 1, role: 'admin', email: 'test@test.com' };
    next();
  },
  requireProfissional: (_req: any, _res: any, next: any) => next(),
  AuthService: { verifyToken: jest.fn() }
}));

const mockDb = db as any;

describe('Beneficiarias Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists beneficiarias', async () => {
    mockDb.getBeneficiarias.mockResolvedValue([{ id: '1', nome_completo: 'Maria' }]);
    mockDb.query.mockResolvedValue([{ total: '1' }]);

    const res = await request(app).get('/beneficiarias');
    expect(res.status).toBe(200);
    expect(res.body.beneficiarias).toHaveLength(1);
  });

  it('creates beneficiaria', async () => {
    mockDb.query.mockResolvedValue([]);
    mockDb.insert.mockResolvedValue({ id: '1', nome_completo: 'Nova' });

    const res = await request(app)
      .post('/beneficiarias')
      .send({ nome_completo: 'Nova', cpf: '123' });
    expect(res.status).toBe(201);
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
