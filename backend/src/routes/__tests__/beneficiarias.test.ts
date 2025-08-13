import request from 'supertest';
import express from 'express';

// Variáveis de ambiente para evitar que o app principal tente escutar portas durante os testes
process.env.PORT = '0';

// Usuário mockado utilizado nos testes
const mockUser = {
  id: '123',
  email: 'bruno@move.com',
  role: 'admin'
};
const mockToken = 'valid-jwt-token';

// Mocks dos middlewares de autenticação
const authenticateToken = jest.fn((req: any, _res: any, next: any) => {
  req.user = mockUser;
  next();
});
const requireProfissional = jest.fn((req: any, _res: any, next: any) => next());

jest.mock('../../middleware/auth', () => ({
  authenticateToken,
  requireProfissional,
  AuthService: {
    verifyToken: jest.fn().mockReturnValue(mockUser)
  }
}));

// Mock do banco de dados
jest.mock('../../services/db');
import { db } from '../../services/db';
const mockDb = db as jest.Mocked<typeof db>;

// Construir app de teste usando apenas as rotas da API
import { apiRoutes } from '../api';
const app = express();
app.use(express.json());
app.use(apiRoutes);

describe('Beneficiarias Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /beneficiarias', () => {
    it('deve exigir autenticação', async () => {
      authenticateToken.mockImplementationOnce((req, res) =>
        res.status(401).json({ error: 'Token de acesso requerido' })
      );

      const response = await request(app).get('/beneficiarias');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token de acesso requerido');
    });

    it('deve listar beneficiárias com paginação', async () => {
      const mockBeneficiarias = [
        {
          id: '1',
          nome_completo: 'Maria Silva',
          cpf: '123.456.789-01',
          status: 'ativa',
          created_at: new Date()
        },
        {
          id: '2',
          nome_completo: 'Ana Santos',
          cpf: '987.654.321-01',
          status: 'ativa',
          created_at: new Date()
        }
      ];

      mockDb.getBeneficiarias.mockResolvedValue(mockBeneficiarias);
      mockDb.query.mockResolvedValue([{ total: '2' }]);

      const response = await request(app)
        .get('/beneficiarias')
        .set('Authorization', `Bearer ${mockToken}`)
        .query({ page: '1', limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body.beneficiarias).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
    });

    it('deve retornar 500 em erro do banco', async () => {
      mockDb.getBeneficiarias.mockRejectedValue(new Error('db error'));

      const response = await request(app)
        .get('/beneficiarias')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno do servidor');
    });
  });

  describe('GET /beneficiarias/:id', () => {
    it('deve retornar beneficiária por ID', async () => {
      const mockBeneficiaria = {
        id: '1',
        nome_completo: 'Maria Silva',
        cpf: '123.456.789-01',
        status: 'ativa',
        created_at: new Date()
      };

      mockDb.findById.mockResolvedValue(mockBeneficiaria);

      const response = await request(app)
        .get('/beneficiarias/1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.beneficiaria).toMatchObject({
        id: '1',
        nome_completo: 'Maria Silva',
        cpf: '123.456.789-01',
        status: 'ativa'
      });
    });

    it('deve retornar 404 para beneficiária não encontrada', async () => {
      mockDb.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/beneficiarias/999')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Beneficiária não encontrada');
    });
  });

  describe('POST /beneficiarias', () => {
    const novaBeneficiaria = {
      nome_completo: 'Nova Beneficiária',
      cpf: '111.222.333-44',
      data_nascimento: '1990-01-01',
      telefone: '11987654321',
      endereco: 'Rua Teste, 123',
      cep: '01234-567',
      cidade: 'São Paulo',
      estado: 'SP'
    };

    it('deve rejeitar usuário sem permissão', async () => {
      authenticateToken.mockImplementationOnce((req, _res, next) => {
        req.user = { ...mockUser, role: 'user' };
        next();
      });
      requireProfissional.mockImplementationOnce((req, res) =>
        res.status(403).json({ error: 'Acesso negado' })
      );

      const response = await request(app)
        .post('/beneficiarias')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(novaBeneficiaria);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado');
    });

    it('deve criar nova beneficiária com dados válidos', async () => {
      const mockCreatedBeneficiaria = {
        id: '3',
        ...novaBeneficiaria,
        status: 'ativa',
        created_by: mockUser.id,
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue([]); // CPF não existe
      mockDb.insert.mockResolvedValue(mockCreatedBeneficiaria);

      const response = await request(app)
        .post('/beneficiarias')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(novaBeneficiaria);

      expect(response.status).toBe(201);
      expect(response.body.beneficiaria).toMatchObject({
        id: '3',
        ...novaBeneficiaria,
        status: 'ativa',
        created_by: mockUser.id
      });
      expect(response.body.message).toBe('Beneficiária cadastrada com sucesso');
    });

    it('deve retornar 500 em erro do banco ao criar', async () => {
      mockDb.query.mockResolvedValue([]);
      mockDb.insert.mockRejectedValue(new Error('db fail'));

      const response = await request(app)
        .post('/beneficiarias')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(novaBeneficiaria);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno do servidor');
    });

    it('deve rejeitar beneficiária sem nome completo', async () => {
      const response = await request(app)
        .post('/beneficiarias')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          cpf: '111.222.333-44',
          telefone: '11987654321'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Nome completo e CPF são obrigatórios');
    });

    it('deve rejeitar CPF duplicado', async () => {
      mockDb.query.mockResolvedValue([{ id: '1' }]); // CPF já existe

      const response = await request(app)
        .post('/beneficiarias')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(novaBeneficiaria);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('CPF já cadastrado');
    });
  });

  describe('PUT /beneficiarias/:id', () => {
    it('deve atualizar beneficiária existente', async () => {
      const updateData = {
        nome_completo: 'Nome Atualizado',
        telefone: '11999888777'
      };

      const existingBeneficiaria = {
        id: '1',
        nome_completo: 'Nome Original',
        cpf: '123.456.789-01',
        telefone: '11987654321'
      };

      const updatedBeneficiaria = {
        ...existingBeneficiaria,
        ...updateData,
        updated_at: new Date()
      };

      mockDb.findById.mockResolvedValue(existingBeneficiaria);
      mockDb.update.mockResolvedValue(updatedBeneficiaria);

      const response = await request(app)
        .put('/beneficiarias/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.beneficiaria.nome_completo).toBe('Nome Atualizado');
      expect(response.body.message).toBe('Beneficiária atualizada com sucesso');
    });

    it('deve rejeitar atualização de beneficiária inexistente', async () => {
      mockDb.findById.mockResolvedValue(null);

      const response = await request(app)
        .put('/beneficiarias/999')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ nome_completo: 'Teste' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Beneficiária não encontrada');
    });

    it('deve rejeitar CPF duplicado na atualização', async () => {
      const existingBeneficiaria = {
        id: '1',
        cpf: '123.456.789-01'
      };

      mockDb.findById.mockResolvedValue(existingBeneficiaria);
      mockDb.query.mockResolvedValue([{ id: '2' }]); // Outro registro com mesmo CPF

      const response = await request(app)
        .put('/beneficiarias/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ cpf: '987.654.321-01' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('CPF já está em uso por outra beneficiária');
    });
  });

  describe('DELETE /beneficiarias/:id', () => {
    it('deve fazer soft delete de beneficiária', async () => {
      const existingBeneficiaria = {
        id: '1',
        nome_completo: 'Maria Silva',
        status: 'ativa'
      };

      mockDb.findById.mockResolvedValue(existingBeneficiaria);
      mockDb.update.mockResolvedValue({
        ...existingBeneficiaria,
        status: 'inativa',
        deleted_at: new Date()
      });

      const response = await request(app)
        .delete('/beneficiarias/1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Beneficiária removida com sucesso');
      expect(mockDb.update).toHaveBeenCalledWith(
        'beneficiarias',
        '1',
        expect.objectContaining({ status: 'inativa' })
      );
    });

    it('deve rejeitar remoção de beneficiária inexistente', async () => {
      mockDb.findById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/beneficiarias/999')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Beneficiária não encontrada');
    });
  });

  describe('GET /beneficiarias/:id/anamneses', () => {
    it('deve retornar anamneses da beneficiária', async () => {
      const mockAnamneses = [
        {
          id: '1',
          beneficiaria_id: '1',
          data_anamnese: new Date(),
          created_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValue(mockAnamneses);

      const response = await request(app)
        .get('/beneficiarias/1/anamneses')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.anamneses).toHaveLength(1);
    });
  });

  describe('GET /beneficiarias/:id/declaracoes', () => {
    it('deve retornar declarações da beneficiária', async () => {
      const mockDeclaracoes = [
        {
          id: '1',
          beneficiaria_id: '1',
          data_declaracao: new Date(),
          created_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValue(mockDeclaracoes);

      const response = await request(app)
        .get('/beneficiarias/1/declaracoes')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.declaracoes).toHaveLength(1);
    });
  });
});

