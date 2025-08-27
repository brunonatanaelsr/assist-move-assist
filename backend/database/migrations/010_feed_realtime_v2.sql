-- Criar tabelas para o feed
CREATE TABLE IF NOT EXISTS feed_posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('post', 'anuncio', 'evento')),
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  anexo_url TEXT,
  autor_id uuid NOT NULL REFERENCES users(id),
  likes_count INTEGER DEFAULT 0,
  comentarios_count INTEGER DEFAULT 0,
  visualizacoes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS feed_comments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES users(id),
  conteudo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS feed_likes (
  post_id uuid NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS feed_posts_autor_id_idx ON feed_posts(autor_id);
CREATE INDEX IF NOT EXISTS feed_posts_tipo_idx ON feed_posts(tipo);
CREATE INDEX IF NOT EXISTS feed_posts_created_at_idx ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS feed_comments_post_id_idx ON feed_comments(post_id);
CREATE INDEX IF NOT EXISTS feed_comments_created_at_idx ON feed_comments(created_at ASC);

-- Função para notificar sobre alterações no feed
CREATE OR REPLACE FUNCTION notify_feed_changes() 
RETURNS TRIGGER AS $$
DECLARE
  notification_data jsonb;
  comment_data jsonb;
  post_author_id uuid;
  comment_authors uuid[];
BEGIN
  -- Decidir o tipo de notificação com base na operação
  CASE TG_TABLE_NAME
    WHEN 'feed_posts' THEN
      IF (TG_OP = 'INSERT') THEN
        -- Buscar dados do autor
        WITH author_data AS (
          SELECT u.id, u.nome, u.email
          FROM users u 
          WHERE u.id = NEW.autor_id
        )
        SELECT jsonb_build_object(
          'type', 'new_post',
          'post', jsonb_build_object(
            'id', NEW.id,
            'tipo', NEW.tipo,
            'titulo', NEW.titulo,
            'conteudo', NEW.conteudo,
            'anexo_url', NEW.anexo_url,
            'autor', (SELECT jsonb_build_object(
              'id', id,
              'nome', nome,
              'email', email
            ) FROM author_data),
            'likes_count', 0,
            'comentarios_count', 0,
            'visualizacoes', 0,
            'created_at', NEW.created_at
          ),
          'followers', (
            SELECT jsonb_agg(user_id)
            FROM user_followers
            WHERE followed_id = NEW.autor_id
          )
        ) INTO notification_data;

      ELSIF (TG_OP = 'DELETE') THEN
        notification_data := jsonb_build_object(
          'type', 'post_deleted',
          'post_id', OLD.id
        );
      END IF;

    WHEN 'feed_comments' THEN
      IF (TG_OP = 'INSERT') THEN
        -- Buscar autor do post e outros comentaristas
        SELECT autor_id INTO post_author_id 
        FROM feed_posts 
        WHERE id = NEW.post_id;

        SELECT array_agg(DISTINCT autor_id)
        INTO comment_authors
        FROM feed_comments 
        WHERE post_id = NEW.post_id 
          AND autor_id != NEW.autor_id;

        -- Dados do comentário com autor
        WITH author_data AS (
          SELECT u.id, u.nome, u.email
          FROM users u 
          WHERE u.id = NEW.autor_id
        )
        SELECT jsonb_build_object(
          'id', NEW.id,
          'post_id', NEW.post_id,
          'conteudo', NEW.conteudo,
          'autor', (SELECT jsonb_build_object(
            'id', id,
            'nome', nome,
            'email', email
          ) FROM author_data),
          'created_at', NEW.created_at
        ) INTO comment_data;

        -- Montar notificação
        notification_data := jsonb_build_object(
          'type', 'new_comment',
          'post_id', NEW.post_id,
          'comment', comment_data,
          'notifyUsers', array_to_json(
            array_append(comment_authors, post_author_id)
          )::jsonb
        );
      END IF;

    WHEN 'feed_likes' THEN
      IF (TG_OP = 'INSERT') OR (TG_OP = 'DELETE') THEN
        -- Buscar dados do usuário e contagem de likes
        WITH like_data AS (
          SELECT 
            p.autor_id,
            u.nome as user_name,
            (SELECT COUNT(*) FROM feed_likes WHERE post_id = p.id) as likes_count
          FROM feed_posts p
          JOIN users u ON u.id = CASE 
            WHEN TG_OP = 'INSERT' THEN NEW.user_id 
            ELSE OLD.user_id 
          END
          WHERE p.id = CASE 
            WHEN TG_OP = 'INSERT' THEN NEW.post_id 
            ELSE OLD.post_id 
          END
        )
        SELECT jsonb_build_object(
          'type', 'like_update',
          'post_id', CASE WHEN TG_OP = 'INSERT' THEN NEW.post_id ELSE OLD.post_id END,
          'user_id', CASE WHEN TG_OP = 'INSERT' THEN NEW.user_id ELSE OLD.user_id END,
          'userName', (SELECT user_name FROM like_data),
          'autor_id', (SELECT autor_id FROM like_data),
          'likes_count', (SELECT likes_count FROM like_data),
          'action', CASE WHEN TG_OP = 'INSERT' THEN 'like' ELSE 'unlike' END
        ) INTO notification_data;
      END IF;
  END CASE;

  -- Enviar notificação
  IF notification_data IS NOT NULL THEN
    PERFORM pg_notify('feed_notifications', notification_data::text);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para notificações em tempo real
DROP TRIGGER IF EXISTS feed_posts_notify_trigger ON feed_posts;
CREATE TRIGGER feed_posts_notify_trigger
  AFTER INSERT OR DELETE ON feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_feed_changes();

DROP TRIGGER IF EXISTS feed_comments_notify_trigger ON feed_comments;
CREATE TRIGGER feed_comments_notify_trigger
  AFTER INSERT ON feed_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_feed_changes();

DROP TRIGGER IF EXISTS feed_likes_notify_trigger ON feed_likes;
CREATE TRIGGER feed_likes_notify_trigger
  AFTER INSERT OR DELETE ON feed_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_feed_changes();

-- Função para atualizar contadores automaticamente
CREATE OR REPLACE FUNCTION update_post_counters() 
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar contagem de comentários
  IF TG_TABLE_NAME = 'feed_comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE feed_posts 
      SET comentarios_count = comentarios_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE feed_posts 
      SET comentarios_count = comentarios_count - 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.post_id;
    END IF;
  END IF;

  -- Atualizar contagem de likes
  IF TG_TABLE_NAME = 'feed_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE feed_posts 
      SET likes_count = likes_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE feed_posts 
      SET likes_count = likes_count - 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.post_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar contadores
DROP TRIGGER IF EXISTS feed_comments_counter_trigger ON feed_comments;
CREATE TRIGGER feed_comments_counter_trigger
  AFTER INSERT OR DELETE ON feed_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_counters();

DROP TRIGGER IF EXISTS feed_likes_counter_trigger ON feed_likes;
CREATE TRIGGER feed_likes_counter_trigger
  AFTER INSERT OR DELETE ON feed_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_counters();

-- Adicionar coluna para seguidores de usuários
CREATE TABLE IF NOT EXISTS user_followers (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, followed_id),
  CHECK (user_id != followed_id)
);

CREATE INDEX IF NOT EXISTS user_followers_user_id_idx ON user_followers(user_id);
CREATE INDEX IF NOT EXISTS user_followers_followed_id_idx ON user_followers(followed_id);
