import { Pool } from 'pg';
import Redis from 'ioredis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../auth.service';

jest.mock('pg');
jest.mock('ioredis');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockPool: jest.Mocked<Pool>;
  let mockRedis: jest.Mocked<Redis>;

  const mockUser = {
    id: '123',
    nome: 'Test User',
    email: 'test@example.com',
    papel: 'user',
    senha_hash: 'hashedPassword',
    ativo: true
  };

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    mockRedis = new Redis() as jest.Mocked<Redis>;
    authService = new AuthService(mockPool, mockRedis);

    // Reset all mocks
    jest.resetAllMocks();
  });

  describe('login', () => {
    it('deve fazer login com sucesso quando credenciais são válidas', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      (jwt.sign as jest.Mock).mockReturnValueOnce('token123');

      const result = await authService.login(loginData, '127.0.0.1');

      expect(result).toEqual({
        token: 'token123',
        user: {
          id: mockUser.id,
          name: mockUser.nome,
          email: mockUser.email,
          role: mockUser.papel
        }
      });
      expect(mockPool.query).toHaveBeenCalledTimes(2); // Login query + último login update
    });

    it('deve rejeitar login com email inválido', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.login({ email: 'wrong@example.com', password: 'password' }, '127.0.0.1')
      ).rejects.toThrow('Credenciais inválidas');
    });

    it('deve rejeitar login com senha incorreta', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrongpass' }, '127.0.0.1')
      ).rejects.toThrow('Credenciais inválidas');
    });
  });

  describe('getCurrentUser', () => {
    it('deve retornar usuário do cache se disponível', async () => {
      const cachedUser = {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedUser));

      const result = await authService.getCurrentUser('123');

      expect(result).toEqual(cachedUser);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('deve buscar usuário do banco se não estiver em cache', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authService.getCurrentUser('123');

      expect(result).toMatchObject({
        id: mockUser.id,
        name: mockUser.nome,
        email: mockUser.email,
        role: mockUser.papel
      });
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('deve lançar erro se usuário não for encontrado', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.getCurrentUser('999')
      ).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('changePassword', () => {
    const changePasswordData = {
      currentPassword: 'oldpass',
      newPassword: 'Newpass123'
    };

    it('deve alterar senha com sucesso', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // Buscar usuário
        .mockResolvedValueOnce({ rows: [{}] }); // Atualizar senha

      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)  // Senha atual correta
        .mockResolvedValueOnce(false); // Nova senha diferente

      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('newHashedPassword');

      await expect(
        authService.changePassword('123', changePasswordData, '127.0.0.1')
      ).resolves.not.toThrow();

      expect(mockRedis.del).toHaveBeenCalledWith('auth:user:123');
    });

    it('deve rejeitar se senha atual estiver incorreta', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        authService.changePassword('123', changePasswordData, '127.0.0.1')
      ).rejects.toThrow('Senha atual incorreta');
    });

    it('deve rejeitar se nova senha for igual à atual', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Ambas senhas iguais

      await expect(
        authService.changePassword('123', changePasswordData, '127.0.0.1')
      ).rejects.toThrow('Nova senha deve ser diferente da atual');
    });
  });

  describe('validateToken', () => {
    it('deve validar token JWT com sucesso', async () => {
      const decodedToken = {
        id: '123',
        email: 'test@example.com',
        role: 'user'
      };

      (jwt.verify as jest.Mock).mockReturnValueOnce(decodedToken);
      mockPool.query.mockResolvedValueOnce({ rows: [{ ativo: true }] });

      const result = await authService.validateToken('token123');

      expect(result).toEqual(decodedToken);
      expect(jwt.verify).toHaveBeenCalled();
    });

    it('deve rejeitar token se usuário estiver inativo', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({
        id: '123',
        email: 'test@example.com',
        role: 'user'
      });

      mockPool.query.mockResolvedValueOnce({ rows: [{ ativo: false }] });

      await expect(
        authService.validateToken('token123')
      ).rejects.toThrow('Usuário inválido ou inativo');
    });

    it('deve rejeitar token se usuário não existir', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({
        id: '999',
        email: 'test@example.com',
        role: 'user'
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.validateToken('token123')
      ).rejects.toThrow('Usuário inválido ou inativo');
    });

    it('deve rejeitar token inválido', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Token inválido');
      });

      await expect(
        authService.validateToken('invalid_token')
      ).rejects.toThrow();
    });
  });
});
