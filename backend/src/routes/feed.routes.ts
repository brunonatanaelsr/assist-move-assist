import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { authenticateToken } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { uploadMiddleware } from '../middleware/upload';
import { FeedService } from '../services/feed.service';

const router = express.Router();

// Inicialização do pool e redis
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '15002031',
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0
});

const feedService = new FeedService(pool, redis);

// ====== ROTAS DE POSTS ======

// Upload de imagem para posts
router.post('/upload-image', authenticateToken, uploadMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse('Nenhum arquivo foi enviado'));
    }

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
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const posts = await feedService.listPosts(limit);
    res.json(successResponse(posts, 'Posts obtidos com sucesso'));
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Criar novo post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { tipo, titulo, conteudo, imagem_url } = req.body;
    const autor_id = req.user.id;
    const autor_nome = req.user.name;

    const post = await feedService.createPost({
      tipo,
      titulo,
      conteudo,
      autor_id,
      autor_nome,
      imagem_url
    });

    res.status(201).json(successResponse(post, 'Post criado com sucesso'));
  } catch (error: any) {
    console.error('Erro ao criar post:', error);
    res.status(error.status || 500).json(errorResponse(error.message));
  }
});

// Curtir post
router.post('/:id/curtir', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await feedService.likePost(parseInt(id));
    res.json(successResponse(result, 'Post curtido'));
  } catch (error: any) {
    console.error('Erro ao curtir post:', error);
    if (error.message === 'Post não encontrado') {
      res.status(404).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Erro interno do servidor'));
    }
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
    const stats = await feedService.getFeedStats();
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
    const comments = await feedService.listComments(parseInt(postId));
    res.json(successResponse(comments, 'Comentários obtidos'));
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
    const autorNome = req.user.name;
    const autorFoto = req.user.profile_photo;

    const comment = await feedService.createComment({
      post_id: parseInt(postId),
      autor_id: autorId,
      autor_nome: autorNome,
      autor_foto: autorFoto,
      conteudo
    });

    res.status(201).json(successResponse(comment, 'Comentário criado'));
  } catch (error: any) {
    console.error('Erro ao criar comentário:', error);
    res.status(error.status || 500).json(errorResponse(error.message));
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

    const post = await feedService.updatePost(
      parseInt(postId),
      { tipo, titulo, conteudo, imagem_url },
      userId,
      userRole
    );

    res.json(successResponse(post, 'Post atualizado com sucesso'));
  } catch (error: any) {
    console.error('Erro ao editar post:', error);
    if (error.message === 'Post não encontrado') {
      res.status(404).json(errorResponse(error.message));
    } else if (error.message === 'Sem permissão para editar este post') {
      res.status(403).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Erro interno do servidor'));
    }
  }
});

// ====== ROTAS DE EXCLUSÃO ======

// Excluir post (soft delete)
router.delete('/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    await feedService.deletePost(parseInt(postId), userId, userRole);
    res.json(successResponse(null, 'Post excluído com sucesso'));
  } catch (error: any) {
    console.error('Erro ao excluir post:', error);
    if (error.message === 'Post não encontrado') {
      res.status(404).json(errorResponse(error.message));
    } else if (error.message === 'Sem permissão para excluir este post') {
      res.status(403).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Erro interno do servidor'));
    }
  }
});

export default router;
