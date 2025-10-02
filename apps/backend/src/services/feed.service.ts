import { Pool } from 'pg';
import type { RedisClient } from '../lib/redis';
import { loggerService } from '../services/logger';
import { z } from '../openapi/init';
import { feedPostSchema, feedCommentSchema } from '../validators/feed.validator';
import { formatArrayDates, formatObjectDates } from '../utils/dateFormatter';
import { cacheService } from './cache.service';

export type FeedPost = z.infer<typeof feedPostSchema>;
export type FeedComment = z.infer<typeof feedCommentSchema>;

export class FeedService {
  private pool: Pool;
  private redis: RedisClient;
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(pool: Pool, redis: RedisClient) {
    this.pool = pool;
    this.redis = redis;
  }

  async getPostById(postId: number) {
    try {
      const result = await this.pool.query(
        `SELECT id, tipo, titulo, conteudo, autor_id, autor_nome, imagem_url, curtidas, comentarios, ativo, data_criacao, data_atualizacao
         FROM feed_posts WHERE id = $1 AND ativo = true`,
        [postId]
      );
      return result.rows[0] || null;
    } catch (error) {
      loggerService.error('Erro ao obter post:', { error });
      throw new Error('Erro ao obter post');
    }
  }

  async sharePost(postId: number, userId: string): Promise<void> {
    try {
      // Opcional: registrar compartilhamento em tabela separada no futuro
      await this.pool.query(
        `UPDATE feed_posts SET data_atualizacao = CURRENT_TIMESTAMP WHERE id = $1`,
        [postId]
      );
      // Invalidar cache de posts
      await cacheService.deletePattern('feed:*');
    } catch (error) {
      loggerService.error('Erro ao compartilhar post:', { error });
    }
  }

  private async getCacheKey<T>(key: string): Promise<T | null> {
    try {
      return await cacheService.get<T>(`feed:${key}`);
    } catch (error) {
      loggerService.warn('Erro ao buscar cache:', { error });
      return null;
    }
  }

  private async setCacheKey(key: string, data: any) {
    try {
      await cacheService.set(`feed:${key}`, data, this.CACHE_TTL);
    } catch (error) {
      loggerService.warn('Erro ao definir cache:', { error });
    }
  }

  async listPosts(limit = 10, page = 1, filters?: { tipo?: string; autorId?: string | number; userId?: string }): Promise<{ data: FeedPost[]; pagination: { page: number; limit: number; total: number } }> {
    try {
      const offset = (Math.max(1, page) - 1) * Math.max(1, limit);

      // Montar WHERE dinâmico
      const where: string[] = ['p.ativo = true'];
      const params: any[] = [];
      let idx = 1;
      if (filters?.tipo) { where.push(`p.tipo = $${idx++}`); params.push(filters.tipo); }
      if (filters?.autorId) { where.push(`p.autor_id = $${idx++}`); params.push(String(filters.autorId)); }

      // Consulta com liked_by_user
      const sql = `
        SELECT 
          p.id, p.tipo, p.titulo, p.conteudo, p.autor_id, p.autor_nome,
          p.curtidas, p.comentarios, p.ativo, p.data_criacao, p.data_atualizacao, p.imagem_url,
          CASE WHEN $${idx}::text IS NULL THEN false ELSE (EXISTS (SELECT 1 FROM feed_likes fl WHERE fl.post_id = p.id AND fl.user_id = $${idx})) END AS liked_by_user,
          COUNT(*) OVER() as total_count
        FROM feed_posts p
        WHERE ${where.join(' AND ')}
        ORDER BY p.data_criacao DESC
        LIMIT $${idx + 1}
        OFFSET $${idx + 2}
      `;
      params.push(filters?.userId || null, limit, offset);

      const result = await this.pool.query(sql, params);
      const posts = formatArrayDates(result.rows, ['data_criacao', 'data_atualizacao']);
      const total = parseInt(result.rows[0]?.total_count || '0', 10);

      return { data: posts, pagination: { page, limit, total } };
    } catch (error) {
      loggerService.error('Erro ao listar posts:', { error });
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
        validatedData.conteudo || '',
        validatedData.autor_id,
        validatedData.autor_nome || 'Usuário',
        validatedData.imagem_url
      ]);

      const post = formatObjectDates(result.rows[0], ['data_criacao', 'data_atualizacao']);

      // Invalidar cache de posts
      await this.redis.del('feed:posts');

      // Notificar WebSocket via Postgres
      try {
        const payload = JSON.stringify({ type: 'new_post', post });
        await this.pool.query("SELECT pg_notify('feed_notifications', $1)", [payload]);
      } catch (e) {
        // log mínimo, não quebra fluxo
        console.error('Erro ao notificar novo post:', (e as any)?.message || e);
      }

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

      // Notificar atualização de like genérica (sem usuário)
      try {
        const payload = JSON.stringify({ type: 'like_update', post_id: postId, likes_count: result.rows[0].curtidas, user_id: null, action: 'like' });
        await this.pool.query("SELECT pg_notify('feed_notifications', $1)", [payload]);
      } catch {}

