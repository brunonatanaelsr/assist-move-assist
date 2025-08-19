import { Pool } from 'pg';
import Redis from 'ioredis';
import { FeedService } from '../feed.service';

// Mocks
jest.mock('pg');
jest.mock('ioredis');

describe('FeedService', () => {
  let feedService: FeedService;
  let mockPool: jest.Mocked<Pool>;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    mockRedis = new Redis() as jest.Mocked<Redis>;
    feedService = new FeedService(mockPool, mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listPosts', () => {
    it('deve retornar posts do cache se disponível', async () => {
      const mockPosts = [{ id: 1, titulo: 'Post 1' }];
      mockRedis.get.mockResolvedValue(JSON.stringify(mockPosts));

      const result = await feedService.listPosts();

      expect(result).toEqual(mockPosts);
      expect(mockRedis.get).toHaveBeenCalledWith('feed:posts');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('deve buscar posts do banco se não estiver em cache', async () => {
      const mockPosts = [{ id: 1, titulo: 'Post 1' }];
      mockRedis.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: mockPosts });

      const result = await feedService.listPosts();

      expect(result).toEqual(mockPosts);
      expect(mockRedis.get).toHaveBeenCalledWith('feed:posts');
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('createPost', () => {
    it('deve criar um novo post com sucesso', async () => {
      const mockPost = {
        tipo: 'noticia',
        titulo: 'Novo Post',
        conteudo: 'Conteúdo do post',
        autor_id: '123',
        autor_nome: 'Autor'
      };

      const mockResult = { rows: [{ ...mockPost, id: 1 }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await feedService.createPost(mockPost);

      expect(result).toEqual(mockResult.rows[0]);
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('feed:posts');
    });
  });

  describe('likePost', () => {
    it('deve incrementar curtidas com sucesso', async () => {
      const postId = 1;
      const mockResult = { rows: [{ curtidas: 10 }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await feedService.likePost(postId);

      expect(result).toEqual({ curtidas: 10 });
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('feed:posts');
    });

    it('deve lançar erro se post não for encontrado', async () => {
      const postId = 999;
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(feedService.likePost(postId)).rejects.toThrow('Post não encontrado');
    });
  });

  describe('getFeedStats', () => {
    it('deve retornar estatísticas do cache se disponível', async () => {
      const mockStats = { total_posts: 10, total_curtidas: 100 };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockStats));

      const result = await feedService.getFeedStats();

      expect(result).toEqual(mockStats);
      expect(mockRedis.get).toHaveBeenCalledWith('feed:stats');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('deve buscar estatísticas do banco se não estiver em cache', async () => {
      const mockStats = { total_posts: 10, total_curtidas: 100 };
      mockRedis.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: [mockStats] });

      const result = await feedService.getFeedStats();

      expect(result).toMatchObject(mockStats);
      expect(mockRedis.get).toHaveBeenCalledWith('feed:stats');
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('updatePost', () => {
    const mockPost = {
      id: 1,
      autor_id: '123',
      titulo: 'Post Original'
    };

    beforeEach(() => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockPost] }); // Primeira chamada - verificação
    });

    it('deve atualizar post com sucesso quando usuário é autor', async () => {
      const updateData = { titulo: 'Novo Título' };
      mockPool.query.mockResolvedValueOnce({ rows: [{ ...mockPost, ...updateData }] }); // Segunda chamada - atualização

      const result = await feedService.updatePost(1, updateData, '123', 'user');

      expect(result).toMatchObject(updateData);
      expect(mockRedis.del).toHaveBeenCalledWith('feed:posts');
    });

    it('deve atualizar post quando usuário é super_admin', async () => {
      const updateData = { titulo: 'Novo Título' };
      mockPool.query.mockResolvedValueOnce({ rows: [{ ...mockPost, ...updateData }] });

      const result = await feedService.updatePost(1, updateData, '456', 'super_admin');

      expect(result).toMatchObject(updateData);
    });

    it('deve rejeitar atualização quando usuário não tem permissão', async () => {
      const updateData = { titulo: 'Novo Título' };

      await expect(
        feedService.updatePost(1, updateData, '456', 'user')
      ).rejects.toThrow('Sem permissão para editar este post');
    });
  });

  describe('deletePost', () => {
    const mockPost = {
      id: 1,
      autor_id: '123'
    };

    beforeEach(() => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockPost] }); // Primeira chamada - verificação
    });

    it('deve excluir post com sucesso quando usuário é autor', async () => {
      await feedService.deletePost(1, '123', 'user');

      expect(mockPool.query).toHaveBeenCalledWith('BEGIN');
      expect(mockRedis.del).toHaveBeenCalledWith('feed:posts');
      expect(mockRedis.del).toHaveBeenCalledWith('feed:comments:1');
      expect(mockRedis.del).toHaveBeenCalledWith('feed:stats');
      expect(mockPool.query).toHaveBeenCalledWith('COMMIT');
    });

    it('deve excluir post quando usuário é super_admin', async () => {
      await feedService.deletePost(1, '456', 'super_admin');

      expect(mockPool.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPool.query).toHaveBeenCalledWith('COMMIT');
    });

    it('deve rejeitar exclusão quando usuário não tem permissão', async () => {
      await expect(
        feedService.deletePost(1, '456', 'user')
      ).rejects.toThrow('Sem permissão para excluir este post');
    });

    it('deve fazer rollback em caso de erro na transação', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Erro na exclusão'));

      await expect(feedService.deletePost(1, '123', 'user')).rejects.toThrow();
      expect(mockPool.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
