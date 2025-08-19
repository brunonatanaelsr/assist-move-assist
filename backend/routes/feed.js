const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { formatArrayDates, formatObjectDates } = require('../utils/dateFormatter');
const { uploadMiddleware } = require('../middleware/upload');
const { pool } = require('../config/database');

// ====== ROTAS DE POSTS ======

// Upload de imagem para posts
router.post('/upload-image', authenticateToken, uploadMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse('Nenhum arquivo foi enviado'));
    }

    // Retornar URL da imagem
    const imageUrl = `/uploads/images/${req.file.filename}`;

    res.json(successResponse({
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: imageUrl
    }, 'Imagem enviada com sucesso'));

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Listar posts do feed
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Iniciando busca de posts do feed...');
    
    const result = await pool.query(`
      SELECT 
        id, tipo, titulo, conteudo, autor_nome, curtidas, comentarios, ativo, data_criacao
      FROM feed_posts 
      WHERE ativo = true
      ORDER BY data_criacao DESC
      LIMIT 10
    `);
    
    console.log('Posts encontrados:', result.rows.length);

    res.json(successResponse(
      result.rows,
      'Posts obtidos com sucesso'
    ));
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Criar novo post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { tipo, titulo, conteudo, autor_nome, imagem_url } = req.body;
    const autor_id = req.user.id;

    if (!tipo || !titulo || !conteudo) {
      return res.status(400).json(errorResponse('Tipo, título e conteúdo são obrigatórios'));
    }

    const result = await pool.query(`
      INSERT INTO feed_posts (tipo, titulo, conteudo, autor_id, autor_nome, imagem_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [tipo, titulo, conteudo, autor_id, autor_nome || 'Usuário', imagem_url]);

    res.status(201).json(successResponse(formatObjectDates(result.rows[0], ['data_criacao', 'data_atualizacao']), 'Post criado com sucesso'));
  } catch (error) {
    console.error('Erro ao criar post:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Curtir post
router.post('/:id/curtir', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE feed_posts 
      SET curtidas = curtidas + 1, data_atualizacao = CURRENT_TIMESTAMP
      WHERE id = $1 AND ativo = true
      RETURNING curtidas
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Post não encontrado'));
    }

    res.json(successResponse({ curtidas: result.rows[0].curtidas }, 'Post curtido'));
  } catch (error) {
    console.error('Erro ao curtir post:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Compartilhar post
router.post('/:id/compartilhar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    res.json(successResponse({ shared: true, post_id: parseInt(id) }, 'Post compartilhado'));
  } catch (error) {
    console.error('Erro ao compartilhar post:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Estatísticas do feed
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const statsQuery = await pool.query(`
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
    
    res.json(successResponse(stats, 'Estatísticas obtidas'));
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// ====== ROTAS DE COMENTÁRIOS ======

// Listar comentários de um post
router.get('/:postId/comentarios', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const result = await pool.query(`
      SELECT 
        c.id, c.post_id, c.autor_id, c.autor_nome, c.autor_foto, 
        c.conteudo, c.data_criacao, c.data_atualizacao
      FROM comentarios_feed c
      WHERE c.post_id = $1 AND c.ativo = true
      ORDER BY c.data_criacao ASC
    `, [postId]);

    res.json(successResponse(formatArrayDates(result.rows, ['data_criacao', 'data_atualizacao']), 'Comentários obtidos'));
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Criar novo comentário
router.post('/:postId/comentarios', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { conteudo } = req.body;
    const autorId = req.user.id;
    const autorNome = req.user.name || 'Usuário';

    if (!conteudo?.trim()) {
      return res.status(400).json(errorResponse('Conteúdo é obrigatório'));
    }

    // Inserir comentário
    const result = await pool.query(`
      INSERT INTO comentarios_feed (post_id, autor_id, autor_nome, conteudo)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [postId, autorId, autorNome, conteudo.trim()]);

    // Atualizar contador no post
    await pool.query(`
      UPDATE feed_posts 
      SET comentarios = comentarios + 1, data_atualizacao = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [postId]);

    res.status(201).json(successResponse(formatObjectDates(result.rows[0], ['data_criacao', 'data_atualizacao']), 'Comentário criado'));
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// ====== ROTAS DE EDIÇÃO ======

// Editar post
router.put('/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { tipo, titulo, conteudo, imagem_url } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validação dos campos obrigatórios
    if (!titulo?.trim() || !conteudo?.trim()) {
      return res.status(400).json(errorResponse('Título e conteúdo são obrigatórios'));
    }

    if (!['anuncio', 'evento', 'noticia', 'conquista'].includes(tipo)) {
      return res.status(400).json(errorResponse('Tipo inválido'));
    }

    // Verificar se o post existe
    const postQuery = await pool.query('SELECT * FROM feed_posts WHERE id = $1 AND ativo = true', [postId]);
    
    if (postQuery.rows.length === 0) {
      return res.status(404).json(errorResponse('Post não encontrado'));
    }

    const post = postQuery.rows[0];

    // Verificar permissões: só o autor ou super_admin podem editar
    if (post.autor_id !== userId && userRole !== 'super_admin' && userRole !== 'superadmin') {
      return res.status(403).json(errorResponse('Sem permissão para editar este post'));
    }

    // Atualizar post
    const result = await pool.query(`
      UPDATE feed_posts 
      SET tipo = $1, titulo = $2, conteudo = $3, imagem_url = $4, data_atualizacao = CURRENT_TIMESTAMP
      WHERE id = $5 AND ativo = true
      RETURNING *
    `, [tipo, titulo.trim(), conteudo.trim(), imagem_url || null, postId]);

    res.json(successResponse(formatObjectDates(result.rows[0], ['data_criacao', 'data_atualizacao']), 'Post atualizado com sucesso'));
  } catch (error) {
    console.error('Erro ao editar post:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// ====== ROTAS DE EXCLUSÃO ======

// Excluir post (soft delete)
router.delete('/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verificar se o post existe
    const postQuery = await pool.query('SELECT * FROM feed_posts WHERE id = $1 AND ativo = true', [postId]);
    
    if (postQuery.rows.length === 0) {
      return res.status(404).json(errorResponse('Post não encontrado'));
    }

    const post = postQuery.rows[0];

    // Verificar permissões: só o autor ou super_admin podem excluir
    if (post.autor_id !== userId && userRole !== 'super_admin' && userRole !== 'superadmin') {
      return res.status(403).json(errorResponse('Sem permissão para excluir este post'));
    }

    // Soft delete - marcar como inativo
    await pool.query(`
      UPDATE feed_posts 
      SET ativo = false, data_atualizacao = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [postId]);

    // Também desativar os comentários do post
    await pool.query(`
      UPDATE comentarios_feed 
      SET ativo = false, data_atualizacao = CURRENT_TIMESTAMP
      WHERE post_id = $1
    `, [postId]);

    res.json(successResponse(null, 'Post excluído com sucesso'));
  } catch (error) {
    console.error('Erro ao excluir post:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

module.exports = router;
