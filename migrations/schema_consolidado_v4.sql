-- Schema PostgreSQL consolidado para o sistema Move Marias v4 (consolidado e ajustado)
-- Consolidado em 19/08/2025
-- Inclui todas as funcionalidades, melhorias de performance e recursos de auditoria

-- =====================
-- Extensões necessárias
-- =====================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================
-- Funções utilitárias
-- ==================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_beneficiaria_audit()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    -- missing_ok = true para evitar erro quando a GUC não estiver setada
    NEW.updated_by = (current_setting('app.current_user_id', true))::integer;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION soft_delete_beneficiaria()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deleted_at = CURRENT_TIMESTAMP;
    NEW.deleted_by = (current_setting('app.current_user_id', true))::integer;
    NEW.status = 'inativa';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Tabela de Usuários (Sistema de Autenticação)
-- ================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    papel VARCHAR(50) DEFAULT 'usuario' CHECK (papel IN ('superadmin','admin','gestor','usuario')),
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    tentativas_login INTEGER DEFAULT 0,
    status_login VARCHAR(20) DEFAULT 'ativo',
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- Tabela de Tentativas de Login
-- =====================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT false
);

-- ====================
-- Tabela de Projetos
-- ====================
-- Consolidado: une campos do v2 e do v3
CREATE TABLE IF NOT EXISTS projetos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE,                -- v2
    data_fim_prevista DATE,       -- v3
    data_fim_real DATE,           -- v3
    status VARCHAR(50) DEFAULT 'ativo' 
        CHECK (status IN ('planejamento','em_andamento','ativo','pausado','finalizado','concluido','cancelado')),
    responsavel_id INTEGER REFERENCES usuarios(id),
    orcamento DECIMAL(12, 2),
    localizacao VARCHAR(500),     -- unificado (v2); v3 usava local_execucao
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================
-- Tabela de Oficinas
-- ===================
-- Consolidado: une campos/nomes do v2 e do v3
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
    vagas_totais INTEGER DEFAULT 20,   -- v2
    vagas_ocupadas INTEGER DEFAULT 0,  -- v2
    ativa BOOLEAN DEFAULT true,        -- compatibilidade antiga
    status VARCHAR(50) DEFAULT 'ativa' CHECK (status IN ('ativa','concluida','cancelada')), -- v3
    projeto_id INTEGER REFERENCES projetos(id),
    responsavel_id INTEGER REFERENCES usuarios(id),
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- Tabela de Beneficiárias (com auditoria) - unificada
-- ================================================
CREATE TABLE IF NOT EXISTS beneficiarias (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(20),
    data_nascimento DATE,
    email VARCHAR(255),
    telefone VARCHAR(20),
    telefone_alternativo VARCHAR(20),
    -- Campos adicionais do v3
    contato1 VARCHAR(20),
    contato2 VARCHAR(20),
    escolaridade VARCHAR(50),
    profissao VARCHAR(100),
    renda_familiar DECIMAL(10, 2),
    composicao_familiar TEXT,
    programa_servico TEXT,
    necessidades_especiais TEXT,
    medicamentos TEXT,
    alergias TEXT,
    contato_emergencia TEXT,
    data_inicio_instituto DATE,
    -- Endereço
    endereco TEXT,
    bairro VARCHAR(100),
    cep VARCHAR(10),
    cidade VARCHAR(100) DEFAULT 'São Paulo',
    estado VARCHAR(2) DEFAULT 'SP',
    observacoes TEXT,
    -- Auditoria e status
    status VARCHAR(50) DEFAULT 'ativa' CHECK (status IN ('ativa','inativa','pendente','suspensa')),
    ativo BOOLEAN DEFAULT true,
    updated_by INTEGER REFERENCES usuarios(id),
    deleted_by INTEGER REFERENCES usuarios(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================
-- Tabela de Participações
-- ========================
-- Consolidado: mantém regras do v2 e acrescenta projeto_id (v3)
CREATE TABLE IF NOT EXISTS participacoes (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    projeto_id INTEGER REFERENCES projetos(id),
    oficina_id INTEGER REFERENCES oficinas(id),
    data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_participacao VARCHAR(50) DEFAULT 'inscrita' 
        CHECK (status_participacao IN ('inscrita','presente','ausente','cancelada','confirmada','concluida','desistente')),
    nota_participacao TEXT,
    avaliacao INTEGER CHECK (avaliacao >= 1 AND avaliacao <= 5),
    data_participacao TIMESTAMP WITH TIME ZONE,
    certificado_emitido BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(beneficiaria_id, oficina_id)
);

-- ============================
-- Tabela de Controle de Presença
-- ============================
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

-- =========================
-- Tabela de Declarações
-- =========================
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

-- ==============================================
-- Tabela de Mensagens/Feed com particionamento
-- ==============================================
CREATE TABLE IF NOT EXISTS mensagens (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'informativo' CHECK (tipo IN ('informativo','urgente','evento','aviso')),
    autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    destinatario_tipo VARCHAR(50) DEFAULT 'todos' CHECK (destinatario_tipo IN ('todos','beneficiarias','gestores','especifico')),
    destinatario_id INTEGER REFERENCES usuarios(id),
    data_publicacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_expiracao TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true,
    lida BOOLEAN DEFAULT false,
    anexo_url VARCHAR(500),
    prioridade INTEGER DEFAULT 1 CHECK (prioridade >= 1 AND prioridade <= 3)
) PARTITION BY RANGE (data_publicacao);

-- Partição atual (Agosto/2025)
CREATE TABLE IF NOT EXISTS mensagens_y2025m08 PARTITION OF mensagens
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

-- ======================
-- Tabela de Comentários
-- ======================
CREATE TABLE IF NOT EXISTS comentarios (
    id SERIAL PRIMARY KEY,
    mensagem_id INTEGER NOT NULL REFERENCES mensagens(id) ON DELETE CASCADE,
    autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    conteudo TEXT NOT NULL,
    data_comentario TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- ==============================
-- Tabela de Documentos/Anexos
-- ==============================
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

-- ===============================
-- Tabela de Eventos de Auditoria
-- ===============================
CREATE TABLE IF NOT EXISTS eventos_auditoria (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    modulo VARCHAR(50) NOT NULL,
    detalhes JSONB,
    ip_address VARCHAR(45),
    ip_origem VARCHAR(45),
    data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- ============================
-- Tabela de Log de Auditoria
-- ============================
CREATE TABLE IF NOT EXISTS log_auditoria (
    id SERIAL PRIMARY KEY,
    tabela_afetada VARCHAR(100) NOT NULL,
    operacao VARCHAR(10) NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE')),
    registro_id INTEGER NOT NULL,
    valores_antigos JSONB,
    valores_novos JSONB,
    usuario_id INTEGER REFERENCES usuarios(id),
    ip_usuario INET,
    user_agent TEXT,
    data_operacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================
-- Tabelas para o Dashboard
-- =============================
CREATE TABLE IF NOT EXISTS dashboard_cache (
    key VARCHAR(100) PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cache_type VARCHAR(50) NOT NULL DEFAULT 'general',
    user_id INTEGER REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    widget_type VARCHAR(50) NOT NULL,
    posicao INTEGER NOT NULL,
    configuracoes JSONB DEFAULT '{}'::jsonb,
    visivel BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_alertas (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    mensagem TEXT NOT NULL,
    nivel VARCHAR(20) NOT NULL DEFAULT 'info',
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_fim TIMESTAMP WITH TIME ZONE,
    usuarios_alvo JSONB,
    acoes_requeridas JSONB,
    resolvido BOOLEAN DEFAULT false,
    resolvido_por INTEGER REFERENCES usuarios(id),
    data_resolucao TIMESTAMP WITH TIME ZONE,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_kpis (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    formula TEXT NOT NULL,
    meta DECIMAL(10,2),
    unidade VARCHAR(20),
    frequencia_atualizacao VARCHAR(20) DEFAULT 'diaria',
    responsavel_id INTEGER REFERENCES usuarios(id),
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- Tabela de Configurações do Sistema
-- ===================================
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'string' CHECK (tipo IN ('string','number','boolean','json')),
    editavel BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- Tabela de Manutenção
-- =====================
CREATE TABLE IF NOT EXISTS maintenance_log (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    details JSONB
);

-- ==============
-- Triggers (DDL)
-- ==============
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

-- =====================
-- Índices (Performance)
-- =====================
CREATE INDEX IF NOT EXISTS idx_usuarios_email           ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo           ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_papel           ON usuarios(papel);

CREATE INDEX IF NOT EXISTS idx_beneficiarias_cpf        ON beneficiarias(cpf);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_nome       ON beneficiarias(nome_completo);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_ativo      ON beneficiarias(ativo);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_status     ON beneficiarias(status);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_updated_by ON beneficiarias(updated_by);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_deleted_by ON beneficiarias(deleted_by);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_deleted_at ON beneficiarias(deleted_at);
-- Índices parciais úteis
CREATE INDEX IF NOT EXISTS idx_beneficiarias_bairro_ativo ON beneficiarias(bairro) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_oficinas_data_inicio     ON oficinas(data_inicio);
CREATE INDEX IF NOT EXISTS idx_oficinas_ativo           ON oficinas(ativo);
CREATE INDEX IF NOT EXISTS idx_oficinas_projeto_ativo   ON oficinas(projeto_id) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_participacoes_beneficiaria     ON participacoes(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_participacoes_oficina          ON participacoes(oficina_id);
CREATE INDEX IF NOT EXISTS idx_participacoes_projeto_ativo    ON participacoes(projeto_id) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_mensagens_data_publicacao ON mensagens(data_publicacao);
CREATE INDEX IF NOT EXISTS idx_mensagens_tipo            ON mensagens(tipo);

CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_tipo    ON eventos_auditoria(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_modulo  ON eventos_auditoria(modulo);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_usuario ON eventos_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_data    ON eventos_auditoria(data_criacao);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_ip      ON eventos_auditoria(ip_address);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_detalhes ON eventos_auditoria USING GIN (detalhes);

CREATE INDEX IF NOT EXISTS idx_log_auditoria_data   ON log_auditoria(data_operacao);
CREATE INDEX IF NOT EXISTS idx_log_auditoria_usuario ON log_auditoria(usuario_id);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempt_time DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_cache_expires ON dashboard_cache(expires_at);

-- =====================================
-- Views Materializadas para o Dashboard
-- =====================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_beneficiarias_stats AS
SELECT 
    date_trunc('month', b.data_cadastro) AS month,
    COUNT(*) AS total_registros,
    COUNT(CASE WHEN status = 'ativa' THEN 1 END) AS ativas,
    COUNT(CASE WHEN status = 'inativa' THEN 1 END) AS inativas,
    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN b.id END) AS com_participacao,
    COUNT(DISTINCT CASE WHEN dc.id IS NOT NULL THEN b.id END) AS com_declaracoes
FROM beneficiarias b
LEFT JOIN participacoes p ON b.id = p.beneficiaria_id AND p.ativo = true
LEFT JOIN declaracoes_comparecimento dc ON b.id = dc.beneficiaria_id
GROUP BY date_trunc('month', b.data_cadastro)
WITH DATA;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_oficinas_stats AS
SELECT 
    date_trunc('month', o.data_inicio) AS month,
    COUNT(DISTINCT o.id) AS total_oficinas,
    SUM(o.vagas_totais) AS total_vagas,
    SUM(o.vagas_ocupadas) AS vagas_ocupadas,
    COUNT(DISTINCT p.beneficiaria_id) AS total_participantes,
    ROUND(AVG(NULLIF(p.avaliacao, 0))::numeric, 2) AS media_avaliacao
FROM oficinas o
LEFT JOIN participacoes p ON o.id = p.oficina_id AND p.ativo = true
GROUP BY date_trunc('month', o.data_inicio)
WITH DATA;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_projetos_stats AS
SELECT 
    date_trunc('month', pr.data_inicio) AS month,
    COUNT(DISTINCT pr.id) AS total_projetos,
    COUNT(DISTINCT o.id) AS total_oficinas,
    COUNT(DISTINCT pa.beneficiaria_id) AS total_beneficiarias,
    SUM(pr.orcamento) AS orcamento_total
FROM projetos pr
LEFT JOIN oficinas o ON pr.id = o.projeto_id AND o.ativo = true
LEFT JOIN participacoes pa ON o.id = pa.oficina_id AND pa.ativo = true
GROUP BY date_trunc('month', pr.data_inicio)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_beneficiarias_stats_month ON mv_beneficiarias_stats(month);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_oficinas_stats_month ON mv_oficinas_stats(month);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_projetos_stats_month ON mv_projetos_stats(month);

-- =======================
-- Funções de Manutenção
-- =======================
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
DECLARE
    v_cache_cleaned bigint;
    v_login_cleaned bigint;
BEGIN
    -- Limpar cache expirado
    DELETE FROM dashboard_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS v_cache_cleaned = ROW_COUNT;
    
    -- Limpar tentativas de login antigas
    DELETE FROM login_attempts WHERE attempt_time < NOW() - INTERVAL '1 day';
    GET DIAGNOSTICS v_login_cleaned = ROW_COUNT;
    
    -- Registrar limpeza
    INSERT INTO maintenance_log (operation, executed_at, details)
    VALUES (
        'cleanup_old_data',
        NOW(),
        jsonb_build_object(
            'dashboard_cache_cleaned', v_cache_cleaned,
            'login_attempts_cleaned', v_login_cleaned
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Criação automática de próxima partição de mensagens (mês seguinte)
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
    
    INSERT INTO maintenance_log (operation, executed_at, details)
    VALUES (
        'create_message_partition',
        NOW(),
        jsonb_build_object(
            'partition_name', format('mensagens_y%sm%s', to_char(next_month, 'YYYY'), to_char(next_month, 'MM')),
            'date_range', jsonb_build_object('from', next_month, 'to', next_month + interval '1 month')
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Atualização das materialized views (sem CONCURRENTLY porque funções rodam em transação)
CREATE OR REPLACE FUNCTION refresh_mv_stats() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_beneficiarias_stats;
    REFRESH MATERIALIZED VIEW mv_oficinas_stats;
    REFRESH MATERIALIZED VIEW mv_projetos_stats;
    
    INSERT INTO maintenance_log (operation, executed_at, details)
    VALUES ('refresh_mv_stats', NOW(), NULL);
END;
$$ LANGUAGE plpgsql;

-- ==================
-- Comentários úteis
-- ==================
COMMENT ON TABLE usuarios IS 'Tabela de usuários do sistema (superadmin/admin/gestor/usuario)';
COMMENT ON TABLE projetos IS 'Projetos sociais realizados pela instituição (campos unificados v2/v3)';
COMMENT ON TABLE beneficiarias IS 'Cadastro de beneficiárias com auditoria e campos socioeconômicos';
COMMENT ON TABLE oficinas IS 'Oficinas/atividades vinculadas a projetos (status e controle de vagas)';
COMMENT ON TABLE participacoes IS 'Participações de beneficiárias em oficinas e projetos';
COMMENT ON TABLE eventos_auditoria IS 'Eventos e logs de auditoria por módulo/usuário';
COMMENT ON TABLE mensagens IS 'Feed de mensagens com particionamento mensal';
COMMENT ON TABLE declaracoes_comparecimento IS 'Declarações/atestados com verificação via UUID';

-- ===============
-- Dados iniciais
-- ===============
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
