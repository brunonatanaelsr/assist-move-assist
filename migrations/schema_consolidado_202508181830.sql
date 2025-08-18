-- Migrate Consolidado do Sistema Move Marias (18/08/2025)
BEGIN;

-- Configurações iniciais
SET client_encoding = 'UTF8';
SET timezone = 'America/Sao_Paulo';

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Tipos e Enums
DO $$
BEGIN
    -- Status de usuários
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_usuario') THEN
        CREATE TYPE status_usuario AS ENUM ('ativo', 'inativo', 'bloqueado', 'pendente');
    END IF;
    
    -- Status de projetos
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_projeto') THEN
        CREATE TYPE status_projeto AS ENUM ('planejamento', 'em_andamento', 'concluido', 'cancelado', 'pausado');
    END IF;
    
    -- Status de documentos
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_documento') THEN
        CREATE TYPE status_documento AS ENUM ('rascunho', 'em_revisao', 'aprovado', 'arquivado', 'obsoleto');
    END IF;
END$$;

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    senha VARCHAR(100) NOT NULL,
    perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('admin', 'gestor', 'facilitador', 'beneficiaria')),
    status status_usuario DEFAULT 'ativo',
    token_reset_senha UUID,
    data_expiracao_token TIMESTAMP WITH TIME ZONE,
    tentativas_login INTEGER DEFAULT 0,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    meta_dados JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Beneficiárias
