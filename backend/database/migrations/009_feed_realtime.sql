-- Enums para tipos de conteúdo
CREATE TYPE feed_post_type AS ENUM ('post', 'anuncio', 'evento');
CREATE TYPE feed_notification_type AS ENUM ('novo_post', 'novo_comentario', 'novo_like');

-- Tabela principal de posts
CREATE TABLE feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    tipo feed_post_type DEFAULT 'post',
    autor_id UUID NOT NULL REFERENCES users(id),
    anexo_url VARCHAR(500),
    visualizacoes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de comentários
CREATE TABLE feed_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    conteudo TEXT NOT NULL,
    autor_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES feed_comments(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de likes
CREATE TABLE feed_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Tabela de notificações do feed
CREATE TABLE feed_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo feed_notification_type NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    post_id UUID REFERENCES feed_posts(id),
    comment_id UUID REFERENCES feed_comments(id),
    actor_id UUID REFERENCES users(id),
    lida BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_feed_posts_autor ON feed_posts(autor_id);
CREATE INDEX idx_feed_posts_tipo ON feed_posts(tipo);
CREATE INDEX idx_feed_comments_post ON feed_comments(post_id);
CREATE INDEX idx_feed_comments_autor ON feed_comments(autor_id);
CREATE INDEX idx_feed_likes_post ON feed_likes(post_id);
CREATE INDEX idx_feed_likes_user ON feed_likes(user_id);
CREATE INDEX idx_feed_notifications_user ON feed_notifications(user_id);
CREATE INDEX idx_feed_notifications_lida ON feed_notifications(lida);

-- Funções auxiliares

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER feed_posts_updated_at
    BEFORE UPDATE ON feed_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER feed_comments_updated_at
    BEFORE UPDATE ON feed_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Função para notificar mudanças no feed
CREATE OR REPLACE FUNCTION notify_feed_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
    notification_type feed_notification_type;
    affected_users UUID[];
BEGIN
    -- Determinar tipo de notificação
    IF TG_TABLE_NAME = 'feed_posts' THEN
        notification_type := 'novo_post';
    ELSIF TG_TABLE_NAME = 'feed_comments' THEN
        notification_type := 'novo_comentario';
    ELSE
        notification_type := 'novo_like';
    END IF;

    -- Construir payload
    IF TG_OP = 'DELETE' THEN
        payload = json_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'data', row_to_json(OLD),
            'notification_type', notification_type
        );
    ELSE
        payload = json_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'data', row_to_json(NEW),
            'notification_type', notification_type
        );
    END IF;

    -- Notificar via pg_notify
    PERFORM pg_notify('feed_changes', payload::text);

    -- Criar notificação para usuários afetados
    IF TG_OP = 'INSERT' THEN
        CASE TG_TABLE_NAME
            WHEN 'feed_posts' THEN
                -- Notificar todos (implementar lógica de segmentação se necessário)
                INSERT INTO feed_notifications (tipo, user_id, post_id, actor_id)
                SELECT 
                    notification_type,
                    u.id,
                    NEW.id,
                    NEW.autor_id
                FROM users u
                WHERE u.id != NEW.autor_id;

            WHEN 'feed_comments' THEN
                -- Notificar autor do post e outros comentaristas
                INSERT INTO feed_notifications (tipo, user_id, post_id, comment_id, actor_id)
                SELECT DISTINCT
                    notification_type,
                    CASE 
                        WHEN u.id = p.autor_id THEN p.autor_id
                        ELSE c.autor_id
                    END,
                    NEW.post_id,
                    NEW.id,
                    NEW.autor_id
                FROM feed_posts p
                LEFT JOIN feed_comments c ON c.post_id = p.id
                CROSS JOIN (SELECT id FROM users WHERE id = p.autor_id) u
                WHERE p.id = NEW.post_id
                AND CASE 
                    WHEN u.id = p.autor_id THEN true
                    ELSE c.autor_id != NEW.autor_id
                END;

            WHEN 'feed_likes' THEN
                -- Notificar autor do post
                INSERT INTO feed_notifications (tipo, user_id, post_id, actor_id)
                SELECT 
                    notification_type,
                    p.autor_id,
                    NEW.post_id,
                    NEW.user_id
                FROM feed_posts p
                WHERE p.id = NEW.post_id
                AND p.autor_id != NEW.user_id;
        END CASE;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers para notificações
CREATE TRIGGER notify_new_post
    AFTER INSERT OR UPDATE OR DELETE ON feed_posts
    FOR EACH ROW
    EXECUTE FUNCTION notify_feed_change();

CREATE TRIGGER notify_new_comment
    AFTER INSERT OR UPDATE OR DELETE ON feed_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_feed_change();

CREATE TRIGGER notify_new_like
    AFTER INSERT OR DELETE ON feed_likes
    FOR EACH ROW
    EXECUTE FUNCTION notify_feed_change();
