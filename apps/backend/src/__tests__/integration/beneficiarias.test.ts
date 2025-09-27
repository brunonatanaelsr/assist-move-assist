import request from 'supertest';
import { app } from '../../app';
import { 
  setupTestDatabase,
  teardownTestDatabase,
  truncateAllTables,
  testConcurrency 
} from '../helpers/database';
import { factory } from 'factory-girl';
import { generateToken } from '../../utils/auth';

describe('Beneficiárias API', () => {
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    const user = await factory.create('user', { role: 'admin' });
    authToken = generateToken(user);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  describe('POST /beneficiarias', () => {
    it('deve criar uma nova beneficiária', async () => {
      const beneficiariaData = await factory.attrs('beneficiaria');

      const response = await request(app)
        .post('/api/beneficiarias')
        .set('Authorization', `Bearer ${authToken}`)
        .send(beneficiariaData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.nome_completo).toBe(beneficiariaData.nome_completo);
    });

    it('deve validar dados obrigatórios', async () => {
      const response = await request(app)
        .post('/api/beneficiarias')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContain('Nome completo é obrigatório');
    });

    it('deve lidar com concorrência', async () => {
      const beneficiariaData = await factory.attrs('beneficiaria');
      
      const results = await testConcurrency(
        () => request(app)
          .post('/api/beneficiarias')
          .set('Authorization', `Bearer ${authToken}`)
          .send(beneficiariaData),
        5
      );

      expect(results.successful).toBe(1);
      expect(results.failed).toBe(4); // CPF duplicado
    });
  });

  describe('GET /beneficiarias', () => {
    it('deve listar beneficiárias paginadas', async () => {
      await factory.createMany('beneficiaria', 15);

      const response = await request(app)
        .get('/api/beneficiarias')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(10);
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
      expect(response.body.data.pagination).toHaveProperty('pages');
    });

    it('deve filtrar por termo de busca', async () => {
      await factory.createMany('beneficiaria', 5);
      await factory.create('beneficiaria', {
        nome_completo: 'Maria da Silva'
      });

      const response = await request(app)
        .get('/api/beneficiarias')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'Maria' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].nome_completo).toBe('Maria da Silva');
    });

    it('deve ordenar resultados', async () => {
      await factory.create('beneficiaria', { nome_completo: 'Carlos' });
      await factory.create('beneficiaria', { nome_completo: 'Ana' });
      await factory.create('beneficiaria', { nome_completo: 'Beatriz' });

      const response = await request(app)
        .get('/api/beneficiarias')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sort: 'nome_completo', order: 'asc' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items[0].nome_completo).toBe('Ana');
    });
  });

  describe('GET /beneficiarias/:id', () => {
    it('deve retornar beneficiária por ID', async () => {
      const beneficiaria = await factory.create('beneficiaria');

      const response = await request(app)
        .get(`/api/beneficiarias/${beneficiaria.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(beneficiaria.id);
    });

    it('deve retornar 404 para ID inexistente', async () => {
      const response = await request(app)
        .get('/api/beneficiarias/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /beneficiarias/:id/resumo', () => {
    it('deve retornar resumo consolidado', async () => {
      const beneficiaria = await factory.create('beneficiaria');

      const response = await request(app)
        .get(`/api/beneficiarias/${beneficiaria.id}/resumo`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.beneficiaria.id).toBe(beneficiaria.id);
      expect(response.body.data.formularios.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /beneficiarias/:id/atividades', () => {
    it('deve retornar lista paginada de atividades', async () => {
      const beneficiaria = await factory.create('beneficiaria');

      const response = await request(app)
        .get(`/api/beneficiarias/${beneficiaria.id}/atividades`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.pagination).toMatchObject({ page: 1, limit: 10 });
    });
  });

  describe('PUT /beneficiarias/:id', () => {
    it('deve atualizar beneficiária existente', async () => {
      const beneficiaria = await factory.create('beneficiaria');
      const updateData = {
        nome_completo: 'Novo Nome',
        telefone: '11999999999'
      };

      const response = await request(app)
        .put(`/api/beneficiarias/${beneficiaria.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nome_completo).toBe(updateData.nome_completo);
    });

    it('deve validar dados na atualização', async () => {
      const beneficiaria = await factory.create('beneficiaria');

      const response = await request(app)
        .put(`/api/beneficiarias/${beneficiaria.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'email-invalido' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Email inválido');
    });
  });

  describe('DELETE /beneficiarias/:id', () => {
    it('deve deletar beneficiária existente', async () => {
      const beneficiaria = await factory.create('beneficiaria');

      const response = await request(app)
        .delete(`/api/beneficiarias/${beneficiaria.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verificar se foi realmente deletada
      const getResponse = await request(app)
        .get(`/api/beneficiarias/${beneficiaria.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('deve retornar 404 ao tentar deletar inexistente', async () => {
      const response = await request(app)
        .delete('/api/beneficiarias/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
