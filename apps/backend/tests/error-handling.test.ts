import request from 'supertest';
import app from '../src/app';
import { describe, expect, it, beforeAll } from '@jest/globals';
import { withCsrf } from './utils/csrf';

describe('Error Handling Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    const res = await (
      await withCsrf(app, request(app).post('/api/auth/login'))
    ).send({
      email: 'bruno@move.com',
      password: '15002031'
    });
    
    authToken = res.body.token;
  });

  describe('Authentication Errors', () => {
    it('should reject invalid login credentials', async () => {
      const res = await (
        await withCsrf(app, request(app).post('/api/auth/login'))
      ).send({
        email: 'invalid@email.com',
        password: 'wrongpass'
      });
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject missing auth token', async () => {
      const res = await request(app)
        .get('/api/oficinas');
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject invalid auth token', async () => {
      const res = await request(app)
        .get('/api/oficinas')
        .set('Authorization', 'Bearer invalidtoken');
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Validation Errors', () => {
    it('should reject invalid email format', async () => {
      const res = await (
        await withCsrf(
          app,
          request(app)
            .post('/api/beneficiarias')
            .set('Authorization', `Bearer ${authToken}`)
        )
      ).send({
        nome: 'Maria Teste',
        email: 'invalidemail',
        cpf: '12345678901',
        data_nascimento: '1990-01-01'
      });
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject invalid CPF format', async () => {
      const res = await (
        await withCsrf(
          app,
          request(app)
            .post('/api/beneficiarias')
            .set('Authorization', `Bearer ${authToken}`)
        )
      ).send({
        nome: 'Maria Teste',
        email: 'maria@email.com',
        cpf: '123456',
        data_nascimento: '1990-01-01'
      });
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject missing required fields', async () => {
      const res = await (
        await withCsrf(
          app,
          request(app)
            .post('/api/oficinas')
            .set('Authorization', `Bearer ${authToken}`)
        )
      ).send({
        titulo: 'Oficina Teste'
        // faltando campos obrigatórios
      });
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Resource Not Found Errors', () => {
    it('should handle non-existent beneficiaria', async () => {
      const res = await request(app)
        .get('/api/beneficiarias/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('should handle non-existent oficina', async () => {
      const res = await request(app)
        .get('/api/oficinas/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('should handle non-existent feed post', async () => {
      const res = await request(app)
        .get('/api/feed/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
});
