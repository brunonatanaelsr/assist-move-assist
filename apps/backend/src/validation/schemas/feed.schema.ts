import { z } from 'zod';

export const feedPostSchema = z.object({
  id: z.number(),
  tipo: z.enum(['anuncio', 'evento', 'noticia', 'conquista']),
  titulo: z.string().trim().min(3).max(200),
  conteudo: z.string().trim().min(1).max(5000).optional(),
  autor_id: z.union([z.string().trim(), z.number()]),
  autor_nome: z.string().trim(),
  curtidas: z.number().default(0),
  comentarios: z.number().default(0),
  imagem_url: z.string().trim().nullable().optional(),
  ativo: z.boolean().default(true),
  data_criacao: z.date(),
  data_atualizacao: z.date()
});

export const feedCommentSchema = z.object({
  id: z.number(),
  post_id: z.number(),
  autor_id: z.union([z.string().trim(), z.number()]),
  autor_nome: z.string().trim(),
  autor_foto: z.string().trim().nullable().optional(),
  conteudo: z.string().trim().min(1).max(1000),
  ativo: z.boolean().default(true),
  data_criacao: z.date(),
  data_atualizacao: z.date()
});

const emptyObject = z.object({}).optional();
const anyOptional = z.any().optional();

export const listFeedPostsRequestSchema = z.object({
  query: z
    .object({
      limit: z.coerce.number().min(1).max(100).optional(),
      page: z.coerce.number().min(1).optional(),
      tipo: z.string().trim().min(1).optional(),
      autor_id: z.string().trim().optional()
    })
    .passthrough(),
  params: emptyObject,
  body: anyOptional
});

const numericIdParam = z.object({ id: z.coerce.number() });

export const feedPostByIdRequestSchema = z.object({
  params: numericIdParam,
  query: anyOptional,
  body: anyOptional
});

export const createFeedPostRequestSchema = z.object({
  body: z.object({
    tipo: z.enum(['anuncio', 'evento', 'noticia', 'conquista']),
    titulo: z.string().trim().min(3).max(200),
    conteudo: z.string().trim().max(5000).optional(),
    imagem_url: z.string().trim().url().optional()
  }),
  params: emptyObject,
  query: anyOptional
});

export const postInteractionRequestSchema = z.object({
  params: numericIdParam,
  query: anyOptional,
  body: anyOptional
});

const postIdParam = z.object({ postId: z.coerce.number() });

export const listFeedCommentsRequestSchema = z.object({
  params: postIdParam,
  query: z
    .object({
      limit: z.coerce.number().min(1).max(100).optional(),
      page: z.coerce.number().min(1).optional()
    })
    .passthrough(),
  body: anyOptional
});

export const createFeedCommentRequestSchema = z.object({
  params: postIdParam,
  body: z.object({ conteudo: z.string().trim().min(1).max(1000) }),
  query: anyOptional
});

export const updateFeedCommentRequestSchema = z.object({
  params: numericIdParam,
  body: z.object({ conteudo: z.string().trim().min(1).max(1000) }),
  query: anyOptional
});

export const deleteFeedPostRequestSchema = z.object({
  params: numericIdParam,
  query: anyOptional,
  body: anyOptional
});

export const updateFeedPostRequestSchema = z.object({
  params: numericIdParam,
  body: z
    .object({
      tipo: z.enum(['anuncio', 'evento', 'noticia', 'conquista']).optional(),
      titulo: z.string().trim().min(3).max(200).optional(),
      conteudo: z.string().trim().max(5000).optional(),
      imagem_url: z.string().trim().url().optional(),
      ativo: z.boolean().optional()
    })
    .partial(),
  query: anyOptional
});
