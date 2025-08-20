-- Migration: 2025_08_20_07_create_beneficiarias_tables.sql

-- Enum para status da beneficiária
CREATE TYPE status_beneficiaria AS ENUM (
    'ativa',
    'inativa',
    'pendente',
    'afastada',
    'concluinte'
);

-- Enum para estado civil
CREATE TYPE estado_civil AS ENUM (
    'solteira',
    'casada',
    'divorciada',
    'viuva',
    'uniao_estavel',
    'separada'
);

-- Tabela principal de beneficiárias
CREATE TABLE IF NOT EXISTS beneficiarias (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(200) NOT NULL,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    rg VARCHAR(20),
    data_nascimento DATE NOT NULL,
    estado_civil estado_civil,
    email VARCHAR(200),
    telefone VARCHAR(20),
    telefone_emergencia VARCHAR(20),
    endereco_rua VARCHAR(200),
    endereco_numero VARCHAR(20),
    endereco_complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    cep VARCHAR(8),
    status status_beneficiaria NOT NULL DEFAULT 'pendente',
    data_cadastro DATE NOT NULL DEFAULT CURRENT_DATE,
    ultima_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT,
    foto_url VARCHAR(500),
    
    CONSTRAINT check_idade CHECK (
        data_nascimento <= CURRENT_DATE - INTERVAL '16 years'
    ),
    CONSTRAINT check_cpf CHECK (
        cpf ~ '^[0-9]{11}$'
    ),
    CONSTRAINT check_email CHECK (
        email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT check_telefone CHECK (
        telefone IS NULL OR telefone ~ '^\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}$'
    ),
    CONSTRAINT check_estado CHECK (
        estado ~ '^[A-Z]{2}$'
    )
);

-- Informações socioeconômicas
CREATE TABLE IF NOT EXISTS info_socioeconomica (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
    renda_familiar DECIMAL(10,2),
    quantidade_moradores INTEGER,
    tipo_moradia VARCHAR(50),
    escolaridade VARCHAR(50),
    profissao VARCHAR(100),
    situacao_trabalho VARCHAR(50),
    beneficios_sociais TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_renda CHECK (renda_familiar IS NULL OR renda_familiar >= 0),
    CONSTRAINT check_moradores CHECK (quantidade_moradores > 0)
);

-- Dependentes
CREATE TABLE IF NOT EXISTS dependentes (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
    nome_completo VARCHAR(200) NOT NULL,
    data_nascimento DATE NOT NULL,
    parentesco VARCHAR(50) NOT NULL,
    cpf VARCHAR(11),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_cpf_dependente CHECK (
        cpf IS NULL OR cpf ~ '^[0-9]{11}$'
    )
);

-- Histórico de atendimentos
CREATE TABLE IF NOT EXISTS historico_atendimentos (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
    tipo_atendimento VARCHAR(100) NOT NULL,
    data_atendimento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id),
    descricao TEXT NOT NULL,
    encaminhamentos TEXT,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Participação em projetos
CREATE TABLE IF NOT EXISTS participacao_projetos (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    projeto_id INTEGER NOT NULL REFERENCES projetos(id),
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'ativa',
    observacoes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_participacao UNIQUE (beneficiaria_id, projeto_id),
    CONSTRAINT check_datas_participacao CHECK (
        data_fim IS NULL OR data_fim >= data_inicio
    )
);

-- Documentos da beneficiária
CREATE TABLE IF NOT EXISTS documentos_beneficiaria (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(100) NOT NULL,
    nome_arquivo VARCHAR(200) NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    data_upload TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_upload INTEGER NOT NULL REFERENCES usuarios(id),
    hash_arquivo VARCHAR(64) NOT NULL,
    tamanho_bytes INTEGER NOT NULL,
    
    CONSTRAINT check_tamanho CHECK (tamanho_bytes > 0)
);

-- Triggers para atualização automática
CREATE TRIGGER update_info_socioeconomica_updated_at
    BEFORE UPDATE ON info_socioeconomica
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dependentes_updated_at
    BEFORE UPDATE ON dependentes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participacao_projetos_updated_at
    BEFORE UPDATE ON participacao_projetos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar última atualização da beneficiária
CREATE OR REPLACE FUNCTION update_beneficiaria_ultima_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE beneficiarias
    SET ultima_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.beneficiaria_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_beneficiaria_timestamp
    AFTER INSERT OR UPDATE ON info_socioeconomica
    FOR EACH ROW
    EXECUTE FUNCTION update_beneficiaria_ultima_atualizacao();

CREATE TRIGGER trigger_update_beneficiaria_timestamp_dependentes
    AFTER INSERT OR UPDATE ON dependentes
    FOR EACH ROW
    EXECUTE FUNCTION update_beneficiaria_ultima_atualizacao();

-- Índices
CREATE INDEX idx_beneficiarias_cpf ON beneficiarias(cpf);
CREATE INDEX idx_beneficiarias_status ON beneficiarias(status);
CREATE INDEX idx_beneficiarias_cidade ON beneficiarias(cidade, estado);
CREATE INDEX idx_info_socioeconomica_beneficiaria ON info_socioeconomica(beneficiaria_id);
CREATE INDEX idx_dependentes_beneficiaria ON dependentes(beneficiaria_id);
CREATE INDEX idx_atendimentos_beneficiaria ON historico_atendimentos(beneficiaria_id);
CREATE INDEX idx_atendimentos_data ON historico_atendimentos(data_atendimento);
CREATE INDEX idx_participacao_beneficiaria ON participacao_projetos(beneficiaria_id);
CREATE INDEX idx_participacao_projeto ON participacao_projetos(projeto_id);
CREATE INDEX idx_documentos_beneficiaria ON documentos_beneficiaria(beneficiaria_id);

-- Função para verificar idade mínima
CREATE OR REPLACE FUNCTION verificar_idade_minima()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.data_nascimento > CURRENT_DATE - INTERVAL '16 years' THEN
        RAISE EXCEPTION 'A beneficiária deve ter pelo menos 16 anos de idade';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_verificar_idade_minima
    BEFORE INSERT OR UPDATE OF data_nascimento ON beneficiarias
    FOR EACH ROW
    EXECUTE FUNCTION verificar_idade_minima();

-- Função para contar participações ativas
CREATE OR REPLACE FUNCTION contar_participacoes_ativas(p_beneficiaria_id INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM participacao_projetos
        WHERE beneficiaria_id = p_beneficiaria_id
        AND status = 'ativa'
        AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql;
