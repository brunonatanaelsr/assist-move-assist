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
      nome: 'Oficina de Teste',
      descricao: 'Descrição da oficina de teste',
      data_inicio: '2025-01-01',
      data_fim: '2025-01-02',
      horario_inicio: '09:00',
      horario_fim: '11:00',
      local: 'Local de Teste',
      vagas_total: 20,
      status: 'planejada'
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
    expect(res.body.message).toBe('Oficina criada com sucesso');
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        nome: oficina.nome,
        descricao: oficina.descricao,
        data_inicio: oficina.data_inicio,
        data_fim: oficina.data_fim,
        horario_inicio: oficina.horario_inicio,
        horario_fim: oficina.horario_fim,
        local: oficina.local,
        vagas_total: oficina.vagas_total,
        status: oficina.status
      })
    );
    expect(res.body.data).toHaveProperty('data_criacao');
    expect(res.body.data).toHaveProperty('data_atualizacao');
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
