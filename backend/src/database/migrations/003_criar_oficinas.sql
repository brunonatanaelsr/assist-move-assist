CREATE TABLE oficinas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    horario_inicio TIME,
    horario_fim TIME,
    vagas INTEGER DEFAULT 0,
    local VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ativa',
    tipo VARCHAR(50) NOT NULL,
    requisitos TEXT,
    instrutor VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE participacao_oficinas (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER REFERENCES oficinas(id) ON DELETE CASCADE,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'inscrita',
    data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMP,
    frequencia INTEGER DEFAULT 0,
    avaliacao INTEGER,
    feedback TEXT,
    certificado_emitido BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(oficina_id, beneficiaria_id)
);

CREATE TRIGGER update_oficinas_updated_at
    BEFORE UPDATE ON oficinas
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_participacao_oficinas_updated_at
    BEFORE UPDATE ON participacao_oficinas
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Índices para melhorar performance
CREATE INDEX idx_oficinas_status ON oficinas(status);
CREATE INDEX idx_oficinas_data ON oficinas(data_inicio, data_fim);
CREATE INDEX idx_participacao_status ON participacao_oficinas(status);
