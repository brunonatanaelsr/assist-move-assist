CREATE TABLE beneficiarias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    rg VARCHAR(20),
    data_nascimento DATE NOT NULL,
    telefone VARCHAR(20),
    telefone_emergencia VARCHAR(20),
    email VARCHAR(255),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(9),
    escolaridade VARCHAR(50),
    estado_civil VARCHAR(50),
    numero_filhos INTEGER DEFAULT 0,
    renda_familiar DECIMAL(10,2),
    situacao_moradia VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ativa',
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TRIGGER update_beneficiarias_updated_at
    BEFORE UPDATE ON beneficiarias
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Índices para melhorar performance
CREATE INDEX idx_beneficiarias_cpf ON beneficiarias(cpf);
CREATE INDEX idx_beneficiarias_nome ON beneficiarias(nome);
CREATE INDEX idx_beneficiarias_status ON beneficiarias(status);
