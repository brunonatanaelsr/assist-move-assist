-- Criar tabela de anexos dos posts do feed
CREATE TABLE anexos_feed (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    tipo_arquivo VARCHAR(50) NOT NULL,
    url_arquivo VARCHAR(255) NOT NULL,
    nome_original VARCHAR(255) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice para melhorar performance de busca por post
CREATE INDEX idx_anexos_feed_post ON anexos_feed(post_id);

COMMENT ON TABLE anexos_feed IS 'Armazena os anexos/arquivos vinculados aos posts do feed';
COMMENT ON COLUMN anexos_feed.tipo_arquivo IS 'Tipo do arquivo (ex: imagem, documento, video)';
COMMENT ON COLUMN anexos_feed.url_arquivo IS 'URL de acesso ao arquivo';
COMMENT ON COLUMN anexos_feed.nome_original IS 'Nome original do arquivo quando foi enviado';
COMMENT ON COLUMN anexos_feed.tamanho_bytes IS 'Tamanho do arquivo em bytes';
