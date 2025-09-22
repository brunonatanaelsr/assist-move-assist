CREATE TABLE IF NOT EXISTS mensagens_usuario (
  id SERIAL PRIMARY KEY,
  autor_id INTEGER NOT NULL,
  destinatario_id INTEGER NOT NULL,
  conteudo TEXT NOT NULL,
  data_publicacao TIMESTAMPTZ DEFAULT NOW(),
  lida BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_mensagens_aut_dest ON mensagens_usuario(autor_id, destinatario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_dest ON mensagens_usuario(destinatario_id, lida);

