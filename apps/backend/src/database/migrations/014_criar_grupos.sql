-- Grupos e membros de grupos
CREATE TABLE IF NOT EXISTS grupos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grupo_membros (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  papel TEXT DEFAULT 'membro',
  data_entrada TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (grupo_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_grupo_membros_grupo ON grupo_membros(grupo_id);
CREATE INDEX IF NOT EXISTS idx_grupo_membros_usuario ON grupo_membros(usuario_id);

