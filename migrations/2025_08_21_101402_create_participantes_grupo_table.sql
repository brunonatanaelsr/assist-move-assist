-- Participantes (membros) dos grupos de chat

CREATE TABLE participantes_grupo (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER NOT NULL REFERENCES grupos_conversa(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  papel VARCHAR(20) DEFAULT 'membro', -- 'admin', 'membro'
  adicionado_por INTEGER REFERENCES usuarios(id),
  ativo BOOLEAN DEFAULT TRUE,
  data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_participante_unico ON participantes_grupo(grupo_id, usuario_id);
CREATE INDEX idx_participantes_grupo_usuario ON participantes_grupo(usuario_id);
CREATE INDEX idx_participantes_grupo_grupo ON participantes_grupo(grupo_id);

COMMENT ON TABLE participantes_grupo IS 'Associação de usuários aos grupos de conversa do chat';
