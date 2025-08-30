INSERT INTO permissions (name, description) VALUES
  ('oficinas.horarios.listar', 'Listar horários disponíveis de oficina'),
  ('oficinas.conflito.verificar', 'Verificar conflitos de horário de oficina')
ON CONFLICT DO NOTHING;

