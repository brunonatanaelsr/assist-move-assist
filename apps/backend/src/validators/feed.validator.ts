import { z } from '../openapi/init';

// Schema para posts do feed
export const feedPostSchema = z.object({
  id: z.number(),
  tipo: z.enum(['anuncio', 'evento', 'noticia', 'conquista']),
  titulo: z.string().min(3).max(200),
  conteudo: z.string().min(1).max(5000).optional(),
  autor_id: z.string().or(z.number()),
  autor_nome: z.string(),
  curtidas: z.number().default(0),
  comentarios: z.number().default(0),
  imagem_url: z.string().nullable().optional(),
  ativo: z.boolean().default(true),
  data_criacao: z.date(),
  data_atualizacao: z.date()
});

// Schema para comentários do feed
export const feedCommentSchema = z.object({
  id: z.number(),
  post_id: z.number(),
  autor_id: z.string().or(z.number()),
  autor_nome: z.string(),
  autor_foto: z.string().nullable().optional(),
  conteudo: z.string().min(1).max(1000),
  ativo: z.boolean().default(true),
  data_criacao: z.date(),
  data_atualizacao: z.date()
});
