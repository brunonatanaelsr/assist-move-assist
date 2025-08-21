-- Criar tabela de histórico de atendimentos
CREATE TABLE historico_atendimentos (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    atendente_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo_atendimento VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    data_atendimento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL,
    observacoes TEXT,
    proximos_passos TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para otimização
CREATE INDEX idx_historico_atendimentos_beneficiaria ON historico_atendimentos(beneficiaria_id);
CREATE INDEX idx_historico_atendimentos_atendente ON historico_atendimentos(atendente_id);
CREATE INDEX idx_historico_atendimentos_data ON historico_atendimentos(data_atendimento);

COMMENT ON TABLE historico_atendimentos IS 'Registra o histórico de atendimentos realizados com as beneficiárias';
COMMENT ON COLUMN historico_atendimentos.tipo_atendimento IS 'Tipo do atendimento (ex: psicológico, jurídico, social)';
COMMENT ON COLUMN historico_atendimentos.status IS 'Status do atendimento (ex: concluído, em andamento, cancelado)';
COMMENT ON COLUMN historico_atendimentos.proximos_passos IS 'Ações a serem tomadas após o atendimento';
