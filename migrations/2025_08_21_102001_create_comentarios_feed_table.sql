-- Tabela de comentários nos posts do feed

CREATE TABLE comentarios_feed (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  autor_id INTEGER REFERENCES usuarios(id),
  autor_nome VARCHAR(200),
  autor_foto TEXT,
  conteudo TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comentarios_feed_post_id ON comentarios_feed(post_id);
CREATE INDEX idx_comentarios_feed_autor_id ON comentarios_feed(autor_id);
CREATE INDEX idx_comentarios_feed_ativo ON comentarios_feed(ativo);

-- Trigger de atualização automática da data
CREATE OR REPLACE FUNCTION update_comentarios_feed_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comentarios_feed_update_data_atualizacao
BEFORE UPDATE ON comentarios_feed
FOR EACH ROW EXECUTE FUNCTION update_comentarios_feed_data_atualizacao();

COMMENT ON TABLE comentarios_feed IS 'Comentários associados aos posts do feed social';
