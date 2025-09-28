import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/config/database';
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { withCsrf } from './utils/csrf';

describe('Oficinas API Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login para obter token
    const res = await (
      await withCsrf(app, request(app).post('/api/auth/login'))
    ).send({
      email: 'bruno@move.com',
      password: '15002031'
    });
    
    authToken = res.body.token;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should create new oficina', async () => {
    const oficina = {
      titulo: 'Oficina de Teste',
      descricao: 'Descrição da oficina de teste',
      data_inicio: new Date(),
      data_fim: new Date(Date.now() + 86400000),
      local: 'Local de Teste',
      max_participantes: 20,
      status: 'AGENDADA'
    };

    const res = await (
      await withCsrf(
        app,
        request(app)
          .post('/api/oficinas')
          .set('Authorization', `Bearer ${authToken}`)
      )
    ).send(oficina);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
  });

  it('should list oficinas', async () => {
    const res = await request(app)
      .get('/api/oficinas')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const items = res.body.data?.items ?? res.body.data?.data ?? res.body.data;
    expect(Array.isArray(items)).toBe(true);
  });

  it('should require auth for oficinas endpoints', async () => {
    const res = await request(app)
      .get('/api/oficinas');
    
    expect(res.status).toBe(401);
  });
});
