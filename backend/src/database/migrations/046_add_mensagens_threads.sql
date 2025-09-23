DO $$
BEGIN
  CREATE TYPE mensagem_confidencialidade AS ENUM ('publica', 'sensivel', 'confidencial');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS mensagens_threads (
  id SERIAL PRIMARY KEY,
  escopo_tipo TEXT NOT NULL CHECK (escopo_tipo IN ('DIRECT', 'BENEFICIARIA', 'PROJETO')),
  beneficiaria_id INTEGER REFERENCES beneficiarias(id) ON DELETE CASCADE,
  projeto_id INTEGER REFERENCES projetos(id) ON DELETE CASCADE,
  titulo TEXT,
  criado_por INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  confidencialidade mensagem_confidencialidade NOT NULL DEFAULT 'publica',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT mensagens_threads_scope_ck CHECK (
    (escopo_tipo = 'BENEFICIARIA' AND beneficiaria_id IS NOT NULL AND projeto_id IS NULL) OR
    (escopo_tipo = 'PROJETO' AND projeto_id IS NOT NULL AND beneficiaria_id IS NULL) OR
    (escopo_tipo = 'DIRECT' AND beneficiaria_id IS NULL AND projeto_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS mensagens_thread_participantes (
  thread_id INTEGER NOT NULL REFERENCES mensagens_threads(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_mensagens_threads_tipo ON mensagens_threads(escopo_tipo, atualizado_em DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mensagens_threads_beneficiaria ON mensagens_threads(beneficiaria_id) WHERE escopo_tipo = 'BENEFICIARIA';
CREATE UNIQUE INDEX IF NOT EXISTS idx_mensagens_threads_projeto ON mensagens_threads(projeto_id) WHERE escopo_tipo = 'PROJETO';
CREATE INDEX IF NOT EXISTS idx_mensagens_thread_participantes_usuario ON mensagens_thread_participantes(usuario_id);

ALTER TABLE mensagens_usuario
  ADD COLUMN IF NOT EXISTS thread_id INTEGER REFERENCES mensagens_threads(id),
  ADD COLUMN IF NOT EXISTS beneficiaria_id INTEGER REFERENCES beneficiarias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS projeto_id INTEGER REFERENCES projetos(id) ON DELETE SET NULL;

ALTER TABLE mensagens_usuario
  ADD COLUMN IF NOT EXISTS confidencialidade mensagem_confidencialidade DEFAULT 'publica';

ALTER TABLE mensagens_usuario
  ADD COLUMN IF NOT EXISTS mentions INTEGER[] DEFAULT '{}'::INTEGER[];

ALTER TABLE mensagens_usuario
  ALTER COLUMN destinatario_id DROP NOT NULL;

UPDATE mensagens_usuario
SET confidencialidade = 'publica'
WHERE confidencialidade IS NULL;

