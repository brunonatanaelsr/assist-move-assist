-- Criação da tabela de eventos de auditoria
CREATE TABLE IF NOT EXISTS eventos_auditoria (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    modulo VARCHAR(50) NOT NULL,
    detalhes JSONB,
    ip_address VARCHAR(45),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT true
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_tipo ON eventos_auditoria(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_modulo ON eventos_auditoria(modulo);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_usuario ON eventos_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_data ON eventos_auditoria(data_criacao);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_ip ON eventos_auditoria(ip_address);

-- Índice GIN para busca em JSONB
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_detalhes ON eventos_auditoria USING GIN (detalhes);

-- Trigger para atualizar data_criacao automaticamente
CREATE OR REPLACE FUNCTION update_evento_auditoria_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_criacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_evento_auditoria_timestamp
    BEFORE INSERT OR UPDATE ON eventos_auditoria
    FOR EACH ROW
    EXECUTE FUNCTION update_evento_auditoria_timestamp();

-- Comentários nas colunas para documentação
COMMENT ON TABLE eventos_auditoria IS 'Registros de auditoria do sistema';
COMMENT ON COLUMN eventos_auditoria.tipo IS 'Tipo do evento (LOGIN, CRIAR, ATUALIZAR, DELETAR, etc)';
COMMENT ON COLUMN eventos_auditoria.descricao IS 'Descrição detalhada do evento';
COMMENT ON COLUMN eventos_auditoria.usuario_id IS 'ID do usuário que realizou a ação';
COMMENT ON COLUMN eventos_auditoria.modulo IS 'Módulo do sistema onde a ação ocorreu';
COMMENT ON COLUMN eventos_auditoria.detalhes IS 'Detalhes adicionais do evento em formato JSON';
COMMENT ON COLUMN eventos_auditoria.ip_address IS 'Endereço IP de onde a ação foi realizada';
COMMENT ON COLUMN eventos_auditoria.data_criacao IS 'Data e hora da ocorrência do evento';
COMMENT ON COLUMN eventos_auditoria.ativo IS 'Indica se o registro está ativo';
