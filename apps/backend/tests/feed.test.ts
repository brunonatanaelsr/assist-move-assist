import request from 'supertest';
import app from '../src/app';
import pool from '../src/config/database';
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';

describe('Feed Posts API Tests', () => {
  let authToken: string;
  let postId: string;

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

    const res = await request(app)
      .post('/api/feed')
      .set('Authorization', `Bearer ${authToken}`)
      .send(post);
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    postId = res.body.id;
  });

  it('should list feed posts', async () => {
    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get feed post by id', async () => {
    const res = await request(app)
      .get(`/api/feed/${postId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', postId);
    expect(res.body.titulo).toBe('Post de Teste');
  });

  it('should update feed post', async () => {
    const update = {
      titulo: 'Post de Teste Atualizado'
    };

    const res = await request(app)
      .patch(`/api/feed/${postId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(update);
    
    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe(update.titulo);
  });

  it('should filter feed posts by type', async () => {
    const res = await request(app)
      .get('/api/feed')
      .query({ tipo: 'NOTICIA' })
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((post: any) => post.tipo === 'NOTICIA')).toBe(true);
  });

  it('should require auth for feed posts endpoints', async () => {
    const res = await request(app)
      .get('/api/feed');
    
    expect(res.status).toBe(401);
  });
});
