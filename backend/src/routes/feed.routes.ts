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
      const page = parseInt((req.query.page as string) || '1');
      const tipo = (req.query.tipo as string) || undefined;
      const autorId = (req.query.autor_id as string) || undefined;
      const userId = String(((req as any).user?.id ?? ''));
      const result = await feedService.listPosts(limit, page, { tipo, autorId, userId });
      return res.json(successResponse(result));
    } catch (error) {
      console.error('Erro ao listar posts:', error);
      return res.status(500).json(errorResponse('Erro ao listar posts'));
    }
  }
);

// Obter post por ID
router.get(
  '/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as any;
      const post = await feedService.getPostById(parseInt(String(id)));
      if (!post) return res.status(404).json(errorResponse('Post não encontrado'));
      return res.json(successResponse(post));
    } catch (error) {
      console.error('Erro ao obter post:', error);
      return res.status(500).json(errorResponse('Erro ao obter post'));
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
      const userId = String(((req as any).user?.id ?? ''));
      const userName = ((req as any).user?.nome as string) || 'Usuário';
      const result = await feedService.toggleLike(parseInt(String(id)), userId, userName);
      return res.json(successResponse({ curtidas: result.curtidas, liked: result.liked }));
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
      const limit = parseInt((req.query.limit as string) || '20');
      const page = parseInt((req.query.page as string) || '1');
      const comentarios = await feedService.listComments(parseInt(String(postId)), limit, page);
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

// Atualizar comentário
router.put(
  '/comentarios/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as any;
      const { conteudo } = req.body || {};
      if (!conteudo || !String(conteudo).trim()) {
        return res.status(400).json(errorResponse('Conteúdo é obrigatório'));
      }
      const userId = String(((req as any).user?.id ?? ''));
      const userRole = String(((req as any).user?.role ?? (req as any).user?.papel ?? ''));
      const updated = await feedService.updateComment(parseInt(String(id)), String(conteudo), userId, userRole);
      return res.json(successResponse(updated));
    } catch (error: any) {
      const status = error?.status || 500;
      return res.status(status).json(errorResponse(error?.message || 'Erro ao atualizar comentário'));
    }
  }
);

// Remover comentário
router.delete(
  '/comentarios/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as any;
      const userId = String(((req as any).user?.id ?? ''));
      const userRole = String(((req as any).user?.role ?? (req as any).user?.papel ?? ''));
      await feedService.deleteComment(parseInt(String(id)), userId, userRole);
      return res.status(204).end();
    } catch (error: any) {
      const status = error?.status || 500;
      return res.status(status).json(errorResponse(error?.message || 'Erro ao remover comentário'));
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

// Atualizar post
router.put(
  '/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as any;
      const userId = String(((req as any).user?.id ?? ''));
      const userRole = String(((req as any).user?.role ?? (req as any).user?.papel ?? ''));
      const updated = await feedService.updatePost(parseInt(String(id)), req.body || {}, userId, userRole);
      return res.json(successResponse(updated));
    } catch (error: any) {
      const status = error?.status || 500;
      return res.status(status).json(errorResponse(error?.message || 'Erro ao atualizar post'));
    }
  }
);

export default router;
