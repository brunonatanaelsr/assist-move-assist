-- Criação da tabela eventos_auditoria
CREATE TABLE eventos_auditoria (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    usuario_id INTEGER,
    modulo VARCHAR(100) NOT NULL,
    detalhes JSONB,
    ip_address INET,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX idx_eventos_auditoria_tipo ON eventos_auditoria(tipo);
CREATE INDEX idx_eventos_auditoria_modulo ON eventos_auditoria(modulo);
CREATE INDEX idx_eventos_auditoria_usuario_id ON eventos_auditoria(usuario_id);
CREATE INDEX idx_eventos_auditoria_data_criacao ON eventos_auditoria(data_criacao);

-- Foreign key para usuarios
ALTER TABLE eventos_auditoria
ADD CONSTRAINT fk_eventos_auditoria_usuario
FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Comentários
COMMENT ON TABLE eventos_auditoria IS 'Logs de auditoria do sistema com eventos registrados';
COMMENT ON COLUMN eventos_auditoria.tipo IS 'Tipo do evento (ex: CONSULTA, EXPORTACAO, LOGIN, etc.)';
COMMENT ON COLUMN eventos_auditoria.descricao IS 'Descrição textual do evento';
COMMENT ON COLUMN eventos_auditoria.usuario_id IS 'ID do usuário responsável pelo evento';
COMMENT ON COLUMN eventos_auditoria.modulo IS 'Módulo ou área do sistema relacionada ao evento';
COMMENT ON COLUMN eventos_auditoria.detalhes IS 'Detalhes adicionais do evento registrados em JSON';
COMMENT ON COLUMN eventos_auditoria.ip_address IS 'Endereço IP da origem do evento';
COMMENT ON COLUMN eventos_auditoria.data_criacao IS 'Data e hora da criação do evento';
