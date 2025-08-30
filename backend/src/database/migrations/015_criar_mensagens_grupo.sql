-- Mensagens de grupo
CREATE TABLE IF NOT EXISTS mensagens_grupo (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  autor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  data_publicacao TIMESTAMPTZ DEFAULT NOW(),
  ativo BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_mensagens_grupo_grupo ON mensagens_grupo(grupo_id, data_publicacao DESC);

