-- Presets de papéis: admin, gestor, operador
-- Admin: todas permissões conhecidas (exceto superadmin que já é bypass)
INSERT INTO role_permissions (role, permission)
SELECT 'admin', name FROM permissions
ON CONFLICT DO NOTHING;

-- Gestor: foco em beneficiárias/projetos/oficinas ( CRUD ), sem gerenciar usuários/roles
INSERT INTO role_permissions (role, permission)
SELECT 'gestor', name FROM permissions 
WHERE name LIKE 'beneficiarias.%' OR name LIKE 'projetos.%' OR name LIKE 'oficinas.%'
ON CONFLICT DO NOTHING;

-- Operador: leitura e registrar presença
INSERT INTO role_permissions (role, permission)
SELECT 'operador', name FROM permissions 
WHERE name IN ('beneficiarias.ler','projetos.ler','oficinas.ler','oficinas.presencas.registrar')
ON CONFLICT DO NOTHING;

