-- Criar extensão se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de oficinas
CREATE TABLE oficinas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_oficina DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    instrutor VARCHAR(100),
    local VARCHAR(200),
    capacidade_maxima INTEGER NOT NULL DEFAULT 20,
    status VARCHAR(20) NOT NULL DEFAULT 'agendada' 
      CHECK (status IN ('agendada', 'em_andamento', 'concluida', 'cancelada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de presenças
CREATE TABLE oficina_presencas (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    presente BOOLEAN DEFAULT FALSE,
    observacoes TEXT,
    data_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(oficina_id, beneficiaria_id)
);

-- Índices
CREATE INDEX idx_oficinas_data ON oficinas(data_oficina);
CREATE INDEX idx_oficinas_status ON oficinas(status);
CREATE INDEX idx_presencas_oficina ON oficina_presencas(oficina_id);
CREATE INDEX idx_presencas_beneficiaria ON oficina_presencas(beneficiaria_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_oficinas_updated_at
    BEFORE UPDATE ON oficinas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
