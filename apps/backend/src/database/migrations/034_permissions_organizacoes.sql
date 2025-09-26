-- Permissões para organizações
INSERT INTO permissions (name, description) VALUES
  ('organizacoes.ler', 'Ler organizações'),
  ('organizacoes.criar', 'Criar organizações'),
  ('organizacoes.editar', 'Editar organizações'),
  ('organizacoes.excluir', 'Excluir organizações')
ON CONFLICT DO NOTHING;

-- Conceder a admin e gestor (leitura) e admin (CRUD)
INSERT INTO role_permissions (role, permission)
SELECT 'admin', name FROM permissions WHERE name LIKE 'organizacoes.%'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission)
VALUES ('gestor', 'organizacoes.ler')
ON CONFLICT DO NOTHING;

