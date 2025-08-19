-- Schema consolidado v3 do sistema Move Marias
-- Baseado na análise das rotas e queries existentes

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    papel VARCHAR(50) NOT NULL DEFAULT 'usuario', -- valores possíveis: admin, gestor, usuario
    telefone VARCHAR(20),
    ultimo_login TIMESTAMP,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Projetos
CREATE TABLE IF NOT EXISTS projetos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim_prevista DATE,
    data_fim_real DATE,
    status VARCHAR(50) DEFAULT 'planejamento', -- valores possíveis: planejamento, em_andamento, concluido, cancelado
    responsavel_id INTEGER REFERENCES usuarios(id),
    orcamento DECIMAL(10,2),
    local_execucao VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Beneficiárias
CREATE TABLE IF NOT EXISTS beneficiarias (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(20),
    data_nascimento DATE,
    email VARCHAR(255),
    contato1 VARCHAR(20),
    contato2 VARCHAR(20),
    endereco TEXT,
    bairro VARCHAR(100),
    cep VARCHAR(9),
    cidade VARCHAR(100) DEFAULT 'São Paulo',
    estado VARCHAR(2) DEFAULT 'SP',
    escolaridade VARCHAR(50),
    profissao VARCHAR(100),
    renda_familiar DECIMAL(10,2),
    composicao_familiar TEXT,
    programa_servico TEXT,
    observacoes TEXT,
    necessidades_especiais TEXT,
    medicamentos TEXT,
    alergias TEXT,
    contato_emergencia TEXT,
    data_inicio_instituto DATE,
    ativo BOOLEAN DEFAULT true,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Oficinas
CREATE TABLE IF NOT EXISTS oficinas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    instrutor VARCHAR(255),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    local TEXT,
    vagas_total INTEGER,
    projeto_id INTEGER REFERENCES projetos(id),
    responsavel_id INTEGER REFERENCES usuarios(id),
    status VARCHAR(50) DEFAULT 'ativa', -- valores possíveis: ativa, concluida, cancelada
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Participações
CREATE TABLE IF NOT EXISTS participacoes (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    projeto_id INTEGER REFERENCES projetos(id),
    oficina_id INTEGER REFERENCES oficinas(id),
    data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'inscrita', -- valores possíveis: inscrita, confirmada, concluida, desistente
    avaliacao TEXT,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Eventos de Auditoria
CREATE TABLE IF NOT EXISTS eventos_auditoria (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL, -- valores possíveis: criacao, atualizacao, exclusao, acesso
    modulo VARCHAR(50) NOT NULL, -- valores possíveis: usuarios, beneficiarias, oficinas, projetos, participacoes
    descricao TEXT NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    ip_origem VARCHAR(45),
    data_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização de consultas frequentes
CREATE INDEX IF NOT EXISTS idx_beneficiarias_bairro ON beneficiarias(bairro) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_oficinas_projeto ON oficinas(projeto_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_participacoes_beneficiaria ON participacoes(beneficiaria_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_participacoes_oficina ON participacoes(oficina_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_tipo ON eventos_auditoria(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_data ON eventos_auditoria(data_evento);

-- Comentários nas tabelas
COMMENT ON TABLE usuarios IS 'Tabela de usuários do sistema, incluindo administradores e gestores';
COMMENT ON TABLE projetos IS 'Projetos sociais realizados pela instituição';
COMMENT ON TABLE beneficiarias IS 'Cadastro das beneficiárias atendidas pelos projetos';
COMMENT ON TABLE oficinas IS 'Oficinas e atividades realizadas dentro dos projetos';
COMMENT ON TABLE participacoes IS 'Registro de participação das beneficiárias nas oficinas';
COMMENT ON TABLE eventos_auditoria IS 'Log de auditoria de todas as operações realizadas no sistema';

-- Triggers para atualização automática do campo data_atualizacao
CREATE OR REPLACE FUNCTION update_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_data_atualizacao
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE PROCEDURE update_data_atualizacao();

CREATE TRIGGER update_projetos_data_atualizacao
    BEFORE UPDATE ON projetos
    FOR EACH ROW
    EXECUTE PROCEDURE update_data_atualizacao();

CREATE TRIGGER update_beneficiarias_data_atualizacao
    BEFORE UPDATE ON beneficiarias
    FOR EACH ROW
    EXECUTE PROCEDURE update_data_atualizacao();

CREATE TRIGGER update_oficinas_data_atualizacao
    BEFORE UPDATE ON oficinas
    FOR EACH ROW
    EXECUTE PROCEDURE update_data_atualizacao();

CREATE TRIGGER update_participacoes_data_atualizacao
    BEFORE UPDATE ON participacoes
    FOR EACH ROW
    EXECUTE PROCEDURE update_data_atualizacao();
