import request from 'supertest';
import express from 'express';

const mockUser = {
  id: '123',
  email: 'bruno@move.com',
  role: 'admin'
};

jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = mockUser;
    next();
  },
  requireProfissional: (req: any, res: any, next: any) => next(),
  AuthService: {
    verifyToken: jest.fn().mockReturnValue(mockUser)
  }
}));

jest.mock('../../config/database', () => ({
  db: {
    query: jest.fn(),
    getBeneficiarias: jest.fn(),
    findById: jest.fn(),
    insert: jest.fn(),
    update: jest.fn()
  }
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { db } = require('../../config/database');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const beneficiariasRouter = require('../beneficiarias').default;

const app = express();
app.use(express.json());
app.use('/beneficiarias', beneficiariasRouter);

const mockDb = db as any;

describe('Beneficiarias Routes', () => {
  const mockToken = 'valid-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /beneficiarias', () => {
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

    it('deve filtrar beneficiárias por busca', async () => {
      const mockBeneficiarias = [
        {
          id: '1',
          nome_completo: 'Maria Silva',
          cpf: '123.456.789-01',
          status: 'ativa'
        }
      ];

      mockDb.getBeneficiarias.mockResolvedValue(mockBeneficiarias);
      mockDb.query.mockResolvedValue([{ total: '1' }]);

      const response = await request(app)
        .get('/beneficiarias')
        .set('Authorization', `Bearer ${mockToken}`)
        .query({ search: 'Maria' });

      expect(response.status).toBe(200);
      expect(response.body.beneficiarias).toHaveLength(1);
      expect(response.body.beneficiarias[0].nome_completo).toBe('Maria Silva');
    });

    it('deve filtrar beneficiárias por status', async () => {
      mockDb.getBeneficiarias.mockResolvedValue([]);
      mockDb.query.mockResolvedValue([{ total: '0' }]);

      const response = await request(app)
        .get('/beneficiarias')
        .set('Authorization', `Bearer ${mockToken}`)
        .query({ status: 'inativa' });

      expect(response.status).toBe(200);
      expect(mockDb.getBeneficiarias).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'inativa' })
      );
    });
  });

  describe('GET /beneficiarias/:id', () => {
    it('deve retornar beneficiária por ID', async () => {
      const mockBeneficiaria = {
        id: '1',
        nome_completo: 'Maria Silva',
        cpf: '123.456.789-01',
        status: 'ativa',
        created_at: new Date().toISOString()
      };

      mockDb.findById.mockResolvedValue(mockBeneficiaria);

      const response = await request(app)
        .get('/beneficiarias/1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.beneficiaria).toMatchObject(mockBeneficiaria);
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

    it('deve criar nova beneficiária com dados válidos', async () => {
      const mockCreatedBeneficiaria = {
        id: '3',
        ...novaBeneficiaria,
        status: 'ativa',
        created_by: mockUser.id,
        created_at: new Date().toISOString()
      };

      mockDb.query.mockResolvedValue([]); // CPF não existe
      mockDb.insert.mockResolvedValue(mockCreatedBeneficiaria);

      const response = await request(app)
        .post('/beneficiarias')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(novaBeneficiaria);

      expect(response.status).toBe(201);
      expect(response.body.beneficiaria).toMatchObject(mockCreatedBeneficiaria);
      expect(response.body.message).toBe('Beneficiária cadastrada com sucesso');
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
