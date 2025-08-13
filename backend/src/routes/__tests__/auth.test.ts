import request from 'supertest';

import app from '../../app';

describe('Auth Routes', () => {
  it('should require email and password on login', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email e senha são obrigatórios');
  });
});
