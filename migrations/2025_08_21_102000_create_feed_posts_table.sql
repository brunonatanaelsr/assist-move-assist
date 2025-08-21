-- Tabela de posts do feed (anúncios, eventos, notícias, conquistas, etc)

CREATE TABLE feed_posts (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(30) NOT NULL,              -- Ex: anuncio, evento, noticia, conquista
  titulo VARCHAR(200) NOT NULL,
  conteudo TEXT NOT NULL,
  autor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  autor_nome VARCHAR(200) NOT NULL,
  imagem_url TEXT,
  curtidas INTEGER DEFAULT 0,             -- Número de curtidas
  comentarios INTEGER DEFAULT 0,          -- Quantidade de comentários
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feed_posts_tipo ON feed_posts(tipo);
CREATE INDEX idx_feed_posts_autor_id ON feed_posts(autor_id);
CREATE INDEX idx_feed_posts_ativo ON feed_posts(ativo);

-- Trigger para manter data_atualizacao
CREATE OR REPLACE FUNCTION update_feed_posts_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feed_posts_update_data_atualizacao
BEFORE UPDATE ON feed_posts
FOR EACH ROW EXECUTE FUNCTION update_feed_posts_data_atualizacao();

COMMENT ON TABLE feed_posts IS 'Posts do feed do sistema (eventos, notícias, conquistas etc)';
