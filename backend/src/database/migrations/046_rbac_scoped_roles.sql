-- Migração 046: amplia suporte a RBAC com escopo por projeto/oficina
-- Ajusta user_permissions para permitir permissões por escopo
ALTER TABLE user_permissions
  DROP CONSTRAINT IF EXISTS user_permissions_pkey;

ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY,
  ADD COLUMN IF NOT EXISTS projeto_id INTEGER REFERENCES projetos(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS oficina_id INTEGER REFERENCES oficinas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD CONSTRAINT user_permissions_scope_chk
    CHECK (NOT (projeto_id IS NOT NULL AND oficina_id IS NOT NULL));

CREATE UNIQUE INDEX IF NOT EXISTS user_permissions_global_unique
  ON user_permissions(user_id, permission)
  WHERE projeto_id IS NULL AND oficina_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_permissions_project_unique
  ON user_permissions(user_id, permission, projeto_id)
  WHERE projeto_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_permissions_oficina_unique
  ON user_permissions(user_id, permission, oficina_id)
  WHERE oficina_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_permissions_user
  ON user_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_projeto
  ON user_permissions(projeto_id)
  WHERE projeto_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_permissions_oficina
  ON user_permissions(oficina_id)
  WHERE oficina_id IS NOT NULL;

-- Registra tabela de papéis com escopo específico
CREATE TABLE IF NOT EXISTS user_role_scopes (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  projeto_id INTEGER REFERENCES projetos(id) ON DELETE CASCADE,
  oficina_id INTEGER REFERENCES oficinas(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (projeto_id IS NOT NULL AND oficina_id IS NULL) OR
    (projeto_id IS NULL AND oficina_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS user_role_scopes_project_unique
  ON user_role_scopes(user_id, role, projeto_id)
  WHERE projeto_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_role_scopes_oficina_unique
  ON user_role_scopes(user_id, role, oficina_id)
  WHERE oficina_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_role_scopes_user
  ON user_role_scopes(user_id);
