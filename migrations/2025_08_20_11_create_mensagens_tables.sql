-- Migration: 2025_08_20_11_create_mensagens_tables.sql

-- Enum para tipo de mensagem
CREATE TYPE tipo_mensagem AS ENUM (
    'individual',
    'grupo',
    'sistema',
    'broadcast'
);

-- Enum para status de mensagem
CREATE TYPE status_mensagem AS ENUM (
    'enviada',
    'entregue',
    'lida',
    'falhou'
);

-- Tabela de conversas
CREATE TABLE IF NOT EXISTS conversas (
    id SERIAL PRIMARY KEY,
    tipo tipo_mensagem NOT NULL,
    titulo VARCHAR(200),
    descricao TEXT,
    criado_por INTEGER NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultima_mensagem_id INTEGER,
    arquivada BOOLEAN NOT NULL DEFAULT false
);

-- Participantes das conversas
CREATE TABLE IF NOT EXISTS participantes_conversa (
    id SERIAL PRIMARY KEY,
    conversa_id INTEGER NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    role VARCHAR(50) NOT NULL DEFAULT 'participante',
    notificacoes_ativas BOOLEAN NOT NULL DEFAULT true,
    arquivada BOOLEAN NOT NULL DEFAULT false,
    ultima_visualizacao TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_participante_conversa UNIQUE (conversa_id, usuario_id)
);

-- Mensagens
CREATE TABLE IF NOT EXISTS mensagens (
    id SERIAL PRIMARY KEY,
    conversa_id INTEGER NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
    remetente_id INTEGER NOT NULL REFERENCES usuarios(id),
    conteudo TEXT NOT NULL,
    tipo_conteudo VARCHAR(50) NOT NULL DEFAULT 'texto',
    status status_mensagem NOT NULL DEFAULT 'enviada',
    referencias JSONB, -- Para respostas e encaminhamentos
    metadata JSONB, -- Dados adicionais específicos do tipo
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Anexos das mensagens
CREATE TABLE IF NOT EXISTS anexos_mensagem (
    id SERIAL PRIMARY KEY,
    mensagem_id INTEGER NOT NULL REFERENCES mensagens(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    nome_arquivo VARCHAR(200) NOT NULL,
    url VARCHAR(500) NOT NULL,
    tamanho INTEGER NOT NULL,
    hash_arquivo VARCHAR(64) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_tamanho CHECK (tamanho > 0)
);

-- Status de entrega/leitura
CREATE TABLE IF NOT EXISTS status_mensagem_usuario (
    id SERIAL PRIMARY KEY,
    mensagem_id INTEGER NOT NULL REFERENCES mensagens(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    status status_mensagem NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_status_mensagem_usuario UNIQUE (mensagem_id, usuario_id)
);

-- Reações às mensagens
CREATE TABLE IF NOT EXISTS reacoes_mensagem (
    id SERIAL PRIMARY KEY,
    mensagem_id INTEGER NOT NULL REFERENCES mensagens(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    reacao VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_reacao_mensagem_usuario UNIQUE (mensagem_id, usuario_id)
);

-- Notificações de mensagens
CREATE TABLE IF NOT EXISTS notificacoes_mensagem (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    conversa_id INTEGER NOT NULL REFERENCES conversas(id),
    mensagem_id INTEGER NOT NULL REFERENCES mensagens(id),
    tipo VARCHAR(50) NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Triggers para atualização automática
CREATE TRIGGER update_conversas_updated_at
    BEFORE UPDATE ON conversas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participantes_conversa_updated_at
    BEFORE UPDATE ON participantes_conversa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar última mensagem da conversa
CREATE OR REPLACE FUNCTION atualizar_ultima_mensagem()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversas
    SET ultima_mensagem_id = NEW.id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversa_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_ultima_mensagem
    AFTER INSERT ON mensagens
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_ultima_mensagem();

-- Função para criar status de entrega inicial
CREATE OR REPLACE FUNCTION criar_status_entrega()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO status_mensagem_usuario (
        mensagem_id,
        usuario_id,
        status,
        timestamp
    )
    SELECT 
        NEW.id,
        pc.usuario_id,
        'enviada'::status_mensagem,
        CURRENT_TIMESTAMP
    FROM participantes_conversa pc
    WHERE pc.conversa_id = NEW.conversa_id
    AND pc.usuario_id != NEW.remetente_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_criar_status_entrega
    AFTER INSERT ON mensagens
    FOR EACH ROW
    EXECUTE FUNCTION criar_status_entrega();

-- Função para criar notificações de mensagem
CREATE OR REPLACE FUNCTION criar_notificacoes_mensagem()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notificacoes_mensagem (
        usuario_id,
        conversa_id,
        mensagem_id,
        tipo
    )
    SELECT 
        pc.usuario_id,
        NEW.conversa_id,
        NEW.id,
        'nova_mensagem'
    FROM participantes_conversa pc
    WHERE pc.conversa_id = NEW.conversa_id
    AND pc.usuario_id != NEW.remetente_id
    AND pc.notificacoes_ativas = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_criar_notificacoes_mensagem
    AFTER INSERT ON mensagens
    FOR EACH ROW
    EXECUTE FUNCTION criar_notificacoes_mensagem();

-- Índices
CREATE INDEX idx_conversas_tipo ON conversas(tipo);
CREATE INDEX idx_conversas_criador ON conversas(criado_por);
CREATE INDEX idx_participantes_conversa ON participantes_conversa(conversa_id);
CREATE INDEX idx_participantes_usuario ON participantes_conversa(usuario_id);
CREATE INDEX idx_mensagens_conversa ON mensagens(conversa_id);
CREATE INDEX idx_mensagens_remetente ON mensagens(remetente_id);
CREATE INDEX idx_mensagens_created ON mensagens(created_at);
CREATE INDEX idx_anexos_mensagem ON anexos_mensagem(mensagem_id);
CREATE INDEX idx_status_mensagem ON status_mensagem_usuario(mensagem_id);
CREATE INDEX idx_status_usuario ON status_mensagem_usuario(usuario_id);
CREATE INDEX idx_reacoes_mensagem ON reacoes_mensagem(mensagem_id);
CREATE INDEX idx_notificacoes_usuario ON notificacoes_mensagem(usuario_id);
CREATE INDEX idx_notificacoes_conversa ON notificacoes_mensagem(conversa_id);
