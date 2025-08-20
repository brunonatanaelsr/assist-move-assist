-- Migration: 2025_08_20_09_create_feed_tables.sql

-- Enum para tipo de post
CREATE TYPE tipo_post AS ENUM (
    'noticia',
    'evento',
    'comunicado',
    'relato',
    'conquista',
    'documento'
);

-- Enum para visibilidade do post
CREATE TYPE visibilidade_post AS ENUM (
    'publico',
    'interno',
    'restrito'
);

-- Tabela principal de posts
CREATE TABLE IF NOT EXISTS feed_posts (
    id SERIAL PRIMARY KEY,
    tipo tipo_post NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    conteudo TEXT NOT NULL,
    autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    projeto_id INTEGER REFERENCES projetos(id),
    oficina_id INTEGER REFERENCES oficinas(id),
    visibilidade visibilidade_post NOT NULL DEFAULT 'interno',
    tags TEXT[],
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_publicacao TIMESTAMP,
    publicado BOOLEAN NOT NULL DEFAULT false,
    destaque BOOLEAN NOT NULL DEFAULT false,
    views INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT check_publicacao CHECK (
        (publicado = false AND data_publicacao IS NULL) OR
        (publicado = true AND data_publicacao IS NOT NULL)
    )
);

-- Mídia dos posts
CREATE TABLE IF NOT EXISTS feed_midias (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'imagem', 'video', 'documento'
    url VARCHAR(500) NOT NULL,
    nome_arquivo VARCHAR(200) NOT NULL,
    tamanho INTEGER NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    legenda TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_tamanho CHECK (tamanho > 0)
);

-- Reações aos posts
CREATE TABLE IF NOT EXISTS feed_reacoes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo VARCHAR(20) NOT NULL, -- 'like', 'love', 'celebrate', etc
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_reacao UNIQUE (post_id, usuario_id)
);

-- Comentários nos posts
CREATE TABLE IF NOT EXISTS feed_comentarios (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    comentario_pai_id INTEGER REFERENCES feed_comentarios(id),
    conteudo TEXT NOT NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    editado BOOLEAN NOT NULL DEFAULT false,
    excluido BOOLEAN NOT NULL DEFAULT false
);

-- Compartilhamentos de posts
CREATE TABLE IF NOT EXISTS feed_compartilhamentos (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    canal VARCHAR(50) NOT NULL, -- 'email', 'whatsapp', 'interno'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Histórico de visualizações
CREATE TABLE IF NOT EXISTS feed_visualizacoes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_visualizacao UNIQUE (post_id, usuario_id)
);

-- Notificações do feed
CREATE TABLE IF NOT EXISTS feed_notificacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    post_id INTEGER REFERENCES feed_posts(id) ON DELETE CASCADE,
    comentario_id INTEGER REFERENCES feed_comentarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Triggers para atualização automática
CREATE TRIGGER update_feed_posts_updated_at
    BEFORE UPDATE ON feed_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feed_comentarios_updated_at
    BEFORE UPDATE ON feed_comentarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para incrementar visualizações
CREATE OR REPLACE FUNCTION incrementar_visualizacoes()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE feed_posts
    SET views = views + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_incrementar_visualizacoes
    AFTER INSERT ON feed_visualizacoes
    FOR EACH ROW
    EXECUTE FUNCTION incrementar_visualizacoes();

-- Função para criar notificação de comentário
CREATE OR REPLACE FUNCTION criar_notificacao_comentario()
RETURNS TRIGGER AS $$
DECLARE
    v_post_autor_id INTEGER;
    v_comentario_pai_autor_id INTEGER;
BEGIN
    -- Obter autor do post
    SELECT autor_id INTO v_post_autor_id
    FROM feed_posts
    WHERE id = NEW.post_id;
    
    -- Notificar autor do post
    IF NEW.usuario_id != v_post_autor_id THEN
        INSERT INTO feed_notificacoes (
            usuario_id,
            post_id,
            comentario_id,
            tipo,
            mensagem
        ) VALUES (
            v_post_autor_id,
            NEW.post_id,
            NEW.id,
            'novo_comentario',
            'Novo comentário em seu post'
        );
    END IF;
    
    -- Se for resposta, notificar autor do comentário pai
    IF NEW.comentario_pai_id IS NOT NULL THEN
        SELECT usuario_id INTO v_comentario_pai_autor_id
        FROM feed_comentarios
        WHERE id = NEW.comentario_pai_id;
        
        IF NEW.usuario_id != v_comentario_pai_autor_id THEN
            INSERT INTO feed_notificacoes (
                usuario_id,
                post_id,
                comentario_id,
                tipo,
                mensagem
            ) VALUES (
                v_comentario_pai_autor_id,
                NEW.post_id,
                NEW.id,
                'resposta_comentario',
                'Nova resposta ao seu comentário'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_criar_notificacao_comentario
    AFTER INSERT ON feed_comentarios
    FOR EACH ROW
    EXECUTE FUNCTION criar_notificacao_comentario();

-- Índices
CREATE INDEX idx_feed_posts_tipo ON feed_posts(tipo);
CREATE INDEX idx_feed_posts_visibilidade ON feed_posts(visibilidade);
CREATE INDEX idx_feed_posts_autor ON feed_posts(autor_id);
CREATE INDEX idx_feed_posts_projeto ON feed_posts(projeto_id);
CREATE INDEX idx_feed_posts_oficina ON feed_posts(oficina_id);
CREATE INDEX idx_feed_posts_data ON feed_posts(data_publicacao);
CREATE INDEX idx_feed_midias_post ON feed_midias(post_id);
CREATE INDEX idx_feed_reacoes_post ON feed_reacoes(post_id);
CREATE INDEX idx_feed_reacoes_usuario ON feed_reacoes(usuario_id);
CREATE INDEX idx_feed_comentarios_post ON feed_comentarios(post_id);
CREATE INDEX idx_feed_comentarios_usuario ON feed_comentarios(usuario_id);
CREATE INDEX idx_feed_visualizacoes_post ON feed_visualizacoes(post_id);
CREATE INDEX idx_feed_notificacoes_usuario ON feed_notificacoes(usuario_id);
CREATE INDEX idx_feed_notificacoes_lida ON feed_notificacoes(lida);
