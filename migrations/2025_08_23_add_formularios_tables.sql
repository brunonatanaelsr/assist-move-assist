-- Tabela para Roda da Vida
CREATE TABLE IF NOT EXISTS roda_vida (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    saude_bem_estar INTEGER NOT NULL,
    relacionamentos INTEGER NOT NULL,
    profissional INTEGER NOT NULL,
    financeiro INTEGER NOT NULL,
    desenvolvimento_pessoal INTEGER NOT NULL,
    espiritual INTEGER NOT NULL,
    lazer_recreacao INTEGER NOT NULL,
    ambiente_fisico INTEGER NOT NULL,
    observacoes TEXT,
    criado_por INTEGER REFERENCES usuarios(id),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- Tabela para Ficha de Evolução
CREATE TABLE IF NOT EXISTS fichas_evolucao (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    data_atendimento DATE NOT NULL,
    tipo_atendimento VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    encaminhamentos TEXT,
    proximos_passos TEXT,
    criado_por INTEGER REFERENCES usuarios(id),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- Tabela para Visão Holística
CREATE TABLE IF NOT EXISTS visao_holistica (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    aspecto_fisico TEXT,
    aspecto_emocional TEXT,
    aspecto_social TEXT,
    aspecto_profissional TEXT,
    aspecto_familiar TEXT,
    principais_desafios TEXT,
    pontos_fortes TEXT,
    areas_desenvolvimento TEXT,
    recomendacoes TEXT,
    criado_por INTEGER REFERENCES usuarios(id),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- Tabela para Plano de Ação
CREATE TABLE IF NOT EXISTS planos_acao (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    objetivo TEXT NOT NULL,
    metas TEXT NOT NULL,
    acoes_necessarias TEXT NOT NULL,
    prazo DATE,
    recursos_necessarios TEXT,
    indicadores_sucesso TEXT,
    status VARCHAR(50) DEFAULT 'em_andamento',
    progresso INTEGER DEFAULT 0,
    observacoes TEXT,
    criado_por INTEGER REFERENCES usuarios(id),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- Tabela para Disponibilidade
CREATE TABLE IF NOT EXISTS disponibilidade (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    dias_semana VARCHAR(100) NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    restricoes TEXT,
    preferencias TEXT,
    observacoes TEXT,
    criado_por INTEGER REFERENCES usuarios(id),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- Tabela para Termos de Consentimento
CREATE TABLE IF NOT EXISTS termos_consentimento (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    tipo_termo VARCHAR(50) NOT NULL,
    conteudo TEXT NOT NULL,
    data_assinatura TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_assinatura VARCHAR(45),
    dispositivo_assinatura TEXT,
    hash_assinatura TEXT,
    criado_por INTEGER REFERENCES usuarios(id),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_roda_vida_beneficiaria ON roda_vida(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_fichas_evolucao_beneficiaria ON fichas_evolucao(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_visao_holistica_beneficiaria ON visao_holistica(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_planos_acao_beneficiaria ON planos_acao(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidade_beneficiaria ON disponibilidade(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_termos_consentimento_beneficiaria ON termos_consentimento(beneficiaria_id);

-- Triggers para atualização automática de data_atualizacao
CREATE OR REPLACE FUNCTION update_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_roda_vida_data_atualizacao
    BEFORE UPDATE ON roda_vida
    FOR EACH ROW EXECUTE FUNCTION update_data_atualizacao();

CREATE TRIGGER trigger_fichas_evolucao_data_atualizacao
    BEFORE UPDATE ON fichas_evolucao
    FOR EACH ROW EXECUTE FUNCTION update_data_atualizacao();

CREATE TRIGGER trigger_visao_holistica_data_atualizacao
    BEFORE UPDATE ON visao_holistica
    FOR EACH ROW EXECUTE FUNCTION update_data_atualizacao();

CREATE TRIGGER trigger_planos_acao_data_atualizacao
    BEFORE UPDATE ON planos_acao
    FOR EACH ROW EXECUTE FUNCTION update_data_atualizacao();

CREATE TRIGGER trigger_disponibilidade_data_atualizacao
    BEFORE UPDATE ON disponibilidade
    FOR EACH ROW EXECUTE FUNCTION update_data_atualizacao();

CREATE TRIGGER trigger_termos_consentimento_data_atualizacao
    BEFORE UPDATE ON termos_consentimento
    FOR EACH ROW EXECUTE FUNCTION update_data_atualizacao();
