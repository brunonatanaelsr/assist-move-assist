-- Permissões específicas de beneficiárias
INSERT INTO permissions (name, description) VALUES
  ('beneficiarias.ler', 'Listar e visualizar beneficiárias'),
  ('beneficiarias.criar', 'Criar beneficiárias'),
  ('beneficiarias.editar', 'Editar beneficiárias'),
  ('beneficiarias.excluir', 'Excluir beneficiárias')
ON CONFLICT DO NOTHING;

