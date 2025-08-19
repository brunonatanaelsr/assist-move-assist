-- Cria tabelas para o Feed do sistema Move Marias
-- Criado em 19/08/2025

-- Tabela de Posts do Feed
CREATE TABLE IF NOT EXISTS feed_posts (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('anuncio','evento','noticia','conquista')),
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    autor_nome VARCHAR(255) NOT NULL,
    autor_foto VARCHAR(500),
    imagem_url VARCHAR(500),
    curtidas INTEGER DEFAULT 0,
    comentarios INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Comentários do Feed
CREATE TABLE IF NOT EXISTS comentarios_feed (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    autor_nome VARCHAR(255) NOT NULL,
    autor_foto VARCHAR(500),
    conteudo TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers para atualizar timestamp
CREATE TRIGGER update_feed_posts_updated_at 
    BEFORE UPDATE ON feed_posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comentarios_feed_updated_at 
    BEFORE UPDATE ON comentarios_feed 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_feed_posts_tipo ON feed_posts(tipo);
CREATE INDEX IF NOT EXISTS idx_feed_posts_autor_id ON feed_posts(autor_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_data_criacao ON feed_posts(data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_ativo ON feed_posts(ativo);

CREATE INDEX IF NOT EXISTS idx_comentarios_feed_post_id ON comentarios_feed(post_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_feed_autor_id ON comentarios_feed(autor_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_feed_data_criacao ON comentarios_feed(data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_comentarios_feed_ativo ON comentarios_feed(ativo);

-- Registra na tabela de manutenção
INSERT INTO maintenance_log (operation, executed_at, details)
VALUES (
    'create_feed_tables',
    NOW(),
    jsonb_build_object(
        'tables_created', jsonb_build_array(
            'feed_posts',
            'comentarios_feed'
        ),
        'triggers_created', jsonb_build_array(
            'update_feed_posts_updated_at',
            'update_comentarios_feed_updated_at'
        )
    )
);
