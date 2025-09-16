import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth.routes';
import beneficiariasRoutes from '../routes/beneficiarias.routes';
import { AuthService } from '../middleware/auth';
// Mockar o serviço real utilizado nas rotas
jest.mock('../services', () => ({
  authService: {
    login: jest.fn(),
    getProfile: jest.fn(),
    generateToken: jest.fn(),
    validateToken: jest.fn()
  }
}));
import { authService } from '../services';
import { db } from '../services/db';

jest.mock('../services/db', () => ({
  db: {
    query: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    getBeneficiarias: jest.fn(),
    getStats: jest.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/beneficiarias', beneficiariasRoutes);

const mockedAuthService = authService as jest.Mocked<typeof authService>;

describe('Auth and protected routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuthService.generateToken.mockReturnValue('test-token');
    mockedAuthService.validateToken.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      role: 'user'
    });
  });

  describe('POST /auth/login', () => {
    it('should authenticate with valid credentials', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        nome: 'Usuário Teste',
        papel: 'user' as const,
        ativo: true
      };
      mockedAuthService.login.mockResolvedValue({ user, token: 'jwt-token' });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: user.email, password: 'senha' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(user.email);
      // Login retorna token no corpo em ambiente de testes/CI
      expect(res.body.token).toBeTruthy();
    });

    it('should reject invalid credentials', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        nome: 'Usuário Teste',
        papel: 'user' as const,
        ativo: true
      };
      mockedAuthService.login.mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: user.email, password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciais inválidas');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return profile when authenticated', async () => {
      const profile = {
        id: 1,
        email: 'user@example.com',
        nome: 'Usuário Teste',
        role: 'user' as const
      };
      mockedAuthService.getProfile.mockResolvedValue(profile);
      mockedAuthService.validateToken.mockResolvedValue({
        id: profile.id,
        email: profile.email,
        role: profile.role
      });
      mockedAuthService.generateToken.mockReturnValue('jwt-token');
      const token = AuthService.generateToken({ id: profile.id, email: profile.email, role: profile.role });

      const res = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(profile.email);
    });

    it('should require a token', async () => {
      const res = await request(app).get('/auth/profile');
      expect(res.status).toBe(401);
    });

    it('should reject an invalid token', async () => {
      mockedAuthService.validateToken.mockRejectedValueOnce(new Error('invalid token'));
      const res = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid');
      expect(res.status).toBe(403);
    });
  });

  describe('Protected resource authorization', () => {
    it('should deny access when role is insufficient', async () => {
      mockedAuthService.validateToken.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        role: 'user'
      });
      const token = AuthService.generateToken({ id: 1, email: 'user@example.com', role: 'user' });
      const res = await request(app)
        .post('/beneficiarias')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome_completo: 'Teste', cpf: '12345678900' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Acesso negado');
    });
  });
});
