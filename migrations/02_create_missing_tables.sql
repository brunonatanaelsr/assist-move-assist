-- Criar tabela feed_posts
CREATE TABLE IF NOT EXISTS feed_posts (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('anuncio', 'evento', 'noticia', 'conquista')),
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    autor_id INTEGER REFERENCES usuarios(id),
    autor_nome VARCHAR(255),
    imagem_url TEXT,
    curtidas INTEGER DEFAULT 0,
    comentarios INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'publicado',
    meta_dados JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela comentarios_feed
CREATE TABLE IF NOT EXISTS comentarios_feed (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES feed_posts(id),
    autor_id INTEGER REFERENCES usuarios(id),
    autor_nome VARCHAR(255),
    autor_foto TEXT,
    conteudo TEXT NOT NULL,
    curtidas INTEGER DEFAULT 0,
    respostas INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    meta_dados JSONB DEFAULT '{}',
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    link TEXT,
    lida BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    meta_dados JSONB DEFAULT '{}',
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_autor ON feed_posts(autor_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_data ON feed_posts(data_criacao);
CREATE INDEX IF NOT EXISTS idx_comentarios_post ON comentarios_feed(post_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);

-- Adicionar funções de trigger para atualizar data_atualizacao
CREATE OR REPLACE FUNCTION update_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualização automática de data_atualizacao
CREATE TRIGGER feed_posts_update
    BEFORE UPDATE ON feed_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao();

CREATE TRIGGER comentarios_feed_update
    BEFORE UPDATE ON comentarios_feed
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao();

CREATE TRIGGER notificacoes_update
    BEFORE UPDATE ON notificacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao();

-- Adicionar dados iniciais para teste
INSERT INTO feed_posts (tipo, titulo, conteudo, autor_nome, status)
VALUES 
('noticia', 'Bem-vindas ao MoveMarias', 'Sistema lançado com sucesso para ajudar mulheres.', 'Sistema', 'publicado'),
('evento', 'Workshop de Empoderamento', 'Venha participar do nosso workshop sobre empoderamento feminino.', 'Coordenação', 'publicado');

-- Criar visualização para facilitar consultas comuns
CREATE OR REPLACE VIEW vw_feed_completo AS
SELECT 
    p.*,
    u.nome as autor_nome_completo,
    COUNT(c.id) as total_comentarios
FROM feed_posts p
LEFT JOIN usuarios u ON p.autor_id = u.id
LEFT JOIN comentarios_feed c ON p.id = c.post_id AND c.ativo = true
WHERE p.ativo = true
GROUP BY p.id, u.nome;
