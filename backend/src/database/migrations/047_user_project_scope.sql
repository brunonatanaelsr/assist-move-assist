-- Adiciona escopo opcional de projeto às permissões por usuário e cria associação de papéis por projeto
ALTER TABLE user_permissions
  DROP CONSTRAINT IF EXISTS user_permissions_pkey;

ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projetos(id) ON DELETE CASCADE;

ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY;

CREATE UNIQUE INDEX IF NOT EXISTS user_permissions_unique_global
  ON user_permissions(user_id, permission)
  WHERE project_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_permissions_unique_project
  ON user_permissions(user_id, project_id, permission)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_permissions_project
  ON user_permissions(project_id);

CREATE TABLE IF NOT EXISTS user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  project_id INTEGER REFERENCES projetos(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_global
  ON user_roles(user_id, role)
  WHERE project_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_project
  ON user_roles(user_id, project_id, role)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_project
  ON user_roles(project_id);

INSERT INTO user_roles (user_id, role, project_id)
SELECT id, papel, NULL
FROM usuarios
WHERE papel IS NOT NULL
ON CONFLICT DO NOTHING;
