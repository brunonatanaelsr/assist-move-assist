import { Router, Request, Response } from 'express';
import redis from '../lib/redis';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { uploadSingle, UPLOAD_DIR } from '../middleware/upload';
import { FeedService } from '../services/feed.service';
import { pool } from '../config/database';
import { loggerService } from '../services/logger';
import { catchAsync } from '../middleware/errorHandler';

const router = Router();

const feedService = new FeedService(pool, redis as any);

interface ExtendedRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

// Upload de imagem
router.post(
  '/upload-image',
  authenticateToken,
  uploadSingle('image'),
  catchAsync(async (req: ExtendedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json(errorResponse('Nenhuma imagem foi enviada'));
      }

      // URL autenticada via API para servir imagens
      const imageUrl = `/api/feed/images/${req.file.filename}`;
      return res.json(successResponse({ url: imageUrl }));
    } catch (error) {
      loggerService.error('Erro no upload:', error);
      return res.status(500).json(errorResponse('Erro ao fazer upload da imagem'));
    }
  })
);

// Servir imagem de feed (somente imagens) de forma autenticada
router.get(
  '/images/:filename',
  authenticateToken,
  catchAsync(async (req: ExtendedRequest, res: Response) => {
    try {
      const { filename } = req.params as any;
      // Prevenir path traversal
      const safe = require('path').basename(String(filename));
      if (safe !== filename) {
        return res.status(400).json(errorResponse('Nome de arquivo inválido'));
      }

      // Validar extensão permitida
      const ext = (safe.split('.').pop() || '').toLowerCase();
      const allowed = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      if (!allowed.includes(ext)) {
        return res.status(400).json(errorResponse('Extensão de arquivo não permitida'));
      }

      const path = require('path');
      const fs = require('fs');
      const filePath = path.join(UPLOAD_DIR, safe);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json(errorResponse('Arquivo não encontrado'));
      }

      // Mapear content-type
      const mime: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp'
      };
      res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
      return res.sendFile(filePath);
    } catch (error) {
      loggerService.error('Erro ao servir imagem de feed', error);
      return res.status(500).json(errorResponse('Erro ao servir imagem'));
    }
  })
);

// Listar posts
router.get(
  '/',
  authenticateToken,
  catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const limit = parseInt((req.query.limit as string) || '10');
      const page = parseInt((req.query.page as string) || '1');
      const tipo = (req.query.tipo as string) || undefined;
      const autorId = (req.query.autor_id as string) || undefined;
      const userId = String(((req as any).user?.id ?? ''));
      const result = await feedService.listPosts(limit, page, { tipo, autorId, userId });
      return res.json(successResponse(result));
    } catch (error) {
      loggerService.error('Erro ao listar posts:', error);
      return res.status(500).json(errorResponse('Erro ao listar posts'));
    }
  })
);

// Obter post por ID
router.get(
  '/:id',
  authenticateToken,
  catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as any;
      const post = await feedService.getPostById(parseInt(String(id)));
      if (!post) return res.status(404).json(errorResponse('Post não encontrado'));
      return res.json(successResponse(post));
    } catch (error) {
      loggerService.error('Erro ao obter post:', error);
      return res.status(500).json(errorResponse('Erro ao obter post'));
    }
  })
);

// Criar post
router.post(
  '/',
  authenticateToken,
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
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
      loggerService.error('Erro ao criar post:', error);
      return res.status(500).json(errorResponse('Erro ao criar post'));
    }
  })
);

// Curtir post
router.post(
  '/:id/curtir',
  authenticateToken,
  catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as any;
      const userId = String(((req as any).user?.id ?? ''));
      const userName = ((req as any).user?.nome as string) || 'Usuário';
      const result = await feedService.toggleLike(parseInt(String(id)), userId, userName);
      return res.json(successResponse({ curtidas: result.curtidas, liked: result.liked }));
    } catch (error) {
      loggerService.error('Erro ao curtir post:', error);
      return res.status(500).json(errorResponse('Erro ao curtir post'));
    }
  })
);

// Compartilhar post
router.post(
  '/:id/compartilhar',
  authenticateToken,
  catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as any;
      const userId = String(((req as any).user?.id ?? ''));

      await (feedService as any).sharePost?.(parseInt(String(id)), userId);
      return res.json(successResponse({ message: 'Post compartilhado com sucesso' }));
    } catch (error) {
      loggerService.error('Erro ao compartilhar post:', error);
      return res.status(500).json(errorResponse('Erro ao compartilhar post'));
    }
  })
);

// Estatísticas do feed
router.get(
  '/stats/summary',
  authenticateToken,
  catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const stats = await feedService.getFeedStats();
      return res.json(successResponse(stats));
    } catch (error) {
      loggerService.error('Erro ao obter estatísticas:', error);
      return res.status(500).json(errorResponse('Erro ao obter estatísticas'));
    }
  })
);

// Listar comentários de um post
router.get(
  '/:postId/comentarios',
  authenticateToken,
  catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { postId } = req.params as any;
      const limit = parseInt((req.query.limit as string) || '20');
      const page = parseInt((req.query.page as string) || '1');
      const comentarios = await feedService.listComments(parseInt(String(postId)), limit, page);
      return res.json(successResponse(comentarios));
    } catch (error) {
      loggerService.error('Erro ao listar comentários:', error);
      return res.status(500).json(errorResponse('Erro ao listar comentários'));
    }
  })
);

// Adicionar comentário
router.post(
  '/:postId/comentarios',
  authenticateToken,
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
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
      loggerService.error('Erro ao adicionar comentário:', error);
      return res.status(500).json(errorResponse('Erro ao adicionar comentário'));
    }
  })
);

// Atualizar comentário
router.put(
  '/comentarios/:id',
  authenticateToken,
  catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
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
  })
);

// Remover comentário
router.delete(
  '/comentarios/:id',
  authenticateToken,
  catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
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
  })
);

// Deletar post (soft delete)
router.delete(
  '/:id',
  authenticateToken,
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as any;
      await feedService.deletePost(parseInt(String(id)), String((req as any).user?.id || ''), String((req as any).user?.role || ''));
      return res.json(successResponse({ message: 'Post removido com sucesso' }));
    } catch (error) {
      loggerService.error('Erro ao deletar post:', error);
      return res.status(500).json(errorResponse('Erro ao deletar post'));
    }
  })
);

// Atualizar post
router.put(
  '/:id',
  authenticateToken,
  catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
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
  })
);

export default router;
