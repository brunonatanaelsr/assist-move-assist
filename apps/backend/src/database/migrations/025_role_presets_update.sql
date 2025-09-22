-- Preset adicional para papel 'profissional'
INSERT INTO role_permissions (role, permission)
SELECT 'profissional', name FROM permissions 
WHERE name IN (
  'beneficiarias.ler',
  'projetos.ler',
  'oficinas.ler',
  'oficinas.presencas.registrar'
)
ON CONFLICT DO NOTHING;

