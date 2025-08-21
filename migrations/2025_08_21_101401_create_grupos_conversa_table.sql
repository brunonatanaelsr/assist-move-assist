-- Grupos de conversa para chat em grupo

CREATE TABLE grupos_conversa (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  criador_id INTEGER NOT NULL REFERENCES usuarios(id),
  tipo VARCHAR(20) DEFAULT 'privado',
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_grupos_conversa_criador_id ON grupos_conversa(criador_id);
CREATE INDEX idx_grupos_conversa_tipo ON grupos_conversa(tipo);
CREATE INDEX idx_grupos_conversa_ativo ON grupos_conversa(ativo);

COMMENT ON TABLE grupos_conversa IS 'Grupos de chat para conversas em grupo';
