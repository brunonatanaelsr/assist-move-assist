-- Permissões finas para oficinas
INSERT INTO permissions (name, description) VALUES
  ('oficinas.participantes.ver', 'Listar participantes da oficina'),
  ('oficinas.participantes.adicionar', 'Adicionar participantes à oficina'),
  ('oficinas.participantes.remover', 'Remover participantes da oficina'),
  ('oficinas.presencas.registrar', 'Registrar presença em oficina'),
  ('oficinas.presencas.listar', 'Listar presenças da oficina'),
  ('oficinas.relatorio.exportar', 'Exportar relatório de presenças da oficina')
ON CONFLICT DO NOTHING;

