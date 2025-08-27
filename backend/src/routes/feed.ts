import { Router } from 'express';
import { uploadMiddleware } from '../middleware/upload';
import { Request, Response } from 'express';
import { FeedService } from '../services/FeedService';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { formatObjectDates } from '../utils/dateFormatter';
import { AuthenticatedRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';

export function createFeedRoutes(feedService: FeedService) {
  const router = Router();

  // Todas as rotas do feed requerem autenticação
  router.use(authMiddleware);

  // Upload de imagem para posts
  router.post('/upload-image', uploadMiddleware, async (req: AuthenticatedRequest & { file?: any }, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json(errorResponse('Nenhum arquivo foi enviado'));
      }

      const imageUrl = `/uploads/images/${req.file.filename}`;

      return res.json(successResponse({
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: imageUrl
      }, 'Imagem enviada com sucesso'));

    } catch (error) {
      console.error('Erro no upload:', error);
      return res.status(500).json(errorResponse('Erro interno do servidor'));
    }
  });

  // Criar novo post
  router.post('/posts', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const post = await feedService.createPost({
        titulo: req.body.titulo,
        conteudo: req.body.conteudo,
        tipo: req.body.tipo,
        anexo_url: req.body.imagem_url,
        autor_id: req.user!.id
      });

      return res.status(201).json(successResponse(
        formatObjectDates(post, ['created_at', 'updated_at']),
        'Post criado com sucesso'
      ));
    } catch (error) {
      console.error('Erro ao criar post:', error);
      return res.status(500).json(errorResponse('Erro interno do servidor'));
    }
  });

  // Listar posts do feed
  router.get('/posts', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const feed = await feedService.getFeed(
        parseInt(req.query.page as string),
        parseInt(req.query.limit as string),
        {
          tipo: req.query.tipo as string,
          autor_id: req.query.autor_id as string,
          search: req.query.search as string
        }
      );

      return res.json(successResponse(feed, 'Posts obtidos com sucesso'));
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
      return res.status(500).json(errorResponse('Erro interno do servidor'));
    }
  });

  // Obter detalhes de um post
  router.get('/posts/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const post = await feedService.getPostDetails(
        req.params.id,
        req.user!.id
      );

      return res.json(successResponse(post, 'Post obtido com sucesso'));
    } catch (error) {
      console.error('Erro ao buscar post:', error);
      return res.status(500).json(errorResponse('Erro interno do servidor'));
    }
  });

  // Adicionar comentário
  router.post('/posts/:id/comments', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const comment = await feedService.addComment(
        req.params.id,
        req.user!.id,
        req.body.conteudo
      );

      return res.status(201).json(successResponse(comment, 'Comentário criado'));
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      return res.status(500).json(errorResponse('Erro interno do servidor'));
    }
  });

  // Curtir/descurtir post
  router.post('/posts/:id/like', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await feedService.toggleLike(
        req.params.id,
        req.user!.id
      );

      return res.json(successResponse(result, result.liked ? 'Post curtido' : 'Post descurtido'));
    } catch (error) {
      console.error('Erro ao curtir/descurtir post:', error);
      return res.status(500).json(errorResponse('Erro interno do servidor'));
    }
  });

  // Excluir post
  router.delete('/posts/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      await feedService.deletePost(req.params.id, req.user!.id);
      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir post:', error);
      return res.status(500).json(errorResponse('Erro interno do servidor'));
    }
  });

  return router;
}
