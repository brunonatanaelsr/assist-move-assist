-- Ajustes de presets
-- Operador: remover leitura de projetos
DELETE FROM role_permissions WHERE role = 'operador' AND permission = 'projetos.ler';

-- Analista: somente relatorios.*
INSERT INTO role_permissions (role, permission)
SELECT 'analista', name FROM permissions WHERE name LIKE 'relatorios.%'
ON CONFLICT DO NOTHING;

