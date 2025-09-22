-- Permissões de projetos e oficinas
INSERT INTO permissions (name, description) VALUES
  ('projetos.ler', 'Listar e visualizar projetos'),
  ('projetos.criar', 'Criar projetos'),
  ('projetos.editar', 'Editar projetos'),
  ('projetos.excluir', 'Excluir projetos'),
  ('oficinas.ler', 'Listar e visualizar oficinas'),
  ('oficinas.criar', 'Criar oficinas'),
  ('oficinas.editar', 'Editar oficinas'),
  ('oficinas.excluir', 'Excluir oficinas')
ON CONFLICT DO NOTHING;

