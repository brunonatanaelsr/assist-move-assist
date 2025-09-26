DROP TABLE IF EXISTS comentarios_feed CASCADE;
DROP TABLE IF EXISTS feed_posts CASCADE;

CREATE TABLE feed_posts (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL DEFAULT 'noticia',
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  imagem_url TEXT,
  autor_id VARCHAR(64),
  autor_nome VARCHAR(255),
  curtidas INTEGER NOT NULL DEFAULT 0,
  comentarios INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comentarios_feed (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES feed_posts(id) ON DELETE CASCADE,
  autor_id VARCHAR(64),
  autor_nome VARCHAR(255),
  autor_foto TEXT,
  conteudo TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_ativo ON feed_posts(ativo);
CREATE INDEX IF NOT EXISTS idx_comentarios_post ON comentarios_feed(post_id);
