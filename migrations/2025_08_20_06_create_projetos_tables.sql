-- Migration: 2025_08_20_06_create_projetos_tables.sql

-- Enum para status do projeto
CREATE TYPE status_projeto AS ENUM (
    'ativo',
    'pausado',
    'concluido',
    'cancelado',
    'planejamento'
);

-- Tabela principal de projetos
CREATE TABLE IF NOT EXISTS projetos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    objetivo TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status status_projeto NOT NULL DEFAULT 'planejamento',
    responsavel_id INTEGER NOT NULL REFERENCES usuarios(id),
    orcamento DECIMAL(10,2),
    meta_beneficiarias INTEGER,
    area_atuacao VARCHAR(100),
    parceiros TEXT[],
    tags TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_datas CHECK (data_fim IS NULL OR data_fim >= data_inicio),
    CONSTRAINT check_orcamento CHECK (orcamento IS NULL OR orcamento >= 0),
    CONSTRAINT check_meta CHECK (meta_beneficiarias IS NULL OR meta_beneficiarias > 0)
);

-- Metas do projeto
CREATE TABLE IF NOT EXISTS metas_projeto (
    id SERIAL PRIMARY KEY,
    projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    indicador VARCHAR(200) NOT NULL,
    valor_meta DECIMAL(10,2) NOT NULL,
    valor_atual DECIMAL(10,2) NOT NULL DEFAULT 0,
    unidade VARCHAR(50) NOT NULL,
    data_limite DATE,
    concluida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_valores CHECK (valor_atual >= 0 AND valor_meta > 0)
);

-- Equipe do projeto
CREATE TABLE IF NOT EXISTS equipe_projeto (
    id SERIAL PRIMARY KEY,
    projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    cargo VARCHAR(100) NOT NULL,
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_membro_projeto UNIQUE (projeto_id, usuario_id),
    CONSTRAINT check_datas_equipe CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- Cronograma do projeto
CREATE TABLE IF NOT EXISTS cronograma_projeto (
    id SERIAL PRIMARY KEY,
    projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    responsavel_id INTEGER REFERENCES usuarios(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pendente',
    prioridade INTEGER NOT NULL DEFAULT 1,
    concluido BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_datas_cronograma CHECK (data_fim >= data_inicio),
    CONSTRAINT check_prioridade CHECK (prioridade BETWEEN 1 AND 5)
);

-- Documentos do projeto
CREATE TABLE IF NOT EXISTS documentos_projeto (
    id SERIAL PRIMARY KEY,
    projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    caminho VARCHAR(500) NOT NULL,
    tamanho INTEGER NOT NULL,
    hash_arquivo VARCHAR(64) NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_tamanho CHECK (tamanho > 0)
);

-- Avaliações do projeto
CREATE TABLE IF NOT EXISTS avaliacoes_projeto (
    id SERIAL PRIMARY KEY,
    projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    avaliador_id INTEGER NOT NULL REFERENCES usuarios(id),
    data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
    nota INTEGER NOT NULL,
    comentario TEXT,
    criterios JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_nota CHECK (nota BETWEEN 1 AND 5)
);

-- Orçamento do projeto
CREATE TABLE IF NOT EXISTS orcamento_projeto (
    id SERIAL PRIMARY KEY,
    projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    categoria VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    valor_previsto DECIMAL(10,2) NOT NULL,
    valor_realizado DECIMAL(10,2) DEFAULT 0,
    data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_valores_orcamento CHECK (
        valor_previsto >= 0 AND valor_realizado >= 0
    )
);

-- Triggers para updated_at
CREATE TRIGGER update_projetos_updated_at
    BEFORE UPDATE ON projetos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metas_projeto_updated_at
    BEFORE UPDATE ON metas_projeto
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipe_projeto_updated_at
    BEFORE UPDATE ON equipe_projeto
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cronograma_projeto_updated_at
    BEFORE UPDATE ON cronograma_projeto
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orcamento_projeto_updated_at
    BEFORE UPDATE ON orcamento_projeto
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_projetos_status ON projetos(status);
CREATE INDEX idx_projetos_responsavel ON projetos(responsavel_id);
CREATE INDEX idx_metas_projeto ON metas_projeto(projeto_id);
CREATE INDEX idx_equipe_projeto ON equipe_projeto(projeto_id);
CREATE INDEX idx_equipe_usuario ON equipe_projeto(usuario_id);
CREATE INDEX idx_cronograma_projeto ON cronograma_projeto(projeto_id);
CREATE INDEX idx_cronograma_datas ON cronograma_projeto(data_inicio, data_fim);
CREATE INDEX idx_documentos_projeto ON documentos_projeto(projeto_id);
CREATE INDEX idx_avaliacoes_projeto ON avaliacoes_projeto(projeto_id);
CREATE INDEX idx_orcamento_projeto ON orcamento_projeto(projeto_id);

-- Função para calcular progresso do projeto
CREATE OR REPLACE FUNCTION calcular_progresso_projeto(p_projeto_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    v_total_metas INTEGER;
    v_metas_concluidas INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE concluida)
    INTO v_total_metas, v_metas_concluidas
    FROM metas_projeto
    WHERE projeto_id = p_projeto_id;
    
    IF v_total_metas = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN (v_metas_concluidas::DECIMAL / v_total_metas::DECIMAL) * 100;
END;
$$ LANGUAGE plpgsql;
