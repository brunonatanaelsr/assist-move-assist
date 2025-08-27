import { Request, Response } from 'express';
import { FeedService } from '../services/FeedService';
import { validateRequest } from '../utils/validator';
import { z } from 'zod';

const createPostSchema = z.object({
  titulo: z.string().min(1),
  conteudo: z.string().min(1),
  tipo: z.enum(['post', 'anuncio', 'evento']).optional(),
  anexo_url: z.string().optional()
});

const getFeedSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  tipo: z.enum(['post', 'anuncio', 'evento']).optional(),
  autor_id: z.string().optional(),
  search: z.string().optional()
});

export class FeedController {
  constructor(private feedService: FeedService) {}

  async createPost(req: Request, res: Response) {
    const { userId } = req;
    const data = validateRequest(req.body, createPostSchema);

    const post = await this.feedService.createPost({
      ...data,
      autor_id: userId
    });

    return res.status(201).json(post);
  }

  async getFeed(req: Request, res: Response) {
    const { userId } = req;
    const params = validateRequest(req.query, getFeedSchema);

    const feed = await this.feedService.getFeed(
      params.page, 
      params.limit,
      {
        tipo: params.tipo,
        autor_id: params.autor_id,
        search: params.search
      }
    );

    return res.json(feed);
  }

  async getPostDetails(req: Request, res: Response) {
    const { userId } = req;
    const { id } = req.params;

    const post = await this.feedService.getPostDetails(id, userId);

    return res.json(post);
  }

  async addComment(req: Request, res: Response) {
    const { userId } = req;
    const { id } = req.params;
    const { conteudo } = req.body;

    if (!conteudo || typeof conteudo !== 'string') {
      return res.status(400).json({ error: 'Conteúdo inválido' });
    }

    const comment = await this.feedService.addComment(id, userId, conteudo);

    return res.status(201).json(comment);
  }

  async toggleLike(req: Request, res: Response) {
    const { userId } = req;
    const { id } = req.params;

    const result = await this.feedService.toggleLike(id, userId);

    return res.json(result);
  }

  async deletePost(req: Request, res: Response) {
    const { userId } = req;
    const { id } = req.params;

    await this.feedService.deletePost(id, userId);

    return res.status(204).send();
  }
}
