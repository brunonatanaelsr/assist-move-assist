import request from 'supertest';
import express from 'express';
import authRouter from '../../routes/auth';

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

// Mock AuthService and authentication middleware
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  nome_completo: 'Test User',
  role: 'user'
};

const mockToken = 'jwt-token';

jest.mock('../../middleware/auth', () => ({
  AuthService: {
    login: jest.fn(),
    register: jest.fn(),
    getProfile: jest.fn(),
    changePassword: jest.fn()
  },
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = mockUser;
    next();
  }
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AuthService } = require('../../middleware/auth');

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('deve realizar login com sucesso', async () => {
      AuthService.login.mockResolvedValue({ user: mockUser, token: mockToken });

      const response = await request(app)
        .post('/auth/login')
        .send({ email: mockUser.email, password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login realizado com sucesso');
      expect(response.body.user.email).toBe(mockUser.email);
      expect(AuthService.login).toHaveBeenCalledWith(mockUser.email, 'password123');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('deve rejeitar login inválido', async () => {
      AuthService.login.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({ email: mockUser.email, password: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciais inválidas');
    });
  });

  describe('POST /auth/register', () => {
    it('deve registrar usuário', async () => {
      AuthService.register.mockResolvedValue({ user: mockUser, token: mockToken });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: mockUser.email,
          password: 'password123',
          nome_completo: mockUser.nome_completo
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Usuário registrado com sucesso');
      expect(AuthService.register).toHaveBeenCalledWith({
        email: mockUser.email,
        password: 'password123',
        nome_completo: mockUser.nome_completo,
        role: undefined
      });
    });
  });

  describe('GET /auth/profile', () => {
    it('deve retornar perfil do usuário', async () => {
      AuthService.getProfile.mockResolvedValue(mockUser);

      const response = await request(app).get('/auth/profile');

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(mockUser.email);
      expect(AuthService.getProfile).toHaveBeenCalledWith(mockUser.id);
    });

    it('deve retornar 404 se perfil não encontrado', async () => {
      AuthService.getProfile.mockResolvedValue(null);

      const response = await request(app).get('/auth/profile');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Perfil não encontrado');
    });
  });

  describe('POST /auth/change-password', () => {
    it('deve alterar senha com sucesso', async () => {
      AuthService.changePassword.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/change-password')
        .send({ currentPassword: 'oldpass', newPassword: 'newpass123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Senha alterada com sucesso');
      expect(AuthService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        'oldpass',
        'newpass123'
      );
    });

    it('deve lidar com senha atual incorreta', async () => {
      AuthService.changePassword.mockRejectedValue(new Error('Senha atual incorreta'));

      const response = await request(app)
        .post('/auth/change-password')
        .send({ currentPassword: 'wrong', newPassword: 'newpass123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha atual incorreta');
    });
  });
});

