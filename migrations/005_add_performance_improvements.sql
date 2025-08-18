-- Migration: 005_add_performance_improvements.sql

-- Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_beneficiarias_status ON beneficiarias(status) WHERE status != 'inativa';
CREATE INDEX IF NOT EXISTS idx_beneficiarias_created_at ON beneficiarias(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oficinas_data_inicio ON oficinas(data_inicio) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_atendimentos_data ON atendimentos(data_atendimento DESC) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_anamneses_beneficiaria ON anamneses_social(beneficiaria_id, created_at DESC);

-- Criar tabela de cache para dashboard
CREATE TABLE IF NOT EXISTS dashboard_cache (
    key VARCHAR(100) PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dashboard_cache_expires ON dashboard_cache(expires_at);

-- Criar tabela para tentativas de login
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    attempt_time TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempt_time DESC);

-- Criar tabela para bloqueios de usuário
CREATE TABLE IF NOT EXISTS user_blocks (
    email VARCHAR(100) PRIMARY KEY,
    blocked_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Adicionar funções para limpeza automática
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
    -- Limpar cache expirado
    DELETE FROM dashboard_cache WHERE expires_at < NOW();
    
    -- Limpar tentativas de login antigas
    DELETE FROM login_attempts WHERE attempt_time < NOW() - INTERVAL '1 day';
    
    -- Limpar bloqueios expirados
    DELETE FROM user_blocks WHERE blocked_until < NOW();
    
    -- Registrar limpeza
    INSERT INTO maintenance_log (operation, executed_at)
    VALUES ('cleanup_old_data', NOW());
END;
$$ LANGUAGE plpgsql;

-- Criar tabela de log de manutenção
CREATE TABLE IF NOT EXISTS maintenance_log (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP NOT NULL
);

-- Adicionar job para limpeza diária (precisa ser agendado no crontab)
COMMENT ON FUNCTION cleanup_old_data() IS 'Função para limpeza diária de dados temporários. Agendar: 0 3 * * * psql -d movemarias -c "SELECT cleanup_old_data();"';

-- Criar views materializadas para relatórios comuns
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_beneficiarias_stats AS
SELECT 
    date_trunc('month', created_at) as month,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN status = 'ativa' THEN 1 END) as ativas,
    COUNT(CASE WHEN status = 'inativa' THEN 1 END) as inativas
FROM beneficiarias
GROUP BY date_trunc('month', created_at)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_beneficiarias_stats_month ON mv_beneficiarias_stats(month);

-- Função para atualizar view materializada
CREATE OR REPLACE FUNCTION refresh_mv_stats() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_beneficiarias_stats;
END;
$$ LANGUAGE plpgsql;

-- Adicionar triggers para manter cache consistente
CREATE OR REPLACE FUNCTION invalidate_dashboard_cache() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM dashboard_cache WHERE key LIKE 'dashboard:stats:%';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_dashboard_cache_beneficiarias
AFTER INSERT OR UPDATE OR DELETE ON beneficiarias
FOR EACH STATEMENT EXECUTE FUNCTION invalidate_dashboard_cache();

CREATE TRIGGER trg_invalidate_dashboard_cache_oficinas
AFTER INSERT OR UPDATE OR DELETE ON oficinas
FOR EACH STATEMENT EXECUTE FUNCTION invalidate_dashboard_cache();

-- Adicionar particionamento para tabelas grandes (exemplo para mensagens)
CREATE TABLE IF NOT EXISTS mensagens_partitioned (
    id SERIAL,
    remetente_id INTEGER NOT NULL,
    destinatario_id INTEGER,
    conteudo TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Criar partições iniciais
CREATE TABLE IF NOT EXISTS mensagens_y2025m01 PARTITION OF mensagens_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
    
CREATE TABLE IF NOT EXISTS mensagens_y2025m02 PARTITION OF mensagens_partitioned
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
    
-- Função para criar partições futuras automaticamente
CREATE OR REPLACE FUNCTION create_message_partition() RETURNS void AS $$
DECLARE
    next_month DATE;
BEGIN
    next_month := date_trunc('month', NOW()) + interval '1 month';
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS mensagens_y%sm%s PARTITION OF mensagens_partitioned
         FOR VALUES FROM (%L) TO (%L)',
        to_char(next_month, 'YYYY'),
        to_char(next_month, 'MM'),
        next_month,
        next_month + interval '1 month'
    );
END;
$$ LANGUAGE plpgsql;

-- Agendar criação de partições (também precisa ser agendado no crontab)
COMMENT ON FUNCTION create_message_partition() IS 'Função para criar partições mensais. Agendar: 0 0 1 * * psql -d movemarias -c "SELECT create_message_partition();"';
