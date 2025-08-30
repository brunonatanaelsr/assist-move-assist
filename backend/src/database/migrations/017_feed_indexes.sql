-- Índices para melhorar filtros e ordenações no feed
CREATE INDEX IF NOT EXISTS idx_feed_posts_tipo ON feed_posts(tipo);
CREATE INDEX IF NOT EXISTS idx_feed_posts_autor ON feed_posts(autor_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_data ON feed_posts(data_criacao DESC);
-- Comentários já possuem idx_comentarios_post, adicionar ordenação por data
CREATE INDEX IF NOT EXISTS idx_comentarios_post_data ON comentarios_feed(post_id, data_criacao);

