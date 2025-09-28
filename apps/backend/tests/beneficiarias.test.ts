import request from 'supertest';
import app from '../src/app';
import pool from '../src/config/database';
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { withCsrf } from './utils/csrf';

describe('Beneficiarias API Tests', () => {
  let authToken: string;
  let beneficiariaId: string;

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
    // Limpar dados de teste
    if (beneficiariaId) {
      await pool.query('DELETE FROM beneficiarias WHERE id = $1', [beneficiariaId]);
    }
    await pool.end();
  });

  it('should create new beneficiaria', async () => {
    const beneficiaria = {
      nome: 'Maria Teste',
      email: 'maria.teste@email.com',
      cpf: '12345678901',
      data_nascimento: '1990-01-01',
      telefone: '11999999999',
      endereco: {
        logradouro: 'Rua Teste',
        numero: '123',
        complemento: 'Apto 1',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567'
      }
    };

    const res = await (
      await withCsrf(
        app,
        request(app)
          .post('/api/beneficiarias')
          .set('Authorization', `Bearer ${authToken}`)
      )
    ).send(beneficiaria);
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    beneficiariaId = res.body.id;
  });

  it('should get beneficiaria by id', async () => {
    const res = await request(app)
      .get(`/api/beneficiarias/${beneficiariaId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', beneficiariaId);
    expect(res.body.nome).toBe('Maria Teste');
  });

  it('should list beneficiarias', async () => {
    const res = await request(app)
      .get('/api/beneficiarias')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should update beneficiaria', async () => {
    const update = {
      telefone: '11988888888'
    };

    const res = await (
      await withCsrf(
        app,
        request(app)
          .patch(`/api/beneficiarias/${beneficiariaId}`)
          .set('Authorization', `Bearer ${authToken}`)
      )
    ).send(update);
    
    expect(res.status).toBe(200);
    expect(res.body.telefone).toBe(update.telefone);
  });

  it('should require auth for beneficiarias endpoints', async () => {
    const res = await request(app)
      .get('/api/beneficiarias');
    
    expect(res.status).toBe(401);
  });
});
