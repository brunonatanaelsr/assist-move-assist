-- Criar extensão se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela para armazenar cache de APIs
CREATE TABLE api_cache (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para logs de chamadas de API
CREATE TABLE api_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status INTEGER,
    response_time INTEGER, -- em milissegundos
    error_message TEXT,
    request_body JSONB,
    response_body JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para controle de rate limit
CREATE TABLE rate_limits (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL,
    hits INTEGER DEFAULT 1,
    reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para webhooks
CREATE TABLE webhooks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para status das integrações
CREATE TABLE integration_status (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    service TEXT NOT NULL,
    status TEXT NOT NULL,
    last_check TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_success TIMESTAMP WITH TIME ZONE,
    error_count INTEGER DEFAULT 0,
    is_circuit_open BOOLEAN DEFAULT false,
    circuit_open_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE UNIQUE INDEX idx_api_cache_key ON api_cache(key);
CREATE INDEX idx_api_cache_expires_at ON api_cache(expires_at);
CREATE INDEX idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX idx_rate_limits_key_reset ON rate_limits(key, reset_at);
CREATE INDEX idx_webhooks_status ON webhooks(status);
CREATE INDEX idx_integration_status_service ON integration_status(service);

-- Funções

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM api_cache WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_api_cache_updated_at
    BEFORE UPDATE ON api_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_status_updated_at
    BEFORE UPDATE ON integration_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Views

-- View para métricas de API
CREATE OR REPLACE VIEW api_metrics AS
SELECT 
    endpoint,
    COUNT(*) as total_calls,
    AVG(response_time) as avg_response_time,
    MAX(response_time) as max_response_time,
    MIN(response_time) as min_response_time,
    COUNT(CASE WHEN status >= 500 THEN 1 END) as error_count,
    COUNT(CASE WHEN status >= 200 AND status < 300 THEN 1 END) as success_count
FROM api_logs
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY endpoint;

-- View para status atual das integrações
CREATE OR REPLACE VIEW current_integration_status AS
SELECT 
    service,
    status,
    last_check,
    last_success,
    error_count,
    is_circuit_open,
    CASE 
        WHEN is_circuit_open AND circuit_open_until > CURRENT_TIMESTAMP THEN 'circuit-open'
        WHEN error_count > 5 THEN 'degraded'
        WHEN last_success > CURRENT_TIMESTAMP - INTERVAL '5 minutes' THEN 'healthy'
        ELSE 'unknown'
    END as health_status
FROM integration_status;
