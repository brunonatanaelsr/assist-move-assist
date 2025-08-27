import { Pool } from 'pg';
import { WebSocketServer } from '../websocket/server';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

interface CreatePostData {
  titulo: string;
  conteudo: string;
  tipo?: 'post' | 'anuncio' | 'evento';
  anexo_url?: string;
  autor_id: string;
}

export class FeedService {
  constructor(
    private pool: Pool,
    private ws: WebSocketServer
  ) {}

  async createPost(data: CreatePostData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO feed_posts (
          titulo, conteudo, tipo, anexo_url, autor_id
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          data.titulo,
          data.conteudo,
          data.tipo || 'post',
          data.anexo_url,
          data.autor_id
        ]
      );

      const post = result.rows[0];

      // Buscar informações do autor
      const autorResult = await client.query(
        'SELECT nome, email FROM users WHERE id = $1',
        [data.autor_id]
      );

      await client.query('COMMIT');

      const postWithAuthor = {
        ...post,
        autor: autorResult.rows[0]
      };

      return postWithAuthor;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getFeed(page = 1, limit = 10, options: {
    tipo?: string;
    autor_id?: string;
    search?: string;
  } = {}) {
    const offset = (page - 1) * limit;
    const params: any[] = [limit, offset];
    let paramCount = 2;

    let query = `
      SELECT 
        p.*,
        u.nome as autor_nome,
        u.email as autor_email,
        COUNT(DISTINCT c.id) as comentarios_count,
        COUNT(DISTINCT l.id) as likes_count,
        EXISTS(
          SELECT 1 
          FROM feed_likes l2 
          WHERE l2.post_id = p.id 
          AND l2.user_id = $${++paramCount}
        ) as liked_by_user
      FROM feed_posts p
      JOIN users u ON p.autor_id = u.id
      LEFT JOIN feed_comments c ON c.post_id = p.id
      LEFT JOIN feed_likes l ON l.post_id = p.id
      WHERE 1=1
    `;

    params.push(options.autor_id || null);

    if (options.tipo) {
      query += ` AND p.tipo = $${++paramCount}`;
      params.push(options.tipo);
    }

    if (options.autor_id) {
      query += ` AND p.autor_id = $${++paramCount}`;
      params.push(options.autor_id);
    }

    if (options.search) {
      query += ` AND (
        p.titulo ILIKE $${++paramCount} 
        OR p.conteudo ILIKE $${++paramCount}
      )`;
      const searchTerm = `%${options.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += `
      GROUP BY p.id, u.nome, u.email
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await this.pool.query(query, params);

    // Buscar total de registros
    const countQuery = `
      SELECT COUNT(*) FROM feed_posts p
      WHERE 1=1
      ${options.tipo ? 'AND p.tipo = $1' : ''}
      ${options.autor_id ? 'AND p.autor_id = $2' : ''}
    `;

    const countParams = [];
    if (options.tipo) countParams.push(options.tipo);
    if (options.autor_id) countParams.push(options.autor_id);

    const countResult = await this.pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      posts: result.rows,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  async getPostDetails(postId: string, userId: string) {
    const result = await this.pool.query(
      `SELECT 
        p.*,
        u.nome as autor_nome,
        u.email as autor_email,
        COUNT(DISTINCT c.id) as comentarios_count,
        COUNT(DISTINCT l.id) as likes_count,
        EXISTS(
          SELECT 1 
          FROM feed_likes l2 
          WHERE l2.post_id = p.id 
          AND l2.user_id = $2
        ) as liked_by_user,
        (
          SELECT json_agg(
            json_build_object(
              'id', c.id,
              'conteudo', c.conteudo,
              'created_at', c.created_at,
              'autor', json_build_object(
                'id', u2.id,
                'nome', u2.nome,
                'email', u2.email
              )
            )
          )
          FROM feed_comments c
          JOIN users u2 ON c.autor_id = u2.id
          WHERE c.post_id = p.id
          ORDER BY c.created_at DESC
        ) as comentarios
      FROM feed_posts p
      JOIN users u ON p.autor_id = u.id
      LEFT JOIN feed_comments c ON c.post_id = p.id
      LEFT JOIN feed_likes l ON l.post_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, u.id, u.nome, u.email`,
      [postId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Post não encontrado', 404);
    }

    // Incrementar visualizações
    await this.pool.query(
      'UPDATE feed_posts SET visualizacoes = visualizacoes + 1 WHERE id = $1',
      [postId]
    );

    return result.rows[0];
  }

  async addComment(postId: string, userId: string, conteudo: string) {
    const result = await this.pool.query(
      `INSERT INTO feed_comments (post_id, autor_id, conteudo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [postId, userId, conteudo]
    );

    return result.rows[0];
  }

  async toggleLike(postId: string, userId: string) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verificar se já curtiu
      const exists = await client.query(
        'SELECT id FROM feed_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );

      if (exists.rows.length > 0) {
        await client.query(
          'DELETE FROM feed_likes WHERE post_id = $1 AND user_id = $2',
          [postId, userId]
        );
      } else {
        await client.query(
          'INSERT INTO feed_likes (post_id, user_id) VALUES ($1, $2)',
          [postId, userId]
        );
      }

      await client.query('COMMIT');
      return { liked: exists.rows.length === 0 };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePost(postId: string, userId: string) {
    const result = await this.pool.query(
      `DELETE FROM feed_posts 
       WHERE id = $1 AND autor_id = $2
       RETURNING id`,
      [postId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Post não encontrado ou sem permissão', 404);
    }
  }
}
