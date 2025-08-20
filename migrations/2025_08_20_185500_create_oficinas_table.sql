-- Criação da tabela oficinas
CREATE TABLE oficinas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    instrutor VARCHAR(255),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    local TEXT,
    vagas_totais INTEGER,
    projeto_id INTEGER,
    responsavel_id INTEGER,
    status VARCHAR(50) DEFAULT 'ativa',
    dias_semana VARCHAR(50),
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_oficinas_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE SET NULL,
    CONSTRAINT fk_oficinas_responsavel FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX idx_oficinas_projeto_id ON oficinas(projeto_id);
CREATE INDEX idx_oficinas_responsavel_id ON oficinas(responsavel_id);
CREATE INDEX idx_oficinas_ativo ON oficinas(ativo);
CREATE INDEX idx_oficinas_status ON oficinas(status);

-- Trigger para atualização automática do data_atualizacao
CREATE OR REPLACE FUNCTION update_oficinas_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_oficinas_data_atualizacao
BEFORE UPDATE ON oficinas
FOR EACH ROW EXECUTE FUNCTION update_oficinas_data_atualizacao();

COMMENT ON TABLE oficinas IS 'Oficinas vinculadas a projetos, com instrutores, horários e localizações';
COMMENT ON COLUMN oficinas.nome IS 'Nome da oficina';
COMMENT ON COLUMN oficinas.instrutor IS 'Nome do instrutor principal';
COMMENT ON COLUMN oficinas.data_inicio IS 'Data de início';
COMMENT ON COLUMN oficinas.data_fim IS 'Data final prevista';
COMMENT ON COLUMN oficinas.horario_inicio IS 'Horário de início';
COMMENT ON COLUMN oficinas.horario_fim IS 'Horário de término';
COMMENT ON COLUMN oficinas.vagas_totais IS 'Número total de vagas disponíveis';
COMMENT ON COLUMN oficinas.status IS 'Status atual da oficina';
COMMENT ON COLUMN oficinas.dias_semana IS 'Dias da semana em que a oficina ocorre';
COMMENT ON COLUMN oficinas.ativo IS 'Indica se a oficina está ativa';
