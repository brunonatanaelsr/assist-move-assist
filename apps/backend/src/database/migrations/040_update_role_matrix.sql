-- Migração 044: amplia matriz de papéis/permissões conforme RBAC definido na especificação IMM

-- Novas permissões granulares (idempotentes)
INSERT INTO permissions (name, description) VALUES
  ('formularios.ler', 'Visualizar formulários estruturados'),
  ('formularios.criar', 'Criar formulários estruturados'),
  ('formularios.editar', 'Atualizar formulários estruturados'),
  ('formularios.excluir', 'Excluir formulários estruturados'),
  ('mensagens.ler', 'Visualizar mensagens internas'),
  ('mensagens.criar', 'Criar mensagens internas'),
  ('mensagens.editar', 'Editar mensagens internas'),
  ('mensagens.excluir', 'Excluir mensagens internas'),
  ('feed.ler', 'Visualizar feed institucional'),
  ('feed.criar', 'Publicar no feed institucional'),
  ('feed.editar', 'Editar publicações do feed'),
  ('feed.excluir', 'Excluir publicações do feed'),
  ('participacoes.ler', 'Visualizar inscrições em projetos/oficinas'),
  ('participacoes.criar', 'Criar inscrições em projetos/oficinas'),
  ('participacoes.editar', 'Atualizar inscrições em projetos/oficinas'),
  ('participacoes.excluir', 'Remover inscrições em projetos/oficinas'),
  ('participacoes.presencas.registrar', 'Registrar presenças vinculadas a inscrições'),
  ('relatorios.ler', 'Acessar relatórios consolidados'),
  ('relatorios.exportar', 'Exportar relatórios consolidados'),
  ('beneficiarias.self.ler', 'Beneficiária visualizar seus próprios dados'),
  ('formularios.self.ler', 'Beneficiária visualizar seus próprios formulários'),
  ('participacoes.self.ler', 'Beneficiária visualizar suas inscrições'),
  ('relatorios.beneficiarias.gerar', 'Gerar relatórios de beneficiárias'),
  ('relatorios.oficinas.gerar', 'Gerar relatórios de oficinas'),
  ('relatorios.participacao.gerar', 'Gerar relatórios de participação'),
  ('relatorios.consolidado.gerar', 'Gerar relatório consolidado')
ON CONFLICT (name) DO NOTHING;

-- Limpa presets antigos das roles que serão redefinidas
DELETE FROM role_permissions
WHERE role IN (
  'admin',
  'coordenacao',
  'tecnica_referencia',
  'educadora_social',
  'recepcao',
  'voluntaria',
  'financeiro_adm',
  'leitura_externa',
  'beneficiaria'
);

-- Admin continua recebendo todas as permissões
INSERT INTO role_permissions (role, permission)
SELECT 'admin', name FROM permissions
ON CONFLICT DO NOTHING;

-- Coordenação
INSERT INTO role_permissions (role, permission)
SELECT 'coordenacao', name FROM permissions
WHERE name IN (
  'beneficiarias.ler','beneficiarias.criar','beneficiarias.editar','beneficiarias.excluir',
  'formularios.ler','formularios.criar','formularios.editar','formularios.excluir',
  'projetos.ler','projetos.criar','projetos.editar','projetos.excluir',
  'oficinas.ler','oficinas.criar','oficinas.editar','oficinas.excluir',
  'oficinas.participantes.ver','oficinas.participantes.adicionar','oficinas.participantes.remover',
  'oficinas.presencas.registrar','oficinas.presencas.listar','oficinas.relatorio.exportar',
  'participacoes.ler','participacoes.criar','participacoes.editar','participacoes.excluir','participacoes.presencas.registrar',
  'mensagens.ler','mensagens.criar','mensagens.editar','mensagens.excluir',
  'feed.ler','feed.criar','feed.editar','feed.excluir',
  'relatorios.ler','relatorios.exportar','relatorios.beneficiarias.gerar','relatorios.oficinas.gerar','relatorios.participacao.gerar','relatorios.consolidado.gerar',
  'users.manage','roles.manage'
)
ON CONFLICT DO NOTHING;

