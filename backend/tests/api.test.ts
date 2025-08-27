import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/config/database';

describe('API Tests', () => {
  beforeAll(async () => {
    // Aguardar conexão com o banco
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    // Fechar conexão com o banco
    await pool.end();
  });

  describe('Auth Endpoints', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bruno@move.com',
          password: '15002031'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });
  });

  describe('Plano de Ação Endpoints', () => {
    let authToken: string;

    beforeAll(async () => {
      // Login para obter token
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bruno@move.com',
          password: '15002031'
        });
      
      authToken = res.body.token;
    });

    it('should create a new plano de ação', async () => {
      const plano = {
        beneficiaria_id: '123e4567-e89b-12d3-a456-426614174000',
        data_plano: new Date(),
        objetivo_principal: 'Teste de integração',
        areas_prioritarias: { area1: true, area2: false },
        acoes_realizadas: 'Testes automatizados',
        suporte_instituto: 'Suporte técnico'
      };

      const res = await request(app)
        .post('/api/planos-acao')
        .set('Authorization', `Bearer ${authToken}`)
        .send(plano);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });

    it('should list planos de ação', async () => {
      const res = await request(app)
        .get('/api/planos-acao')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
