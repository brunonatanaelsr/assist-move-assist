import supertest from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import feedRoutes from '../feed.routes';

jest.mock('pg');
jest.mock('ioredis');
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: '123', name: 'Test User', role: 'user' };
    next();
  }
}));

describe('Feed Routes', () => {
  let app: express.Express;
  let mockPool: jest.Mocked<Pool>;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    mockRedis = new Redis() as jest.Mocked<Redis>;
    
    app = express();
    app.use(express.json());
    app.use('/feed', feedRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /feed', () => {
    it('deve listar posts do feed', async () => {
      const mockPosts = [{ id: 1, titulo: 'Post 1' }];
      (mockPool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: mockPosts });

      const response = await supertest(app).get('/feed');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockPosts);
    });

    it('deve retornar erro 500 em caso de falha', async () => {
      (mockPool.query as unknown as jest.Mock).mockRejectedValueOnce(new Error('Erro no banco'));

      const response = await supertest(app).get('/feed');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno do servidor');
    });
  });

  describe('POST /feed', () => {
    it('deve criar um novo post', async () => {
      const newPost = {
        tipo: 'noticia',
        titulo: 'Novo Post',
        conteudo: 'Conteúdo do post'
      };
      const mockCreatedPost = { ...newPost, id: 1 };
      (mockPool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [mockCreatedPost] });

      const response = await supertest(app)
        .post('/feed')
        .send(newPost);

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject(mockCreatedPost);
    });

    it('deve rejeitar post sem campos obrigatórios', async () => {
      const response = await supertest(app)
        .post('/feed')
        .send({ titulo: 'Post sem conteúdo' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /feed/:id/curtir', () => {
    it('deve permitir curtir um post', async () => {
      const postId = 1;
      (mockPool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ curtidas: 10 }] });

      const response = await supertest(app).post(`/feed/${postId}/curtir`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ curtidas: 10 });
    });

    it('deve retornar 404 para post inexistente', async () => {
      (mockPool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const response = await supertest(app).post('/feed/999/curtir');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /feed/stats/summary', () => {
    it('deve retornar estatísticas do feed', async () => {
      const mockStats = {
        total_posts: 10,
        total_curtidas: 100
      };
      (mockPool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [mockStats] });

      const response = await supertest(app).get('/feed/stats/summary');

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject(mockStats);
    });
  });

  describe('POST /feed/:postId/comentarios', () => {
    it('deve criar um novo comentário', async () => {
      const postId = 1;
      const comment = { conteudo: 'Novo comentário' };
      const mockCreatedComment = { 
        id: 1, 
        post_id: postId,
        ...comment, 
        autor_id: '123',
        autor_nome: 'Test User'
      };
      (mockPool.query as unknown as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockCreatedComment] })  // Inserir comentário
        .mockResolvedValueOnce({ rows: [{}] });  // Atualizar contagem

      const response = await supertest(app)
        .post(`/feed/${postId}/comentarios`)
        .send(comment);

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject(mockCreatedComment);
    });

    it('deve rejeitar comentário sem conteúdo', async () => {
      const response = await supertest(app)
        .post('/feed/1/comentarios')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /feed/:postId', () => {
    const postId = 1;
    const userId = '123';

    beforeEach(() => {
      (mockPool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ id: postId, autor_id: userId }] }); // Verificação inicial
    });

    it('deve atualizar post quando usuário é autor', async () => {
      const updateData = { titulo: 'Título Atualizado' };
      (mockPool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ id: postId, ...updateData }] });

      const response = await supertest(app)
        .put(`/feed/${postId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject(updateData);
    });

    it('deve rejeitar atualização quando usuário não é autor', async () => {
      (mockPool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ id: postId, autor_id: 'outro_usuario' }] });

      const response = await supertest(app)
        .put(`/feed/${postId}`)
        .send({ titulo: 'Novo Título' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /feed/:postId', () => {
    const postId = 1;
    const userId = '123';

    beforeEach(() => {
      (mockPool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ id: postId, autor_id: userId }] }); // Verificação inicial
    });

    it('deve excluir post quando usuário é autor', async () => {
      (mockPool.query as unknown as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })  // Soft delete post
        .mockResolvedValueOnce({ rows: [] }); // Soft delete comentários

      const response = await supertest(app).delete(`/feed/${postId}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post excluído com sucesso');
    });

    it('deve rejeitar exclusão quando usuário não é autor', async () => {
      (mockPool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ id: postId, autor_id: 'outro_usuario' }] });

      const response = await supertest(app).delete(`/feed/${postId}`);

      expect(response.status).toBe(403);
    });
  });
});
