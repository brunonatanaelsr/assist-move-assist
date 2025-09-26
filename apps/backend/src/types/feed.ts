// ==== Feed Types ====
export type PostType = 'post' | 'anuncio' | 'evento';

export interface Post {
  id: string;
  tipo: PostType;
  titulo: string;
  conteudo: string;
  anexo_url?: string;
  autor_id: string;
  autor: {
    id: string;
    nome: string;
    email: string;
  };
  likes_count: number;
  comentarios_count: number;
  visualizacoes: number;
  created_at: Date;
  updated_at?: Date;
}

export interface PostWithLike extends Post {
  liked_by_user: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  conteudo: string;
  autor_id: string;
  autor: {
    id: string;
    nome: string;
    email: string;
  };
  created_at: Date;
  updated_at?: Date;
}

export interface PostDetails extends PostWithLike {
  comentarios: Comment[];
}

export interface FeedResponse {
  posts: PostWithLike[];
  total: number;
  pages: number;
}

// ==== WebSocket Types ====
export interface PostNotification {
  type: 'new_post';
  post: Post;
  followers?: string[];
}

export interface CommentNotification {
  type: 'new_comment';
  post_id: string;
  comment: Comment;
  notifyUsers: string[];
}

export interface LikeNotification {
  type: 'like_update';
  post_id: string;
  user_id: string;
  userName: string;
  autor_id: string;
  likes_count: number;
  action: 'like' | 'unlike';
}

export interface PostDeletedNotification {
  type: 'post_deleted';
  post_id: string;
}

export type FeedNotification = 
  | PostNotification
  | CommentNotification
  | LikeNotification
  | PostDeletedNotification;
