const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { pool } = require('../config/database');
const { ROLES, PERMISSIONS } = require('../middleware/auth');

describe('Auth Middleware Tests', () => {
  let adminToken, gestorToken, atendenteToken, voluntarioToken;
  
  beforeAll(async () => {
    // Criar usuários de teste
    const users = [
      { email: 'admin@test.com', role: ROLES.ADMIN },
      { email: 'gestor@test.com', role: ROLES.GESTOR },
      { email: 'atendente@test.com', role: ROLES.ATENDENTE },
      { email: 'voluntario@test.com', role: ROLES.VOLUNTARIO }
    ];

    for (const user of users) {
      await pool.query(
        'INSERT INTO usuarios (email, senha_hash, role, ativo) VALUES ($1, $2, $3, true)',
        [user.email, 'password_hash', user.role]
      );
    }

    // Gerar tokens
    adminToken = jwt.sign({ email: 'admin@test.com', role: ROLES.ADMIN }, process.env.JWT_SECRET);
    gestorToken = jwt.sign({ email: 'gestor@test.com', role: ROLES.GESTOR }, process.env.JWT_SECRET);
    atendenteToken = jwt.sign({ email: 'atendente@test.com', role: ROLES.ATENDENTE }, process.env.JWT_SECRET);
    voluntarioToken = jwt.sign({ email: 'voluntario@test.com', role: ROLES.VOLUNTARIO }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    // Limpar usuários de teste
    await pool.query('DELETE FROM usuarios WHERE email LIKE %@test.com');
    await pool.end();
  });

  describe('Authentication Tests', () => {
    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/beneficiarias');
      
      expect(response.status).toBe(401);
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/beneficiarias')
        .set('Authorization', 'Bearer invalid_token');
      
      expect(response.status).toBe(401);
    });

    test('should accept request with valid token', async () => {
      const response = await request(app)
        .get('/api/beneficiarias')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Role-based Authorization Tests', () => {
    // Beneficiárias
    describe('GET /api/beneficiarias', () => {
      test('should allow all authenticated users to view beneficiárias', async () => {
        const tokens = [adminToken, gestorToken, atendenteToken, voluntarioToken];
        
        for (const token of tokens) {
          const response = await request(app)
            .get('/api/beneficiarias')
            .set('Authorization', `Bearer ${token}`);
          
          expect(response.status).toBe(200);
        }
      });
    });

    describe('POST /api/beneficiarias', () => {
      const newBeneficiaria = {
        nomeCompleto: 'Test User',
        cpf: '12345678901',
        dataNascimento: '1990-01-01',
        telefone: '11999999999'
      };

      test('should allow admin, gestor, and atendente to create beneficiárias', async () => {
        const tokens = [adminToken, gestorToken, atendenteToken];
        
        for (const token of tokens) {
          const response = await request(app)
            .post('/api/beneficiarias')
            .set('Authorization', `Bearer ${token}`)
            .send(newBeneficiaria);
          
          expect(response.status).toBe(201);
        }
      });

      test('should not allow voluntario to create beneficiárias', async () => {
        const response = await request(app)
          .post('/api/beneficiarias')
          .set('Authorization', `Bearer ${voluntarioToken}`)
          .send(newBeneficiaria);
        
        expect(response.status).toBe(403);
      });
    });
  });

  describe('Permission-based Authorization Tests', () => {
    // Oficinas
    describe('POST /api/oficinas', () => {
      const newOficina = {
        titulo: 'Test Oficina',
        descricao: 'Test Description',
        dataInicio: '2025-09-01',
        dataFim: '2025-09-02',
        vagas: 10
      };

      test('should allow admin and gestor to create oficinas', async () => {
        const tokens = [adminToken, gestorToken];
        
        for (const token of tokens) {
          const response = await request(app)
            .post('/api/oficinas')
            .set('Authorization', `Bearer ${token}`)
            .send(newOficina);
          
          expect(response.status).toBe(201);
        }
      });

      test('should not allow atendente and voluntario to create oficinas', async () => {
        const tokens = [atendenteToken, voluntarioToken];
        
        for (const token of tokens) {
          const response = await request(app)
            .post('/api/oficinas')
            .set('Authorization', `Bearer ${token}`)
            .send(newOficina);
          
          expect(response.status).toBe(403);
        }
      });
    });

    // Relatórios
    describe('GET /api/relatorios', () => {
      test('should allow admin and gestor to view reports', async () => {
        const tokens = [adminToken, gestorToken];
        
        for (const token of tokens) {
          const response = await request(app)
            .get('/api/relatorios')
            .set('Authorization', `Bearer ${token}`);
          
          expect(response.status).toBe(200);
        }
      });

      test('should not allow atendente and voluntario to view reports', async () => {
        const tokens = [atendenteToken, voluntarioToken];
        
        for (const token of tokens) {
          const response = await request(app)
            .get('/api/relatorios')
            .set('Authorization', `Bearer ${token}`);
          
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('Resource Ownership Tests', () => {
    let oficinaId;

    beforeAll(async () => {
      // Criar uma oficina para testar propriedade
      const result = await pool.query(
        'INSERT INTO oficinas (titulo, descricao, criado_por) VALUES ($1, $2, $3) RETURNING id',
        ['Test Oficina', 'Test Description', 1] // assumindo que o admin tem id 1
      );
      oficinaId = result.rows[0].id;
    });

    describe('PUT /api/oficinas/:id', () => {
      const updateData = {
        titulo: 'Updated Oficina'
      };

      test('should allow admin to update any oficina', async () => {
        const response = await request(app)
          .put(`/api/oficinas/${oficinaId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData);
        
        expect(response.status).toBe(200);
      });

      test('should allow gestor to update own oficina', async () => {
        // Primeiro criar uma oficina do gestor
        const result = await pool.query(
          'INSERT INTO oficinas (titulo, descricao, criado_por) VALUES ($1, $2, $3) RETURNING id',
          ['Gestor Oficina', 'Test Description', 2] // assumindo que o gestor tem id 2
        );
        const gestorOficinaId = result.rows[0].id;

        const response = await request(app)
          .put(`/api/oficinas/${gestorOficinaId}`)
          .set('Authorization', `Bearer ${gestorToken}`)
          .send(updateData);
        
        expect(response.status).toBe(200);
      });

      test('should not allow gestor to update others oficina', async () => {
        const response = await request(app)
          .put(`/api/oficinas/${oficinaId}`)
          .set('Authorization', `Bearer ${gestorToken}`)
          .send(updateData);
        
        expect(response.status).toBe(403);
      });
    });
  });
});
