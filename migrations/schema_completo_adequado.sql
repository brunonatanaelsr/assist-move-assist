-- Schema PostgreSQL completo para o sistema Move Marias
-- Adequado às funcionalidades do sistema

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabela de Usuários (Sistema de Autenticação)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    papel VARCHAR(50) DEFAULT 'usuario' CHECK (papel IN ('superadmin', 'admin', 'gestor', 'usuario')),
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Projetos
CREATE TABLE projetos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status VARCHAR(50) DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'finalizado', 'cancelado')),
    responsavel_id INTEGER REFERENCES usuarios(id),
    orcamento DECIMAL(12, 2),
    localizacao VARCHAR(500),
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Oficinas
CREATE TABLE oficinas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    instrutor VARCHAR(255),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    local VARCHAR(500),
    vagas_totais INTEGER DEFAULT 20,
    vagas_ocupadas INTEGER DEFAULT 0,
    ativa BOOLEAN DEFAULT true,
    projeto_id INTEGER REFERENCES projetos(id),
    responsavel_id INTEGER REFERENCES usuarios(id),
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Beneficiárias
CREATE TABLE beneficiarias (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(20),
    data_nascimento DATE,
    email VARCHAR(255),
    telefone VARCHAR(20),
    telefone_alternativo VARCHAR(20),
    endereco TEXT,
    bairro VARCHAR(100),
    cep VARCHAR(10),
    cidade VARCHAR(100) DEFAULT 'São Paulo',
    estado VARCHAR(2) DEFAULT 'SP',
    escolaridade VARCHAR(50),
    profissao VARCHAR(100),
    renda_familiar DECIMAL(10, 2),
    situacao_trabalho VARCHAR(50),
    tem_filhos BOOLEAN DEFAULT false,
    quantidade_filhos INTEGER DEFAULT 0,
    observacoes TEXT,
    status VARCHAR(50) DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa', 'pendente', 'suspensa')),
    ativo BOOLEAN DEFAULT true,
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Participações (Relação entre Beneficiárias e Oficinas)
CREATE TABLE participacoes (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_participacao VARCHAR(50) DEFAULT 'inscrita' CHECK (status_participacao IN ('inscrita', 'presente', 'ausente', 'cancelada')),
    nota_participacao TEXT,
    avaliacao INTEGER CHECK (avaliacao >= 1 AND avaliacao <= 5),
    data_participacao TIMESTAMP WITH TIME ZONE,
    certificado_emitido BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(beneficiaria_id, oficina_id)
);

-- Tabela de Declarações de Comparecimento
CREATE TABLE declaracoes_comparecimento (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    codigo_verificacao VARCHAR(100) UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    carga_horaria INTEGER NOT NULL,
    conteudo_programatico TEXT,
    aproveitamento VARCHAR(50) DEFAULT 'satisfatorio',
    emitido_por INTEGER NOT NULL REFERENCES usuarios(id),
    data_emissao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- Tabela de Mensagens/Feed
CREATE TABLE mensagens (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'informativo' CHECK (tipo IN ('informativo', 'urgente', 'evento', 'aviso')),
    autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    destinatario_tipo VARCHAR(50) DEFAULT 'todos' CHECK (destinatario_tipo IN ('todos', 'beneficiarias', 'gestores', 'especifico')),
    destinatario_id INTEGER REFERENCES usuarios(id), -- Para mensagens específicas
    data_publicacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_expiracao TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true,
    lida BOOLEAN DEFAULT false,
    anexo_url VARCHAR(500),
    prioridade INTEGER DEFAULT 1 CHECK (prioridade >= 1 AND prioridade <= 3)
);

-- Tabela de Comentários (para o feed de mensagens)
CREATE TABLE comentarios (
    id SERIAL PRIMARY KEY,
    mensagem_id INTEGER NOT NULL REFERENCES mensagens(id) ON DELETE CASCADE,
    autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    conteudo TEXT NOT NULL,
    data_comentario TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- Tabela de Documentos/Anexos
CREATE TABLE documentos (
    id SERIAL PRIMARY KEY,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL,
    tamanho_arquivo INTEGER,
    mime_type VARCHAR(100),
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    oficina_id INTEGER REFERENCES oficinas(id),
    projeto_id INTEGER REFERENCES projetos(id),
    uploaded_by INTEGER NOT NULL REFERENCES usuarios(id),
    data_upload TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- Tabela de Log de Auditoria
CREATE TABLE log_auditoria (
    id SERIAL PRIMARY KEY,
    tabela_afetada VARCHAR(100) NOT NULL,
    operacao VARCHAR(10) NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE')),
    registro_id INTEGER NOT NULL,
    valores_antigos JSONB,
    valores_novos JSONB,
    usuario_id INTEGER REFERENCES usuarios(id),
    ip_usuario INET,
    user_agent TEXT,
    data_operacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Configurações do Sistema
CREATE TABLE configuracoes_sistema (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    editavel BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Presença (para controle detalhado de presença)
CREATE TABLE controle_presenca (
    id SERIAL PRIMARY KEY,
    participacao_id INTEGER NOT NULL REFERENCES participacoes(id),
    data_aula DATE NOT NULL,
    presente BOOLEAN DEFAULT false,
    justificativa_falta TEXT,
    registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
    data_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(participacao_id, data_aula)
);

-- Criar triggers para atualização automática de timestamps
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projetos_updated_at BEFORE UPDATE ON projetos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_oficinas_updated_at BEFORE UPDATE ON oficinas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_beneficiarias_updated_at BEFORE UPDATE ON beneficiarias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_participacoes_updated_at BEFORE UPDATE ON participacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_configuracoes_updated_at BEFORE UPDATE ON configuracoes_sistema FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Criar índices para melhor performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX idx_beneficiarias_cpf ON beneficiarias(cpf);
CREATE INDEX idx_beneficiarias_nome ON beneficiarias(nome_completo);
CREATE INDEX idx_beneficiarias_ativo ON beneficiarias(ativo);
CREATE INDEX idx_beneficiarias_status ON beneficiarias(status);
CREATE INDEX idx_oficinas_data_inicio ON oficinas(data_inicio);
CREATE INDEX idx_oficinas_ativo ON oficinas(ativo);
CREATE INDEX idx_participacoes_beneficiaria ON participacoes(beneficiaria_id);
CREATE INDEX idx_participacoes_oficina ON participacoes(oficina_id);
CREATE INDEX idx_mensagens_data_publicacao ON mensagens(data_publicacao);
CREATE INDEX idx_mensagens_tipo ON mensagens(tipo);
CREATE INDEX idx_log_auditoria_data ON log_auditoria(data_operacao);
CREATE INDEX idx_log_auditoria_usuario ON log_auditoria(usuario_id);

-- Inserir dados iniciais
-- Usuário administrador padrão
INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES 
('Bruno Admin', 'bruno@move.com', '$2a$12$8kZz4Pl3qJZ9X1rH.7hGsOZF7QZLJjAc1d2Ik7qJ6Lz3.8XhAaAaA', 'superadmin'),
('Gestor Teste', 'gestor@move.com', '$2a$12$8kZz4Pl3qJZ9X1rH.7hGsOZF7QZLJjAc1d2Ik7qJ6Lz3.8XhAaAaA', 'gestor');

-- Projeto exemplo
INSERT INTO projetos (nome, descricao, data_inicio, responsavel_id) VALUES 
('Move Marias 2025', 'Programa de capacitação e empoderamento feminino', '2025-01-01', 1);

-- Configurações iniciais do sistema
INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo) VALUES 
('sistema_nome', 'Move Marias', 'Nome do sistema', 'string'),
('max_participantes_oficina', '30', 'Máximo de participantes por oficina', 'number'),
('horas_minimas_certificado', '20', 'Horas mínimas para emissão de certificado', 'number'),
('email_notificacoes', 'true', 'Enviar notificações por email', 'boolean');

-- Beneficiárias de exemplo
INSERT INTO beneficiarias (nome_completo, email, telefone, bairro) VALUES 
('Maria Silva Santos', 'maria@email.com', '(11) 98765-4321', 'Centro'),
('Ana Paula Oliveira', 'ana@email.com', '(11) 87654-3210', 'Jardim São Paulo'),
('Fernanda Costa Lima', 'fernanda@email.com', '(11) 76543-2109', 'Vila Madalena');

-- Oficina de exemplo
INSERT INTO oficinas (nome, descricao, instrutor, data_inicio, data_fim, horario_inicio, horario_fim, local, vagas_totais, projeto_id, responsavel_id) VALUES 
('Curso de Informática Básica', 'Introdução ao uso de computadores e internet', 'Prof. João Silva', '2025-08-15', '2025-08-30', '09:00', '12:00', 'Sala 1 - Centro Comunitário', 25, 1, 1),
('Workshop de Empreendedorismo', 'Como iniciar seu próprio negócio', 'Dra. Carla Mendes', '2025-09-01', '2025-09-15', '14:00', '17:00', 'Auditório Principal', 30, 1, 1);

COMMIT;
