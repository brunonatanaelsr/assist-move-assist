-- Criar tabela de beneficiárias
CREATE TABLE IF NOT EXISTS beneficiarias (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(100) NOT NULL,
    data_nascimento DATE NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(20),
    telefone VARCHAR(15),
    email VARCHAR(100) UNIQUE,
    estado_civil VARCHAR(20) CHECK (estado_civil IN ('solteira', 'casada', 'divorciada', 'viuva', 'uniao_estavel')),
    num_filhos INTEGER CHECK (num_filhos >= 0 AND num_filhos <= 20),
    escolaridade VARCHAR(30) CHECK (escolaridade IN (
        'fundamental_incompleto',
        'fundamental_completo',
        'medio_incompleto',
        'medio_completo',
        'superior_incompleto',
        'superior_completo',
        'pos_graduacao'
    )),
    profissao VARCHAR(100),
    renda_familiar DECIMAL(10,2) CHECK (renda_familiar >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('ativa', 'inativa', 'pendente', 'desligada')),
    foto_url VARCHAR(500),
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    usuario_criacao INTEGER NOT NULL REFERENCES usuarios(id),
    usuario_atualizacao INTEGER NOT NULL REFERENCES usuarios(id),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_beneficiarias_nome ON beneficiarias(nome_completo);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_cpf ON beneficiarias(cpf);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_status ON beneficiarias(status);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_ativo ON beneficiarias(ativo);

-- Criar trigger para atualizar data_atualizacao automaticamente
CREATE OR REPLACE FUNCTION update_data_atualizacao_beneficiarias()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_data_atualizacao_beneficiarias ON beneficiarias;
CREATE TRIGGER trigger_update_data_atualizacao_beneficiarias
    BEFORE UPDATE ON beneficiarias
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao_beneficiarias();

-- Criar tabela de endereços das beneficiárias
CREATE TABLE IF NOT EXISTS enderecos_beneficiarias (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    cep VARCHAR(9) NOT NULL,
    logradouro VARCHAR(100) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    complemento VARCHAR(50),
    bairro VARCHAR(50) NOT NULL,
    cidade VARCHAR(50) NOT NULL,
    estado CHAR(2) NOT NULL,
    CONSTRAINT uk_endereco_beneficiaria UNIQUE (beneficiaria_id)
);

-- Criar índices para otimização dos endereços
CREATE INDEX IF NOT EXISTS idx_enderecos_beneficiarias_bairro ON enderecos_beneficiarias(bairro);
CREATE INDEX IF NOT EXISTS idx_enderecos_beneficiarias_cidade ON enderecos_beneficiarias(cidade);
