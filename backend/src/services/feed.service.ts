import { Pool } from 'pg';
import Redis from 'ioredis';
import { z } from 'zod';
import { feedPostSchema, feedCommentSchema } from '../validators/feed.validator';
import { formatArrayDates, formatObjectDates } from '../utils/dateFormatter';

export type FeedPost = z.infer<typeof feedPostSchema>;
export type FeedComment = z.infer<typeof feedCommentSchema>;

export class FeedService {
  private pool: Pool;
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
  }

  private async getCacheKey(key: string) {
    try {
      const data = await this.redis.get(`feed:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Erro ao buscar cache:', error);
      return null;
    }
  }

  private async setCacheKey(key: string, data: any) {
    try {
      await this.redis.setex(`feed:${key}`, this.CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao definir cache:', error);
    }
  }

  async listPosts(limit = 10): Promise<FeedPost[]> {
    try {
      // Tentar buscar do cache primeiro
      const cachedPosts = await this.getCacheKey('posts');
      if (cachedPosts) {
        return cachedPosts;
      }

      const result = await this.pool.query(`
        SELECT 
          id, tipo, titulo, conteudo, autor_id, autor_nome, 
          curtidas, comentarios, ativo, 
          data_criacao, data_atualizacao, imagem_url
        FROM feed_posts 
        WHERE ativo = true
        ORDER BY data_criacao DESC
        LIMIT $1
      `, [limit]);

      const posts = formatArrayDates(result.rows, ['data_criacao', 'data_atualizacao']);
      
      // Armazenar no cache
      await this.setCacheKey('posts', posts);

      return posts;
    } catch (error) {
      console.error('Erro ao listar posts:', error);
      throw new Error('Erro ao buscar posts do feed');
    }
  }

  async createPost(data: Omit<FeedPost, 'id' | 'curtidas' | 'comentarios' | 'data_criacao' | 'data_atualizacao'>): Promise<FeedPost> {
    try {
      const validatedData = feedPostSchema.partial().parse(data);

      const result = await this.pool.query(`
        INSERT INTO feed_posts (
          tipo, titulo, conteudo, autor_id, autor_nome, imagem_url
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        validatedData.tipo,
        validatedData.titulo,
        validatedData.conteudo,
        validatedData.autor_id,
        validatedData.autor_nome || 'Usuário',
        validatedData.imagem_url
      ]);

      const post = formatObjectDates(result.rows[0], ['data_criacao', 'data_atualizacao']);

      // Invalidar cache de posts
      await this.redis.del('feed:posts');

      return post;
    } catch (error) {
      console.error('Erro ao criar post:', error);
      throw new Error('Erro ao criar novo post');
    }
  }

  async likePost(postId: number): Promise<{ curtidas: number }> {
    try {
      const result = await this.pool.query(`
        UPDATE feed_posts 
        SET curtidas = curtidas + 1, data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = $1 AND ativo = true
        RETURNING curtidas
      `, [postId]);

      if (result.rows.length === 0) {
        throw new Error('Post não encontrado');
      }

      // Invalidar cache de posts
      await this.redis.del('feed:posts');

      return { curtidas: result.rows[0].curtidas };
    } catch (error) {
      console.error('Erro ao curtir post:', error);
      throw error;
    }
  }

  async getFeedStats() {
    try {
      // Tentar buscar do cache primeiro
      const cachedStats = await this.getCacheKey('stats');
      if (cachedStats) {
        return cachedStats;
      }

      const statsQuery = await this.pool.query(`
        SELECT 
          COUNT(*) as total_posts,
          COUNT(CASE WHEN tipo = 'anuncio' THEN 1 END) as total_anuncios,
          COUNT(CASE WHEN tipo = 'evento' THEN 1 END) as total_eventos,
          COUNT(CASE WHEN tipo = 'noticia' THEN 1 END) as total_noticias,
          COUNT(CASE WHEN tipo = 'conquista' THEN 1 END) as total_conquistas,
          SUM(curtidas) as total_curtidas,
          SUM(comentarios) as total_comentarios,
          AVG(curtidas) as media_curtidas
        FROM feed_posts 
        WHERE ativo = true
      `);
      
      const stats = {
        ...statsQuery.rows[0],
        posts_recentes: statsQuery.rows[0].total_posts,
        media_curtidas: parseFloat(statsQuery.rows[0].media_curtidas || 0).toFixed(1)
      };

      // Armazenar no cache
      await this.setCacheKey('stats', stats);

      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw new Error('Erro ao buscar estatísticas do feed');
    }
  }

  async listComments(postId: number): Promise<FeedComment[]> {
    try {
      // Tentar buscar do cache primeiro
      const cachedComments = await this.getCacheKey(`comments:${postId}`);
      if (cachedComments) {
        return cachedComments;
      }

      const result = await this.pool.query(`
        SELECT 
          c.id, c.post_id, c.autor_id, c.autor_nome, c.autor_foto, 
          c.conteudo, c.data_criacao, c.data_atualizacao
        FROM comentarios_feed c
        WHERE c.post_id = $1 AND c.ativo = true
        ORDER BY c.data_criacao ASC
      `, [postId]);

      const comments = formatArrayDates(result.rows, ['data_criacao', 'data_atualizacao']);

      // Armazenar no cache
      await this.setCacheKey(`comments:${postId}`, comments);

      return comments;
    } catch (error) {
      console.error('Erro ao listar comentários:', error);
      throw new Error('Erro ao buscar comentários do post');
    }
  }

  async createComment(data: Omit<FeedComment, 'id' | 'data_criacao' | 'data_atualizacao'>): Promise<FeedComment> {
    try {
      const validatedData = feedCommentSchema.partial().parse(data);

      // Inserir comentário
      const result = await this.pool.query(`
        INSERT INTO comentarios_feed (
          post_id, autor_id, autor_nome, autor_foto, conteudo
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        validatedData.post_id,
        validatedData.autor_id,
        validatedData.autor_nome || 'Usuário',
        validatedData.autor_foto,
        validatedData.conteudo.trim()
      ]);

      // Atualizar contador no post
      await this.pool.query(`
        UPDATE feed_posts 
        SET comentarios = comentarios + 1, data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [validatedData.post_id]);

      const comment = formatObjectDates(result.rows[0], ['data_criacao', 'data_atualizacao']);

      // Invalidar caches
      await this.redis.del(`feed:comments:${validatedData.post_id}`);
      await this.redis.del('feed:posts');

      return comment;
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      throw new Error('Erro ao criar novo comentário');
    }
  }

  async updatePost(postId: number, data: Partial<FeedPost>, userId: string, userRole: string): Promise<FeedPost> {
    try {
      // Verificar se o post existe
      const postQuery = await this.pool.query(
        'SELECT * FROM feed_posts WHERE id = $1 AND ativo = true',
        [postId]
      );
      
      if (postQuery.rows.length === 0) {
        throw new Error('Post não encontrado');
      }

      const post = postQuery.rows[0];

      // Verificar permissões
      if (post.autor_id !== userId && !['super_admin', 'superadmin'].includes(userRole)) {
        throw new Error('Sem permissão para editar este post');
      }

      const validatedData = feedPostSchema.partial().parse(data);

      // Atualizar post
      const result = await this.pool.query(`
        UPDATE feed_posts 
        SET 
          tipo = COALESCE($1, tipo),
          titulo = COALESCE($2, titulo),
          conteudo = COALESCE($3, conteudo),
          imagem_url = COALESCE($4, imagem_url),
          data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = $5 AND ativo = true
        RETURNING *
      `, [
        validatedData.tipo,
        validatedData.titulo?.trim(),
        validatedData.conteudo?.trim(),
        validatedData.imagem_url,
        postId
      ]);

      const updatedPost = formatObjectDates(result.rows[0], ['data_criacao', 'data_atualizacao']);

      // Invalidar cache
      await this.redis.del('feed:posts');

      return updatedPost;
    } catch (error) {
      console.error('Erro ao atualizar post:', error);
      throw error;
    }
  }

  async deletePost(postId: number, userId: string, userRole: string): Promise<void> {
    try {
      // Verificar se o post existe
      const postQuery = await this.pool.query(
        'SELECT * FROM feed_posts WHERE id = $1 AND ativo = true',
        [postId]
      );
      
      if (postQuery.rows.length === 0) {
        throw new Error('Post não encontrado');
      }

      const post = postQuery.rows[0];

      // Verificar permissões
      if (post.autor_id !== userId && !['super_admin', 'superadmin'].includes(userRole)) {
        throw new Error('Sem permissão para excluir este post');
      }

      // Início da transação
      await this.pool.query('BEGIN');

      try {
        // Soft delete do post
        await this.pool.query(`
          UPDATE feed_posts 
          SET ativo = false, data_atualizacao = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [postId]);

        // Soft delete dos comentários
        await this.pool.query(`
          UPDATE comentarios_feed 
          SET ativo = false, data_atualizacao = CURRENT_TIMESTAMP
          WHERE post_id = $1
        `, [postId]);

        await this.pool.query('COMMIT');

        // Invalidar caches
        await this.redis.del('feed:posts');
        await this.redis.del(`feed:comments:${postId}`);
        await this.redis.del('feed:stats');

      } catch (error) {
        await this.pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Erro ao excluir post:', error);
      throw error;
    }
  }
}
