-- Migration: 2025_08_20_15_fix_missing_tables.sql

-- Recriando os tipos ENUM com tratamento de erro
DO $$ BEGIN
    CREATE TYPE status_projeto AS ENUM (
        'ativo',
        'pausado',
        'concluido',
        'cancelado',
        'planejamento'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_oficina AS ENUM (
        'agendada',
        'confirmada',
        'em_andamento',
        'concluida',
        'cancelada'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criando tabelas que não foram criadas anteriormente

-- Tabela de Projetos
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
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Oficinas
CREATE TABLE IF NOT EXISTS oficinas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    objetivo TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    status status_oficina NOT NULL DEFAULT 'agendada',
    projeto_id INTEGER REFERENCES projetos(id),
    responsavel_id INTEGER NOT NULL REFERENCES usuarios(id),
    local TEXT,
    vagas_total INTEGER NOT NULL DEFAULT 20,
    vagas_ocupadas INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_vagas CHECK (vagas_ocupadas <= vagas_total)
);

-- Tabela de Feed
CREATE TABLE IF NOT EXISTS feed_posts (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(200),
    conteudo TEXT NOT NULL,
    autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo VARCHAR(50) NOT NULL,
    publico BOOLEAN NOT NULL DEFAULT true,
    projeto_id INTEGER REFERENCES projetos(id),
    oficina_id INTEGER REFERENCES oficinas(id),
    midia_urls TEXT[],
    tags TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Formulários
CREATE TABLE IF NOT EXISTS formularios (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    campos JSONB NOT NULL,
    criado_por INTEGER NOT NULL REFERENCES usuarios(id),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS mensagens (
    id SERIAL PRIMARY KEY,
    remetente_id INTEGER NOT NULL REFERENCES usuarios(id),
    destinatario_id INTEGER NOT NULL REFERENCES usuarios(id),
    assunto VARCHAR(200),
    conteudo TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT false,
    data_leitura TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Documentos
CREATE TABLE IF NOT EXISTS documentos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) NOT NULL,
    url VARCHAR(500) NOT NULL,
    tamanho INTEGER NOT NULL,
    upload_por INTEGER NOT NULL REFERENCES usuarios(id),
    projeto_id INTEGER REFERENCES projetos(id),
    oficina_id INTEGER REFERENCES oficinas(id),
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
