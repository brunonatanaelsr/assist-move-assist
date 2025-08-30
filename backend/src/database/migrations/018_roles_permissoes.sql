-- Tabelas de permissões e papéis (RBAC leve)
CREATE TABLE IF NOT EXISTS permissions (
  name TEXT PRIMARY KEY,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role VARCHAR(50) NOT NULL,
  permission TEXT NOT NULL REFERENCES permissions(name) ON DELETE CASCADE,
  PRIMARY KEY (role, permission)
);

-- Algumas permissões padrão
INSERT INTO permissions (name, description) VALUES
  ('users.manage', 'Gerenciar usuários'),
  ('roles.manage', 'Gerenciar papéis e permissões'),
  ('profile.edit', 'Editar o próprio perfil'),
  ('beneficiarias.view', 'Visualizar beneficiárias')
ON CONFLICT DO NOTHING;

