-- Schema PostgreSQL consolidado para o sistema Move Marias v2
-- Consolidado em 19/08/2025
-- Inclui todas as funcionalidades, melhorias de performance e recursos de auditoria

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Funções utilitárias
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_beneficiaria_audit()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    NEW.updated_by = current_setting('app.current_user_id')::integer;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION soft_delete_beneficiaria()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deleted_at = CURRENT_TIMESTAMP;
    NEW.deleted_by = current_setting('app.current_user_id')::integer;
    NEW.status = 'inativa';
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabela de Usuários (Sistema de Autenticação)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    papel VARCHAR(50) DEFAULT 'usuario' CHECK (papel IN ('superadmin', 'admin', 'gestor', 'usuario')),
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    tentativas_login INTEGER DEFAULT 0,
    status_login VARCHAR(20) DEFAULT 'ativo',
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Tentativas de Login
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT false
);

-- Tabela de Projetos
CREATE TABLE IF NOT EXISTS projetos (
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
CREATE TABLE IF NOT EXISTS oficinas (
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

-- Tabela de Beneficiárias com colunas de auditoria
CREATE TABLE IF NOT EXISTS beneficiarias (
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
    updated_by INTEGER REFERENCES usuarios(id),
    deleted_by INTEGER REFERENCES usuarios(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Participações
CREATE TABLE IF NOT EXISTS participacoes (
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

-- Tabela de Controle de Presença
CREATE TABLE IF NOT EXISTS controle_presenca (
    id SERIAL PRIMARY KEY,
    participacao_id INTEGER NOT NULL REFERENCES participacoes(id),
    data_aula DATE NOT NULL,
    presente BOOLEAN DEFAULT false,
    justificativa_falta TEXT,
    registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
    data_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(participacao_id, data_aula)
);

-- Tabela de Declarações
CREATE TABLE IF NOT EXISTS declaracoes_comparecimento (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    codigo_verificacao UUID NOT NULL DEFAULT uuid_generate_v4(),
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    carga_horaria INTEGER NOT NULL,
    conteudo_programatico TEXT,
    aproveitamento VARCHAR(50) DEFAULT 'satisfatorio',
    emitido_por INTEGER NOT NULL REFERENCES usuarios(id),
    data_emissao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true,
    UNIQUE(codigo_verificacao)
);

-- Tabela de Mensagens/Feed com particionamento
CREATE TABLE IF NOT EXISTS mensagens (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'informativo' CHECK (tipo IN ('informativo', 'urgente', 'evento', 'aviso')),
    autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    destinatario_tipo VARCHAR(50) DEFAULT 'todos' CHECK (destinatario_tipo IN ('todos', 'beneficiarias', 'gestores', 'especifico')),
    destinatario_id INTEGER REFERENCES usuarios(id),
    data_publicacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_expiracao TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true,
    lida BOOLEAN DEFAULT false,
    anexo_url VARCHAR(500),
    prioridade INTEGER DEFAULT 1 CHECK (prioridade >= 1 AND prioridade <= 3)
) PARTITION BY RANGE (data_publicacao);

-- Criar partição inicial para mensagens
CREATE TABLE IF NOT EXISTS mensagens_y2025m08 PARTITION OF mensagens
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

-- Tabela de Comentários
CREATE TABLE IF NOT EXISTS comentarios (
    id SERIAL PRIMARY KEY,
    mensagem_id INTEGER NOT NULL REFERENCES mensagens(id) ON DELETE CASCADE,
    autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    conteudo TEXT NOT NULL,
    data_comentario TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- Tabela de Documentos/Anexos
CREATE TABLE IF NOT EXISTS documentos (
    id SERIAL PRIMARY KEY,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL,
    tamanho_arquivo INTEGER,
    mime_type VARCHAR(100),
    hash_arquivo VARCHAR(64),
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    oficina_id INTEGER REFERENCES oficinas(id),
    projeto_id INTEGER REFERENCES projetos(id),
    uploaded_by INTEGER NOT NULL REFERENCES usuarios(id),
    data_upload TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- Tabela de Eventos de Auditoria
CREATE TABLE IF NOT EXISTS eventos_auditoria (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    modulo VARCHAR(50) NOT NULL,
    detalhes JSONB,
    ip_address VARCHAR(45),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- Tabela de Log de Auditoria
CREATE TABLE IF NOT EXISTS log_auditoria (
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

-- Tabela de Cache do Dashboard
CREATE TABLE IF NOT EXISTS dashboard_cache (
    key VARCHAR(100) PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    editavel BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Manutenção
CREATE TABLE IF NOT EXISTS maintenance_log (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    details JSONB
);

-- Triggers
CREATE TRIGGER update_usuarios_updated_at 
    BEFORE UPDATE ON usuarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projetos_updated_at 
    BEFORE UPDATE ON projetos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oficinas_updated_at 
    BEFORE UPDATE ON oficinas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beneficiarias_updated_at 
    BEFORE UPDATE ON beneficiarias 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participacoes_updated_at 
    BEFORE UPDATE ON participacoes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at 
    BEFORE UPDATE ON configuracoes_sistema 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_beneficiaria_audit
    BEFORE UPDATE ON beneficiarias
    FOR EACH ROW
    EXECUTE FUNCTION update_beneficiaria_audit();

CREATE TRIGGER tr_beneficiaria_soft_delete
    BEFORE UPDATE OF status ON beneficiarias
    FOR EACH ROW
    WHEN (NEW.status = 'inativa' AND OLD.status != 'inativa')
    EXECUTE FUNCTION soft_delete_beneficiaria();

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_papel ON usuarios(papel);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_cpf ON beneficiarias(cpf);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_nome ON beneficiarias(nome_completo);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_ativo ON beneficiarias(ativo);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_status ON beneficiarias(status);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_updated_by ON beneficiarias(updated_by);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_deleted_by ON beneficiarias(deleted_by);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_deleted_at ON beneficiarias(deleted_at);
CREATE INDEX IF NOT EXISTS idx_oficinas_data_inicio ON oficinas(data_inicio);
CREATE INDEX IF NOT EXISTS idx_oficinas_ativo ON oficinas(ativo);
CREATE INDEX IF NOT EXISTS idx_participacoes_beneficiaria ON participacoes(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_participacoes_oficina ON participacoes(oficina_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_data_publicacao ON mensagens(data_publicacao);
CREATE INDEX IF NOT EXISTS idx_mensagens_tipo ON mensagens(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_tipo ON eventos_auditoria(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_modulo ON eventos_auditoria(modulo);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_usuario ON eventos_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_data ON eventos_auditoria(data_criacao);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_ip ON eventos_auditoria(ip_address);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_detalhes ON eventos_auditoria USING GIN (detalhes);
CREATE INDEX IF NOT EXISTS idx_log_auditoria_data ON log_auditoria(data_operacao);
CREATE INDEX IF NOT EXISTS idx_log_auditoria_usuario ON log_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_expires ON dashboard_cache(expires_at);

-- Views Materializadas
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_beneficiarias_stats AS
SELECT 
    date_trunc('month', data_cadastro) as month,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN status = 'ativa' THEN 1 END) as ativas,
    COUNT(CASE WHEN status = 'inativa' THEN 1 END) as inativas
FROM beneficiarias
GROUP BY date_trunc('month', data_cadastro)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_beneficiarias_stats_month ON mv_beneficiarias_stats(month);

-- Funções de Manutenção
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
    -- Limpar cache expirado
    DELETE FROM dashboard_cache WHERE expires_at < NOW();
    
    -- Limpar tentativas de login antigas
    DELETE FROM login_attempts WHERE attempt_time < NOW() - INTERVAL '1 day';
    
    -- Registrar limpeza
    INSERT INTO maintenance_log (operation, executed_at, details)
    VALUES (
        'cleanup_old_data',
        NOW(),
        jsonb_build_object(
            'dashboard_cache_cleaned', (SELECT COUNT(*) FROM dashboard_cache WHERE expires_at < NOW()),
            'login_attempts_cleaned', (SELECT COUNT(*) FROM login_attempts WHERE attempt_time < NOW() - INTERVAL '1 day')
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Função para criar novas partições de mensagens
CREATE OR REPLACE FUNCTION create_message_partition() RETURNS void AS $$
DECLARE
    next_month DATE;
BEGIN
    next_month := date_trunc('month', NOW()) + interval '1 month';
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS mensagens_y%sm%s PARTITION OF mensagens
         FOR VALUES FROM (%L) TO (%L)',
        to_char(next_month, 'YYYY'),
        to_char(next_month, 'MM'),
        next_month,
        next_month + interval '1 month'
    );
    
    -- Registrar criação da partição
    INSERT INTO maintenance_log (operation, executed_at, details)
    VALUES (
        'create_message_partition',
        NOW(),
        jsonb_build_object(
            'partition_name', format('mensagens_y%sm%s', 
                to_char(next_month, 'YYYY'),
                to_char(next_month, 'MM')
            ),
            'date_range', jsonb_build_object(
                'from', next_month,
                'to', next_month + interval '1 month'
            )
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar view materializada
CREATE OR REPLACE FUNCTION refresh_mv_stats() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_beneficiarias_stats;
    
    INSERT INTO maintenance_log (operation, executed_at)
    VALUES ('refresh_mv_stats', NOW());
END;
$$ LANGUAGE plpgsql;

-- Dados iniciais
INSERT INTO usuarios (nome, email, senha_hash, papel) 
VALUES ('Admin', 'admin@move.com', '$2b$12$3pjw.ZRd85Of/hsWIJteyOQUx5rqVYbe/4e57TKKv7/KyvXq1kpLG', 'superadmin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo) 
VALUES 
    ('sistema_nome', 'Move Marias', 'Nome do sistema', 'string'),
    ('max_participantes_oficina', '30', 'Máximo de participantes por oficina', 'number'),
    ('horas_minimas_certificado', '20', 'Horas mínimas para emissão de certificado', 'number'),
    ('email_notificacoes', 'true', 'Enviar notificações por email', 'boolean')
ON CONFLICT (chave) DO NOTHING;

COMMIT;
