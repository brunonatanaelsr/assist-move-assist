import request from 'supertest';
import app from '../src/app';
import pool from '../src/config/database';
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { withCsrf } from './utils/csrf';

describe('Feed Posts API Tests', () => {
  let authToken: string;
  let postId: string;

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
    // Limpar posts de teste
    if (postId) {
      await pool.query('DELETE FROM feed_posts WHERE id = $1', [postId]);
    }
    await pool.end();
  });

  it('should create new feed post', async () => {
    const post = {
      titulo: 'Post de Teste',
      conteudo: 'Conteúdo do post de teste',
      tipo: 'NOTICIA',
      tags: ['teste', 'integracao']
    };

    const res = await (
      await withCsrf(
        app,
        request(app)
          .post('/api/feed')
          .set('Authorization', `Bearer ${authToken}`)
      )
    ).send(post);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    postId = res.body.data.id;
  });

  it('should list feed posts', async () => {
    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const items = res.body.data?.items ?? res.body.data?.data ?? res.body.data;
    expect(Array.isArray(items)).toBe(true);
  });

  it('should get feed post by id', async () => {
    const res = await request(app)
      .get(`/api/feed/${postId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id', postId);
    expect(res.body.data.titulo).toBe('Post de Teste');
  });

  it('should update feed post', async () => {
    const update = {
      titulo: 'Post de Teste Atualizado'
    };

    const res = await (
      await withCsrf(
        app,
        request(app)
          .put(`/api/feed/${postId}`)
          .set('Authorization', `Bearer ${authToken}`)
      )
    ).send(update);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.titulo).toBe(update.titulo);
  });

  it('should filter feed posts by type', async () => {
    const res = await request(app)
      .get('/api/feed')
      .query({ tipo: 'NOTICIA' })
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const items = res.body.data?.items ?? res.body.data?.data ?? res.body.data;
    expect(Array.isArray(items)).toBe(true);
    expect(items.every((post: any) => post.tipo === 'NOTICIA')).toBe(true);
  });

  it('should require auth for feed posts endpoints', async () => {
    const res = await request(app)
      .get('/api/feed');
    
    expect(res.status).toBe(401);
  });
});
