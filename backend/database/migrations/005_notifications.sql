-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Tabela de notificações
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    prioridade SMALLINT DEFAULT 1,
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_leitura TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    canal VARCHAR(20)[] DEFAULT '{app}',
    tentativas_envio INTEGER DEFAULT 0,
    erro_envio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT check_tipo CHECK (tipo IN (
        'info', 'success', 'warning', 'error',
        'task', 'reminder', 'mention', 'system'
    )),
    CONSTRAINT check_canal CHECK (canal <@ ARRAY[
        'app', 'email', 'sms', 'whatsapp', 'push'
    ]::VARCHAR(20)[])
);

-- Tabela de fila de jobs
CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    prioridade SMALLINT DEFAULT 1,
    tentativas INTEGER DEFAULT 0,
    max_tentativas INTEGER DEFAULT 3,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_status CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled'
    )),
    CONSTRAINT check_job_type CHECK (job_type IN (
        'send_notification',
        'generate_report',
        'cleanup_data',
        'send_reminder',
        'process_upload',
        'sync_data',
        'backup_data'
    ))
);

-- Índices para performance
CREATE INDEX idx_notifications_user_unread 
ON notifications(user_id) 
WHERE NOT lida;

CREATE INDEX idx_notifications_date 
ON notifications(data_envio DESC);

CREATE INDEX idx_job_queue_status 
ON job_queue(status, scheduled_at) 
WHERE status = 'pending';

CREATE INDEX idx_job_queue_type 
ON job_queue(job_type, status);

-- Tabela de métricas de notificação
CREATE TABLE notification_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id),
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_action CHECK (action IN (
        'received', 'opened', 'clicked', 'dismissed'
    ))
);

-- Views materializadas para analytics
CREATE MATERIALIZED VIEW notification_stats AS
SELECT 
    user_id,
    tipo,
    canal,
    date_trunc('day', data_envio) as dia,
    COUNT(*) as total_enviadas,
    COUNT(CASE WHEN lida THEN 1 END) as total_lidas,
    AVG(CASE 
        WHEN lida 
        THEN EXTRACT(EPOCH FROM (data_leitura - data_envio))
    END) as tempo_medio_leitura
FROM notifications
GROUP BY user_id, tipo, canal, date_trunc('day', data_envio)
WITH DATA;

-- Função para atualizar status de job
CREATE OR REPLACE FUNCTION update_job_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    IF NEW.status = 'completed' THEN
        NEW.executed_at = CURRENT_TIMESTAMP;
    END IF;
    
    IF NEW.status = 'failed' AND NEW.tentativas >= NEW.max_tentativas THEN
        NEW.status = 'cancelled';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar status de job
CREATE TRIGGER job_status_update
BEFORE UPDATE ON job_queue
FOR EACH ROW
EXECUTE FUNCTION update_job_status();

-- Índice para busca full text em mensagens
CREATE INDEX idx_notifications_message_search 
ON notifications 
USING gin(to_tsvector('portuguese', mensagem));

-- Função para limpar jobs antigos
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS void AS $$
BEGIN
    -- Deletar jobs completados com mais de 30 dias
    DELETE FROM job_queue
    WHERE status = 'completed'
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Deletar jobs cancelados com mais de 7 dias
    DELETE FROM job_queue
    WHERE status = 'cancelled'
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
