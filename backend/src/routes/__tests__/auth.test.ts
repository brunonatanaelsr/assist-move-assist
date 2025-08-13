import request from 'supertest';
import express from 'express';

process.env.PORT = '0';

// Usuário base para rotas que exigem autenticação
const mockUser = {
  id: '1',
  email: 'user@move.com',
  role: 'admin'
};

// Mock do middleware de autenticação e dos serviços
const authenticateToken = jest.fn((req: any, _res: any, next: any) => {
  req.user = mockUser;
  next();
});

jest.mock('../../middleware/auth', () => ({
  AuthService: {
    login: jest.fn(),
    getProfile: jest.fn()
  },
  authenticateToken,
  requireProfissional: jest.fn()
}));

import { AuthService } from '../../middleware/auth';
import { apiRoutes } from '../api';

const authServiceMock = AuthService as jest.Mocked<typeof AuthService>;
const app = express();
app.use(express.json());
app.use(apiRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('deve autenticar usuário com credenciais válidas', async () => {
      authServiceMock.login.mockResolvedValue({ user: mockUser, token: 'jwt-token' });

      const response = await request(app)
        .post('/auth/login')
        .send({ email: mockUser.email, password: 'secret' });

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject(mockUser);
    });

    it('deve validar campos obrigatórios', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ password: 'secret' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email e senha são obrigatórios');
    });

    it('deve rejeitar credenciais inválidas', async () => {
      authServiceMock.login.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({ email: mockUser.email, password: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciais inválidas');
    });

    it('deve retornar 500 em erro interno', async () => {
      authServiceMock.login.mockRejectedValue(new Error('db fail'));

      const response = await request(app)
        .post('/auth/login')
        .send({ email: mockUser.email, password: 'secret' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno do servidor');
    });
  });

  describe('GET /auth/profile', () => {
    it('deve exigir autenticação', async () => {
      authenticateToken.mockImplementationOnce((req, res) =>
        res.status(401).json({ error: 'Token de acesso requerido' })
      );

      const response = await request(app).get('/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token de acesso requerido');
    });

    it('deve retornar perfil do usuário autenticado', async () => {
      authServiceMock.getProfile.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject(mockUser);
    });

    it('deve retornar 500 em falha do serviço', async () => {
      authServiceMock.getProfile.mockRejectedValue(new Error('db error'));

      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno do servidor');
    });
  });
});

