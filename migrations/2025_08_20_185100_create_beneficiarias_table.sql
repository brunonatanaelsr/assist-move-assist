-- Criação da tabela beneficiarias
CREATE TABLE beneficiarias (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE, -- formato padrão brasileiro com pontos e hífen
    rg VARCHAR(20),
    data_nascimento DATE,
    email VARCHAR(255),
    contato1 VARCHAR(20),
    contato2 VARCHAR(20),
    endereco TEXT,
    bairro VARCHAR(100),
    cep VARCHAR(10),
    cidade VARCHAR(100) DEFAULT 'São Paulo',
    estado VARCHAR(2) DEFAULT 'SP',
    escolaridade VARCHAR(100),
    profissao VARCHAR(100),
    renda_familiar NUMERIC(12,2),
    composicao_familiar TEXT,
    programa_servico TEXT,
    observacoes TEXT,
    necessidades_especiais TEXT,
    medicamentos TEXT,
    alergias TEXT,
    contato_emergencia VARCHAR(255),
    data_inicio_instituto DATE,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas frequentes
CREATE UNIQUE INDEX idx_beneficiarias_cpf ON beneficiarias(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_beneficiarias_ativo ON beneficiarias(ativo);
CREATE INDEX idx_beneficiarias_bairro ON beneficiarias(bairro);

-- Trigger para atualizar data_atualizacao automaticamente
CREATE OR REPLACE FUNCTION update_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_beneficiarias_update_data_atualizacao
BEFORE UPDATE ON beneficiarias
FOR EACH ROW EXECUTE FUNCTION update_data_atualizacao();