-- Técnica de Referência
INSERT INTO role_permissions (role, permission)
SELECT 'tecnica_referencia', name FROM permissions
WHERE name IN (
  'beneficiarias.ler','beneficiarias.criar','beneficiarias.editar',
  'formularios.ler','formularios.criar','formularios.editar','formularios.excluir',
  'projetos.ler','oficinas.ler',
  'oficinas.participantes.ver','oficinas.participantes.adicionar','oficinas.participantes.remover',
  'oficinas.presencas.registrar','oficinas.presencas.listar',
  'participacoes.ler','participacoes.criar','participacoes.editar','participacoes.excluir','participacoes.presencas.registrar',
  'mensagens.ler','mensagens.criar','mensagens.editar','mensagens.excluir',
  'feed.ler','feed.criar',
  'relatorios.ler'
)
ON CONFLICT DO NOTHING;

-- Educadora Social
INSERT INTO role_permissions (role, permission)
SELECT 'educadora_social', name FROM permissions
WHERE name IN (
  'beneficiarias.ler',
  'formularios.ler','formularios.criar',
  'projetos.ler','oficinas.ler',
  'oficinas.participantes.ver','oficinas.participantes.adicionar','oficinas.participantes.remover',
  'oficinas.presencas.registrar','oficinas.presencas.listar',
  'participacoes.ler','participacoes.criar','participacoes.editar','participacoes.excluir','participacoes.presencas.registrar',
  'mensagens.ler','mensagens.criar','mensagens.editar','mensagens.excluir',
  'feed.ler','feed.criar'
)
ON CONFLICT DO NOTHING;

-- Recepção
INSERT INTO role_permissions (role, permission)
SELECT 'recepcao', name FROM permissions
WHERE name IN (
  'beneficiarias.ler','beneficiarias.criar',
  'formularios.ler','formularios.criar',
  'projetos.ler','oficinas.ler',
  'participacoes.ler','participacoes.criar',
  'oficinas.presencas.listar',
  'mensagens.ler','mensagens.criar',
  'feed.ler'
)
ON CONFLICT DO NOTHING;

-- Voluntária
INSERT INTO role_permissions (role, permission)
SELECT 'voluntaria', name FROM permissions
WHERE name IN (
  'beneficiarias.ler',
  'formularios.ler',
  'projetos.ler','oficinas.ler',
  'participacoes.ler',
  'mensagens.ler',
  'feed.ler'
)
ON CONFLICT DO NOTHING;

-- Financeiro/Administrativo
INSERT INTO role_permissions (role, permission)
SELECT 'financeiro_adm', name FROM permissions
WHERE name IN (
  'beneficiarias.ler',
  'formularios.ler',
  'projetos.ler','oficinas.ler',
  'participacoes.ler',
  'feed.ler',
  'mensagens.ler',
  'relatorios.ler','relatorios.exportar','relatorios.beneficiarias.gerar','relatorios.oficinas.gerar','relatorios.participacao.gerar','relatorios.consolidado.gerar'
)
ON CONFLICT DO NOTHING;

-- Leitura externa (auditoria/pesquisa)
INSERT INTO role_permissions (role, permission)
SELECT 'leitura_externa', name FROM permissions
WHERE name IN (
  'beneficiarias.ler',
  'formularios.ler',
  'projetos.ler','oficinas.ler',
  'participacoes.ler',
  'relatorios.ler'
)
ON CONFLICT DO NOTHING;

-- Acesso limitado da beneficiária
INSERT INTO role_permissions (role, permission) VALUES
  ('beneficiaria', 'beneficiarias.self.ler'),
  ('beneficiaria', 'formularios.self.ler'),
  ('beneficiaria', 'participacoes.self.ler'),
  ('beneficiaria', 'feed.ler')
ON CONFLICT DO NOTHING;
