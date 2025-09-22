INSERT INTO permissions (name, description) VALUES
  ('relatorios.beneficiarias.gerar', 'Gerar relatórios de beneficiárias'),
  ('relatorios.oficinas.gerar', 'Gerar relatórios de oficinas'),
  ('relatorios.participacao.gerar', 'Gerar relatórios de participação'),
  ('relatorios.consolidado.gerar', 'Gerar relatório consolidado')
ON CONFLICT DO NOTHING;

