const pool = require('./index');

const feedDB = {
  async findAll({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT 
        p.id,
        p.conteudo,
        p.tipo,
        p.data_criacao,
        u.nome as autor_nome,
        u.avatar as autor_avatar,
        (SELECT COUNT(*) FROM curtidas c WHERE c.post_id = p.id) as curtidas,
        (SELECT COUNT(*) FROM comentarios c WHERE c.post_id = p.id) as comentarios,
        (SELECT ARRAY_AGG(tag) FROM post_tags pt WHERE pt.post_id = p.id) as tags
      FROM posts p
      INNER JOIN usuarios u ON u.id = p.autor_id
      ORDER BY p.data_criacao DESC
      LIMIT $1 OFFSET $2
    `;
    
    const { rows } = await pool.query(query, [limit, offset]);
    
    const countQuery = 'SELECT COUNT(*) FROM posts';
    const { rows: [{ count }] } = await pool.query(countQuery);
    
    return {
      data: rows,
      pagination: {
        total: parseInt(count),
        pages: Math.ceil(count / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    };
  },

  async create(post) {
    const {
      conteudo, tipo, autor_id, tags = []
    } = post;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Criar post
      const postQuery = `
        INSERT INTO posts (conteudo, tipo, autor_id, data_criacao)
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `;
      const { rows: [newPost] } = await client.query(postQuery, [
        conteudo, tipo, autor_id
      ]);

      // Adicionar tags
      if (tags.length > 0) {
        const tagQuery = `
          INSERT INTO post_tags (post_id, tag)
          VALUES ($1, UNNEST($2::text[]))
        `;
        await client.query(tagQuery, [newPost.id, tags]);
      }

      await client.query('COMMIT');
      return newPost;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;

    } finally {
      client.release();
    }
  },

  async addComment(comentario) {
    const {
      post_id, autor_id, conteudo
    } = comentario;

    const query = `
      INSERT INTO comentarios (post_id, autor_id, conteudo, data_criacao)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;

    const { rows } = await pool.query(query, [post_id, autor_id, conteudo]);
    return rows[0];
  },

  async toggleLike(post_id, usuario_id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar se já curtiu
      const checkQuery = `
        SELECT id FROM curtidas
        WHERE post_id = $1 AND usuario_id = $2
      `;
      const { rows } = await client.query(checkQuery, [post_id, usuario_id]);

      if (rows.length > 0) {
        // Remover curtida
        const deleteQuery = `
          DELETE FROM curtidas
          WHERE post_id = $1 AND usuario_id = $2
          RETURNING *
        `;
        const { rows: [deleted] } = await client.query(deleteQuery, [post_id, usuario_id]);
        await client.query('COMMIT');
        return { action: 'unliked', curtida: deleted };
      } else {
        // Adicionar curtida
        const insertQuery = `
          INSERT INTO curtidas (post_id, usuario_id, data_criacao)
          VALUES ($1, $2, NOW())
          RETURNING *
        `;
        const { rows: [created] } = await client.query(insertQuery, [post_id, usuario_id]);
        await client.query('COMMIT');
        return { action: 'liked', curtida: created };
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;

    } finally {
      client.release();
    }
  }
};

module.exports = feedDB;