CREATE TABLE IF NOT EXISTS beneficiarias (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(100) NOT NULL,
    data_nascimento DATE NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(20),
    email CITEXT UNIQUE,
    telefone VARCHAR(20),
    endereco TEXT,
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado CHAR(2),
    cep VARCHAR(9),
    estado_civil VARCHAR(20),
    escolaridade VARCHAR(50),
    profissao VARCHAR(100),
    renda_familiar DECIMAL(10,2),
    possui_filhos BOOLEAN DEFAULT false,
    quantidade_filhos INTEGER DEFAULT 0,
    rede_apoio TEXT[],
    situacao_moradia VARCHAR(50),
    tipo_moradia VARCHAR(50),
    composicao_familiar TEXT,
    historico_violencia TEXT,
    tipo_violencia VARCHAR(50)[],
    medida_protetiva BOOLEAN DEFAULT false,
    acompanhamento_psicologico BOOLEAN DEFAULT false,
    encaminhamento_servico_social TEXT,
    observacoes TEXT,
    documentos_pendentes TEXT[],
    status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa', 'suspensa', 'concluinte')),
    meta_dados JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Projetos
CREATE TABLE IF NOT EXISTS projetos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    objetivo TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    orcamento DECIMAL(10,2),
    status status_projeto DEFAULT 'planejamento',
    responsavel_id INTEGER REFERENCES usuarios(id),
    meta_indicadores JSONB DEFAULT '{}',
    resultados_alcancados JSONB DEFAULT '{}',
    arquivos_anexos TEXT[],
    meta_dados JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Oficinas
CREATE TABLE IF NOT EXISTS oficinas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    instrutor VARCHAR(100),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    local VARCHAR(100),
    vagas_total INTEGER NOT NULL,
    vagas_ocupadas INTEGER DEFAULT 0,
    projeto_id INTEGER REFERENCES projetos(id),
    responsavel_id INTEGER REFERENCES usuarios(id),
    status_detalhado VARCHAR(50) DEFAULT 'em_planejamento' CHECK (status_detalhado IN (
        'em_planejamento', 'inscricoes_abertas', 'em_andamento', 
        'concluida', 'cancelada', 'pausada', 'em_revisao'
    )),
    lista_espera_limite INTEGER DEFAULT 5,
    tem_lista_espera BOOLEAN DEFAULT false,
    publico_alvo TEXT,
    pre_requisitos TEXT[],
    objetivos TEXT[],
    categoria VARCHAR(50),
    nivel VARCHAR(20) DEFAULT 'iniciante' CHECK (nivel IN ('iniciante', 'intermediario', 'avancado')),
    carga_horaria INTEGER,
    certificado_disponivel BOOLEAN DEFAULT false,
    materiais_necessarios TEXT[],
    meta_dados JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Participações
CREATE TABLE IF NOT EXISTS participacoes (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    oficina_id INTEGER REFERENCES oficinas(id),
    data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status_participacao VARCHAR(50) DEFAULT 'inscrita' 
    CHECK (status_participacao IN ('inscrita', 'confirmada', 'em_andamento', 'concluida', 'desistente', 'reprovada')),
    motivo_desistencia TEXT,
    certificado_emitido BOOLEAN DEFAULT false,
    data_conclusao TIMESTAMP WITH TIME ZONE,
    meta_dados JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(beneficiaria_id, oficina_id, ativo)
);

-- Tabela de Lista de Espera
CREATE TABLE IF NOT EXISTS lista_espera_oficinas (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER REFERENCES oficinas(id),
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    posicao INTEGER,
    status VARCHAR(30) DEFAULT 'aguardando' 
    CHECK (status IN ('aguardando', 'chamada', 'desistencia', 'expirada')),
    observacoes TEXT,
    meta_dados JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(oficina_id, beneficiaria_id, ativo)
);

-- Tabela de Avaliações
CREATE TABLE IF NOT EXISTS avaliacoes_oficinas (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER REFERENCES oficinas(id),
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    nota INTEGER CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    aspectos_positivos TEXT[],
    aspectos_negativos TEXT[],
    sugestoes TEXT,
    data_avaliacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    meta_dados JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(oficina_id, beneficiaria_id, ativo)
);

-- Tabela de Presenças
CREATE TABLE IF NOT EXISTS presencas_oficinas (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER REFERENCES oficinas(id),
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    data_encontro DATE NOT NULL,
    presente BOOLEAN DEFAULT false,
    justificativa TEXT,
    observacoes TEXT,
    meta_dados JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(oficina_id, beneficiaria_id, data_encontro)
);

-- Tabela de Documentos
CREATE TABLE IF NOT EXISTS documentos (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    caminho_arquivo TEXT NOT NULL,
    hash_arquivo VARCHAR(64),
    formato VARCHAR(10),
    tamanho BIGINT,
    responsavel_id INTEGER REFERENCES usuarios(id),
    status status_documento DEFAULT 'rascunho',
    versao VARCHAR(10),
    tags TEXT[],
    categoria VARCHAR(50),
    data_validade DATE,
    restricao_acesso VARCHAR(20) DEFAULT 'publico' CHECK (restricao_acesso IN ('publico', 'restrito', 'confidencial')),
    meta_dados JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Versões de Documentos
CREATE TABLE IF NOT EXISTS versoes_documentos (
    id SERIAL PRIMARY KEY,
    documento_id INTEGER REFERENCES documentos(id),
    numero_versao VARCHAR(10) NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    hash_arquivo VARCHAR(64),
    responsavel_id INTEGER REFERENCES usuarios(id),
    comentario TEXT,
    meta_dados JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Auditoria
CREATE TABLE IF NOT EXISTS auditoria (
    id SERIAL PRIMARY KEY,
    tipo_evento VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    entidade VARCHAR(50) NOT NULL,
    entidade_id INTEGER,
    dados_antigos JSONB,
    dados_novos JSONB,
    ip_origem VARCHAR(45),
    user_agent TEXT,
    data_evento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON usuarios(perfil);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_cpf ON beneficiarias(cpf);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_nome ON beneficiarias(nome_completo);
CREATE INDEX IF NOT EXISTS idx_projetos_status ON projetos(status);
CREATE INDEX IF NOT EXISTS idx_oficinas_status ON oficinas(status_detalhado);
CREATE INDEX IF NOT EXISTS idx_oficinas_categoria ON oficinas(categoria);
CREATE INDEX IF NOT EXISTS idx_oficinas_nivel ON oficinas(nivel);
CREATE INDEX IF NOT EXISTS idx_participacoes_status ON participacoes(status_participacao);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_status ON documentos(status);
CREATE INDEX IF NOT EXISTS idx_auditoria_tipo ON auditoria(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_data ON auditoria(data_evento);

-- Triggers para data_atualizacao
CREATE OR REPLACE FUNCTION update_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers em todas as tabelas
DO $$
DECLARE
    tabela text;
BEGIN
    FOR tabela IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('auditoria')
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_update_%s_data_atualizacao ON %I;
            CREATE TRIGGER trg_update_%s_data_atualizacao
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_data_atualizacao();
        ', tabela, tabela, tabela, tabela);
    END LOOP;
END$$;

-- Trigger para controle de vagas em oficinas
CREATE OR REPLACE FUNCTION update_oficina_vagas_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.ativo = true THEN
        UPDATE oficinas 
        SET vagas_ocupadas = vagas_ocupadas + 1
        WHERE id = NEW.oficina_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.ativo = true AND NEW.ativo = false THEN
            UPDATE oficinas 
            SET vagas_ocupadas = vagas_ocupadas - 1
            WHERE id = NEW.oficina_id;
        ELSIF OLD.ativo = false AND NEW.ativo = true THEN
            UPDATE oficinas 
            SET vagas_ocupadas = vagas_ocupadas + 1
            WHERE id = NEW.oficina_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_oficina_vagas_count
AFTER INSERT OR UPDATE ON participacoes
FOR EACH ROW
EXECUTE FUNCTION update_oficina_vagas_count();

COMMIT;
