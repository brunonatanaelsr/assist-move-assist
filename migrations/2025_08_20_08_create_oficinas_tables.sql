-- Migration: 2025_08_20_08_create_oficinas_tables.sql

-- Enum para status da oficina
CREATE TYPE status_oficina AS ENUM (
    'ativo',
    'pausado',
    'concluido',
    'cancelado',
    'planejamento'
);

-- Enum para dias da semana
CREATE TYPE dia_semana AS ENUM (
    'segunda',
    'terca',
    'quarta',
    'quinta',
    'sexta',
    'sabado',
    'domingo'
);

-- Tabela principal de oficinas
CREATE TABLE IF NOT EXISTS oficinas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    responsavel_id INTEGER NOT NULL REFERENCES usuarios(id),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    dias_semana dia_semana[] NOT NULL,
    local VARCHAR(200) NOT NULL,
    vagas INTEGER NOT NULL,
    vagas_ocupadas INTEGER NOT NULL DEFAULT 0,
    status status_oficina NOT NULL DEFAULT 'planejamento',
    pre_requisitos TEXT[],
    materiais_necessarios TEXT[],
    objetivos TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_datas CHECK (
        data_fim IS NULL OR data_fim >= data_inicio
    ),
    CONSTRAINT check_horarios CHECK (
        horario_fim > horario_inicio
    ),
    CONSTRAINT check_vagas CHECK (
        vagas > 0 AND vagas_ocupadas >= 0 AND vagas_ocupadas <= vagas
    )
);

-- Instâncias de oficinas (ocorrências)
CREATE TABLE IF NOT EXISTS oficinas_instancias (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'agendada',
    observacoes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_oficina_data UNIQUE (oficina_id, data)
);

-- Participantes das oficinas
CREATE TABLE IF NOT EXISTS participantes_oficina (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    data_inscricao DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'inscrita',
    observacoes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_participante_oficina UNIQUE (oficina_id, beneficiaria_id)
);

-- Presença nas oficinas
CREATE TABLE IF NOT EXISTS presenca_oficina (
    id SERIAL PRIMARY KEY,
    instancia_id INTEGER NOT NULL REFERENCES oficinas_instancias(id) ON DELETE CASCADE,
    participante_id INTEGER NOT NULL REFERENCES participantes_oficina(id),
    presente BOOLEAN NOT NULL DEFAULT false,
    justificativa TEXT,
    registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_presenca UNIQUE (instancia_id, participante_id)
);

-- Avaliações das oficinas
CREATE TABLE IF NOT EXISTS avaliacoes_oficina (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    nota INTEGER NOT NULL,
    comentario TEXT,
    aspectos_positivos TEXT[],
    aspectos_negativos TEXT[],
    sugestoes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_nota CHECK (nota BETWEEN 1 AND 5),
    CONSTRAINT unique_avaliacao UNIQUE (oficina_id, beneficiaria_id)
);

-- Materiais das oficinas
CREATE TABLE IF NOT EXISTS materiais_oficina (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    quantidade INTEGER NOT NULL,
    unidade VARCHAR(50) NOT NULL,
    obrigatorio BOOLEAN NOT NULL DEFAULT true,
    fornecido_instituto BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_quantidade CHECK (quantidade > 0)
);

-- Triggers para atualização automática
CREATE TRIGGER update_oficinas_updated_at
    BEFORE UPDATE ON oficinas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oficinas_instancias_updated_at
    BEFORE UPDATE ON oficinas_instancias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participantes_oficina_updated_at
    BEFORE UPDATE ON participantes_oficina
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_presenca_oficina_updated_at
    BEFORE UPDATE ON presenca_oficina
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materiais_oficina_updated_at
    BEFORE UPDATE ON materiais_oficina
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar vagas ocupadas
CREATE OR REPLACE FUNCTION atualizar_vagas_ocupadas()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE oficinas
        SET vagas_ocupadas = vagas_ocupadas + 1
        WHERE id = NEW.oficina_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE oficinas
        SET vagas_ocupadas = vagas_ocupadas - 1
        WHERE id = OLD.oficina_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_vagas_ocupadas
    AFTER INSERT OR DELETE ON participantes_oficina
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_vagas_ocupadas();

-- Função para verificar disponibilidade de vagas
CREATE OR REPLACE FUNCTION verificar_vagas_disponiveis()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        SELECT vagas_ocupadas >= vagas
        FROM oficinas
        WHERE id = NEW.oficina_id
    ) THEN
        RAISE EXCEPTION 'Não há vagas disponíveis nesta oficina';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_verificar_vagas
    BEFORE INSERT ON participantes_oficina
    FOR EACH ROW
    EXECUTE FUNCTION verificar_vagas_disponiveis();

-- Índices
CREATE INDEX idx_oficinas_projeto ON oficinas(projeto_id);
CREATE INDEX idx_oficinas_responsavel ON oficinas(responsavel_id);
CREATE INDEX idx_oficinas_status ON oficinas(status);
CREATE INDEX idx_instancias_oficina ON oficinas_instancias(oficina_id);
CREATE INDEX idx_instancias_data ON oficinas_instancias(data);
CREATE INDEX idx_participantes_oficina ON participantes_oficina(oficina_id);
CREATE INDEX idx_participantes_beneficiaria ON participantes_oficina(beneficiaria_id);
CREATE INDEX idx_presenca_instancia ON presenca_oficina(instancia_id);
CREATE INDEX idx_avaliacoes_oficina ON avaliacoes_oficina(oficina_id);
CREATE INDEX idx_materiais_oficina ON materiais_oficina(oficina_id);

-- Função para calcular frequência
CREATE OR REPLACE FUNCTION calcular_frequencia_beneficiaria(
    p_oficina_id INTEGER,
    p_beneficiaria_id INTEGER
) RETURNS DECIMAL AS $$
DECLARE
    v_total_encontros INTEGER;
    v_presencas INTEGER;
BEGIN
    -- Total de encontros realizados
    SELECT COUNT(*)
    INTO v_total_encontros
    FROM oficinas_instancias oi
    WHERE oi.oficina_id = p_oficina_id
    AND oi.data <= CURRENT_DATE;
    
    -- Total de presenças
    SELECT COUNT(*)
    INTO v_presencas
    FROM presenca_oficina p
    JOIN oficinas_instancias oi ON p.instancia_id = oi.id
    JOIN participantes_oficina po ON p.participante_id = po.id
    WHERE po.oficina_id = p_oficina_id
    AND po.beneficiaria_id = p_beneficiaria_id
    AND p.presente = true;
    
    IF v_total_encontros = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN (v_presencas::DECIMAL / v_total_encontros::DECIMAL) * 100;
END;
$$ LANGUAGE plpgsql;
