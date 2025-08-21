-- Criar tabela de reações aos posts do feed
CREATE TABLE reacoes_feed (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo_reacao VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, usuario_id)
);

-- Criar índice para melhorar performance de busca por post
CREATE INDEX idx_reacoes_feed_post ON reacoes_feed(post_id);

-- Criar índice para melhorar performance de busca por usuário
CREATE INDEX idx_reacoes_feed_usuario ON reacoes_feed(usuario_id);

COMMENT ON TABLE reacoes_feed IS 'Armazena as reações dos usuários aos posts do feed';
COMMENT ON COLUMN reacoes_feed.tipo_reacao IS 'Tipo da reação (ex: like, love, apoio)';
COMMENT ON COLUMN reacoes_feed.post_id IS 'ID do post que recebeu a reação';
COMMENT ON COLUMN reacoes_feed.usuario_id IS 'ID do usuário que reagiu ao post';