      return { curtidas: result.rows[0].curtidas };
    } catch (error) {
      console.error('Erro ao curtir post:', error);
      throw error;
    }
  }

  async toggleLike(postId: number, userId: string, userName?: string): Promise<{ curtidas: number; liked: boolean }> {
    try {
      const exists = await this.pool.query('SELECT 1 FROM feed_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
      let liked = false;
      if (exists.rows.length > 0) {
        await this.pool.query('DELETE FROM feed_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
        await this.pool.query('UPDATE feed_posts SET curtidas = GREATEST(curtidas - 1, 0), data_atualizacao = CURRENT_TIMESTAMP WHERE id = $1', [postId]);
        liked = false;
      } else {
        await this.pool.query('INSERT INTO feed_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [postId, userId]);
        await this.pool.query('UPDATE feed_posts SET curtidas = curtidas + 1, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $1', [postId]);
        liked = true;
      }

      const cur = await this.pool.query('SELECT curtidas, autor_id FROM feed_posts WHERE id = $1', [postId]);
      const curtidas = cur.rows[0]?.curtidas || 0;
      const autorId = cur.rows[0]?.autor_id;

      await this.redis.del('feed:posts');

      try {
        const payload = JSON.stringify({
          type: 'like_update',
          post_id: postId,
          likes_count: curtidas,
          user_id: userId,
          userName: userName || 'Usuário',
          autor_id: autorId,
          action: liked ? 'like' : 'unlike'
        });
        await this.pool.query("SELECT pg_notify('feed_notifications', $1)", [payload]);
      } catch {}

      return { curtidas, liked };
    } catch (error) {
      console.error('Erro ao alternar like:', error);
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

  async listComments(postId: number, limit = 20, page = 1): Promise<{ data: FeedComment[]; pagination: { page: number; limit: number; total: number } }> {
    try {
      const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
      const result = await this.pool.query(`
        SELECT 
          c.id, c.post_id, c.autor_id, c.autor_nome, c.autor_foto,
          c.conteudo, c.data_criacao, c.data_atualizacao,
          COUNT(*) OVER() as total_count
        FROM comentarios_feed c
        WHERE c.post_id = $1 AND c.ativo = true
        ORDER BY c.data_criacao ASC
        LIMIT $2 OFFSET $3
      `, [postId, limit, offset]);

      const comments = formatArrayDates(result.rows, ['data_criacao', 'data_atualizacao']);
      const total = parseInt(result.rows[0]?.total_count || '0', 10);
      return { data: comments, pagination: { page, limit, total } };
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
        (validatedData.conteudo || '').trim()
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

      // Notificar novo comentário
      try {
        const payload = JSON.stringify({ type: 'new_comment', post_id: validatedData.post_id, comment });
        await this.pool.query("SELECT pg_notify('feed_notifications', $1)", [payload]);
      } catch {}

      return comment;
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      throw new Error('Erro ao criar novo comentário');
    }
  }

  async updateComment(commentId: number, conteudo: string, userId: string, userRole: string) {
    const c = await this.pool.query('SELECT * FROM comentarios_feed WHERE id = $1 AND ativo = true', [commentId]);
    if (c.rows.length === 0) {
      const err: any = new Error('Comentário não encontrado');
      err.status = 404;
      throw err;
    }
    const comment = c.rows[0];
    if (String(comment.autor_id) !== String(userId) && !['super_admin', 'superadmin'].includes(userRole)) {
      const err: any = new Error('Sem permissão para editar comentário');
      err.status = 403;
      throw err;
    }
    const upd = await this.pool.query(
      'UPDATE comentarios_feed SET conteudo = $1, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [conteudo.trim(), commentId]
    );
    await this.redis.del(`feed:comments:${comment.post_id}`);
    return upd.rows[0];
  }

  async deleteComment(commentId: number, userId: string, userRole: string) {
    const c = await this.pool.query('SELECT * FROM comentarios_feed WHERE id = $1 AND ativo = true', [commentId]);
    if (c.rows.length === 0) {
      const err: any = new Error('Comentário não encontrado');
      err.status = 404;
      throw err;
    }
    const comment = c.rows[0];
    if (String(comment.autor_id) !== String(userId) && !['super_admin', 'superadmin'].includes(userRole)) {
      const err: any = new Error('Sem permissão para excluir comentário');
      err.status = 403;
      throw err;
    }
    await this.pool.query('UPDATE comentarios_feed SET ativo = false, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $1', [commentId]);
    await this.pool.query('UPDATE feed_posts SET comentarios = GREATEST(comentarios - 1, 0), data_atualizacao = CURRENT_TIMESTAMP WHERE id = $1', [comment.post_id]);
    await this.redis.del(`feed:comments:${comment.post_id}`);
    await this.redis.del('feed:posts');
    return { success: true };
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
      // Notificar remoção de post
      try {
        const payload = JSON.stringify({ type: 'post_deleted', post_id: postId });
        await this.pool.query("SELECT pg_notify('feed_notifications', $1)", [payload]);
      } catch {}
    } catch (error) {
      console.error('Erro ao excluir post:', error);
      throw error;
    }
  }
}
