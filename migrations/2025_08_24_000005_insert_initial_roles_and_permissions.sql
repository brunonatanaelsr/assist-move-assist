-- Inserir perfis básicos
INSERT INTO perfis (nome, descricao) VALUES
('admin', 'Administrador do sistema com acesso total'),
('coordenador', 'Coordenador com acesso à gestão de oficinas e usuários'),
('facilitador', 'Facilitador de oficinas'),
('participante', 'Participante das oficinas');

-- Inserir permissões básicas
INSERT INTO permissoes (nome, descricao, modulo) VALUES
-- Módulo de Usuários
('usuarios.visualizar', 'Visualizar usuários', 'usuarios'),
('usuarios.criar', 'Criar novos usuários', 'usuarios'),
('usuarios.editar', 'Editar usuários existentes', 'usuarios'),
('usuarios.excluir', 'Excluir usuários', 'usuarios'),

-- Módulo de Oficinas
('oficinas.visualizar', 'Visualizar oficinas', 'oficinas'),
('oficinas.criar', 'Criar novas oficinas', 'oficinas'),
('oficinas.editar', 'Editar oficinas existentes', 'oficinas'),
('oficinas.excluir', 'Excluir oficinas', 'oficinas'),
('oficinas.gerenciar_inscricoes', 'Gerenciar inscrições nas oficinas', 'oficinas'),

-- Módulo de Feed
('feed.visualizar', 'Visualizar posts do feed', 'feed'),
('feed.criar', 'Criar novos posts', 'feed'),
('feed.editar', 'Editar posts existentes', 'feed'),
('feed.excluir', 'Excluir posts', 'feed'),

-- Módulo de Sistema
('sistema.configuracoes', 'Gerenciar configurações do sistema', 'sistema'),
('sistema.logs', 'Visualizar logs do sistema', 'sistema');

-- Associar permissões aos perfis
-- Admin tem todas as permissões
INSERT INTO perfil_permissoes (perfil_id, permissao_id)
SELECT (SELECT id FROM perfis WHERE nome = 'admin'),
       id
FROM permissoes;

-- Coordenador
INSERT INTO perfil_permissoes (perfil_id, permissao_id)
SELECT (SELECT id FROM perfis WHERE nome = 'coordenador'),
       id
FROM permissoes
WHERE nome IN (
    'usuarios.visualizar',
    'usuarios.criar',
    'usuarios.editar',
    'oficinas.visualizar',
    'oficinas.criar',
    'oficinas.editar',
    'oficinas.gerenciar_inscricoes',
    'feed.visualizar',
    'feed.criar',
    'feed.editar'
);

-- Facilitador
INSERT INTO perfil_permissoes (perfil_id, permissao_id)
SELECT (SELECT id FROM perfis WHERE nome = 'facilitador'),
       id
FROM permissoes
WHERE nome IN (
    'oficinas.visualizar',
    'oficinas.criar',
    'oficinas.editar',
    'feed.visualizar',
    'feed.criar'
);

-- Participante
INSERT INTO perfil_permissoes (perfil_id, permissao_id)
SELECT (SELECT id FROM perfis WHERE nome = 'participante'),
       id
FROM permissoes
WHERE nome IN (
    'oficinas.visualizar',
    'feed.visualizar'
);
