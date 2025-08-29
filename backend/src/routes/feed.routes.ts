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
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const limit = parseInt((req.query.limit as string) || '10');
      const posts = await feedService.listPosts(limit);
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
      const autor_id = (req as any).user?.id as string | number | undefined;
      const autor_nome = ((req as any).user?.nome as string) || 'Usuário';

      const post = await feedService.createPost({
        tipo,
        titulo,
        conteudo,
        autor_id: (autor_id ?? ''),
        autor_nome,
        imagem_url,
        ativo: true
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
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as any;
      const post = await feedService.likePost(parseInt(String(id)));
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
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as any;
      const userId = String(((req as any).user?.id ?? ''));

      await (feedService as any).sharePost?.(parseInt(String(id)), userId);
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
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const stats = await feedService.getFeedStats();
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
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { postId } = req.params as any;
      const comentarios = await feedService.listComments(parseInt(String(postId)));
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
      const { postId } = req.params as any;
      const { conteudo } = req.body;
      const autorId = (req as any).user?.id as string | number | undefined;
      const autorNome = ((req as any).user?.nome as string) || 'Usuário';
      const autorFoto = (req as any).user?.avatar_url as string | undefined;

      const comment = await feedService.createComment({
        post_id: parseInt(String(postId)),
        autor_id: (autorId ?? ''),
        autor_nome: autorNome,
        autor_foto: autorFoto || null,
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
      const { id } = req.params as any;
      await feedService.deletePost(parseInt(String(id)), String((req as any).user?.id || ''), String((req as any).user?.role || ''));
      return res.json(successResponse({ message: 'Post removido com sucesso' }));
    } catch (error) {
      console.error('Erro ao deletar post:', error);
      return res.status(500).json(errorResponse('Erro ao deletar post'));
    }
  }
);

export default router;
