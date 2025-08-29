import { Router, Request, Response } from 'express';
import Redis from 'ioredis';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { uploadSingle } from '../middleware/upload';
import { FeedService } from '../services/feed.service';
import { pool } from '../config/database';

const router = Router();

// Inicialização do Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  enableReadyCheck: true,
});

const feedService = new FeedService(pool, redis);

interface ExtendedRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

// Upload de imagem
router.post(
  '/upload-image',
  authenticateToken,
  uploadSingle('image'),
  async (req: ExtendedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json(errorResponse('Nenhuma imagem foi enviada'));
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      return res.json(successResponse({ url: imageUrl }));
    } catch (error) {
      console.error('Erro no upload:', error);
      return res.status(500).json(errorResponse('Erro ao fazer upload da imagem'));
    }
  }
);

// Listar posts
router.get(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const posts = await feedService.getPosts(page, limit);
      return res.json(successResponse(posts));
    } catch (error) {
      console.error('Erro ao listar posts:', error);
      return res.status(500).json(errorResponse('Erro ao listar posts'));
    }
  }
);

// Criar post
router.post(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tipo, titulo, conteudo, imagem_url } = req.body;
      const autor_id = req.user?.id;
      const autor_nome = req.user?.nome || 'Usuário';

      const post = await feedService.createPost({
        tipo,
        titulo,
        conteudo,
        autor_id,
        autor_nome,
        imagem_url,
        ativo: true,
        curtidas: 0,
        comentarios: 0
      });

      return res.status(201).json(successResponse(post));
    } catch (error) {
      console.error('Erro ao criar post:', error);
      return res.status(500).json(errorResponse('Erro ao criar post'));
    }
  }
);

// Curtir post
router.post(
  '/:id/curtir',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const post = await feedService.likePost(parseInt(id), userId as string);
      return res.json(successResponse(post));
    } catch (error) {
      console.error('Erro ao curtir post:', error);
      return res.status(500).json(errorResponse('Erro ao curtir post'));
    }
  }
);

// Compartilhar post
router.post(
  '/:id/compartilhar',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      await feedService.sharePost(parseInt(id), userId as string);
      return res.json(successResponse({ message: 'Post compartilhado com sucesso' }));
    } catch (error) {
      console.error('Erro ao compartilhar post:', error);
      return res.status(500).json(errorResponse('Erro ao compartilhar post'));
    }
  }
);

// Estatísticas do feed
router.get(
  '/stats/summary',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await feedService.getStats();
      return res.json(successResponse(stats));
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return res.status(500).json(errorResponse('Erro ao obter estatísticas'));
    }
  }
);

// Listar comentários de um post
router.get(
  '/:postId/comentarios',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { postId } = req.params;
      const comentarios = await feedService.getComments(parseInt(postId));
      return res.json(successResponse(comentarios));
    } catch (error) {
      console.error('Erro ao listar comentários:', error);
      return res.status(500).json(errorResponse('Erro ao listar comentários'));
    }
  }
);

// Adicionar comentário
router.post(
  '/:postId/comentarios',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { postId } = req.params;
      const { conteudo } = req.body;
      const autorId = req.user?.id;
      const autorNome = req.user?.nome || 'Usuário';
      const autorFoto = req.user?.avatar_url;

      const comment = await feedService.createComment({
        post_id: parseInt(postId),
        autor_id: autorId,
        autor_nome: autorNome,
        autor_foto: autorFoto,
        conteudo,
        ativo: true
      });

      return res.status(201).json(successResponse(comment));
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      return res.status(500).json(errorResponse('Erro ao adicionar comentário'));
    }
  }
);

// Deletar post (soft delete)
router.delete(
  '/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      await feedService.deletePost(parseInt(id), userId as string);
      return res.json(successResponse({ message: 'Post removido com sucesso' }));
    } catch (error) {
      console.error('Erro ao deletar post:', error);
      return res.status(500).json(errorResponse('Erro ao deletar post'));
    }
  }
);

export default router;
