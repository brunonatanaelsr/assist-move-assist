-- Criar tabela de encaminhamentos
CREATE TABLE encaminhamentos (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    responsavel_id INTEGER NOT NULL REFERENCES usuarios(id),
    instituicao VARCHAR(255) NOT NULL,
    tipo_servico VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    data_encaminhamento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL,
    prioridade VARCHAR(20) NOT NULL,
    data_retorno TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    documentos_necessarios TEXT,
    contato_instituicao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para otimização
CREATE INDEX idx_encaminhamentos_beneficiaria ON encaminhamentos(beneficiaria_id);
CREATE INDEX idx_encaminhamentos_responsavel ON encaminhamentos(responsavel_id);
CREATE INDEX idx_encaminhamentos_status ON encaminhamentos(status);
CREATE INDEX idx_encaminhamentos_data ON encaminhamentos(data_encaminhamento);

COMMENT ON TABLE encaminhamentos IS 'Registra os encaminhamentos das beneficiárias para serviços externos';
COMMENT ON COLUMN encaminhamentos.tipo_servico IS 'Tipo de serviço para qual a beneficiária foi encaminhada';
COMMENT ON COLUMN encaminhamentos.status IS 'Status do encaminhamento (ex: pendente, em andamento, concluído)';
COMMENT ON COLUMN encaminhamentos.prioridade IS 'Nível de prioridade do encaminhamento (ex: baixa, média, alta, urgente)';
