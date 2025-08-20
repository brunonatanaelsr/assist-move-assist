-- Migration: 2025_08_20_10_create_formularios_tables.sql

-- Enum para tipo de campo
CREATE TYPE tipo_campo AS ENUM (
    'texto',
    'numero',
    'data',
    'hora',
    'selecao',
    'multipla_escolha',
    'checkbox',
    'arquivo',
    'area_texto',
    'cpf',
    'cnpj',
    'telefone',
    'email',
    'endereco'
);

-- Tabela de modelos de formulários
CREATE TABLE IF NOT EXISTS formularios_modelos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100) NOT NULL,
    versao VARCHAR(20) NOT NULL DEFAULT '1.0',
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_por INTEGER NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_nome_versao UNIQUE (nome, versao)
);

-- Campos dos formulários
CREATE TABLE IF NOT EXISTS formularios_campos (
    id SERIAL PRIMARY KEY,
    modelo_id INTEGER NOT NULL REFERENCES formularios_modelos(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    tipo tipo_campo NOT NULL,
    ordem INTEGER NOT NULL,
    obrigatorio BOOLEAN NOT NULL DEFAULT false,
    dica TEXT,
    opcoes JSONB, -- Para campos de seleção/múltipla escolha
    validacoes JSONB, -- Regras de validação
    valor_padrao TEXT,
    mascara VARCHAR(100),
    dependencias JSONB, -- Campos que controlam visibilidade
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_campo_modelo UNIQUE (modelo_id, nome)
);

-- Respostas dos formulários
CREATE TABLE IF NOT EXISTS formularios_respostas (
    id SERIAL PRIMARY KEY,
    modelo_id INTEGER NOT NULL REFERENCES formularios_modelos(id),
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    preenchido_por INTEGER NOT NULL REFERENCES usuarios(id),
    status VARCHAR(50) NOT NULL DEFAULT 'completo',
    data_preenchimento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultima_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    respostas JSONB NOT NULL,
    arquivos JSONB, -- URLs dos arquivos enviados
    observacoes TEXT,
    
    CONSTRAINT unique_resposta_beneficiaria UNIQUE (modelo_id, beneficiaria_id)
);

-- Histórico de alterações
CREATE TABLE IF NOT EXISTS formularios_historico (
    id SERIAL PRIMARY KEY,
    resposta_id INTEGER NOT NULL REFERENCES formularios_respostas(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo_alteracao VARCHAR(50) NOT NULL,
    campos_alterados JSONB NOT NULL,
    valores_anteriores JSONB NOT NULL,
    valores_novos JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Documentos anexados
CREATE TABLE IF NOT EXISTS formularios_documentos (
    id SERIAL PRIMARY KEY,
    resposta_id INTEGER NOT NULL REFERENCES formularios_respostas(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(200) NOT NULL,
    tipo_arquivo VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    tamanho INTEGER NOT NULL,
    hash_arquivo VARCHAR(64) NOT NULL,
    campo_id INTEGER NOT NULL REFERENCES formularios_campos(id),
    uploaded_por INTEGER NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_tamanho CHECK (tamanho > 0)
);

-- Triggers para atualização automática
CREATE TRIGGER update_formularios_modelos_updated_at
    BEFORE UPDATE ON formularios_modelos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formularios_campos_updated_at
    BEFORE UPDATE ON formularios_campos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para registrar alterações no histórico
CREATE OR REPLACE FUNCTION registrar_alteracao_formulario()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO formularios_historico (
        resposta_id,
        usuario_id,
        tipo_alteracao,
        campos_alterados,
        valores_anteriores,
        valores_novos
    ) VALUES (
        NEW.id,
        NEW.preenchido_por,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'criacao'
            ELSE 'atualizacao'
        END,
        (
            SELECT jsonb_object_agg(key, true)
            FROM jsonb_each(NEW.respostas)
            WHERE NOT OLD.respostas ? key
            OR OLD.respostas->key != NEW.respostas->key
        ),
        CASE
            WHEN TG_OP = 'INSERT' THEN '{}'::jsonb
            ELSE OLD.respostas
        END,
        NEW.respostas
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_registrar_alteracao_formulario
    AFTER INSERT OR UPDATE OF respostas ON formularios_respostas
    FOR EACH ROW
    EXECUTE FUNCTION registrar_alteracao_formulario();

-- Índices
CREATE INDEX idx_formularios_modelos_categoria ON formularios_modelos(categoria);
CREATE INDEX idx_formularios_modelos_ativo ON formularios_modelos(ativo);
CREATE INDEX idx_formularios_campos_modelo ON formularios_campos(modelo_id);
CREATE INDEX idx_formularios_campos_tipo ON formularios_campos(tipo);
CREATE INDEX idx_formularios_respostas_modelo ON formularios_respostas(modelo_id);
CREATE INDEX idx_formularios_respostas_beneficiaria ON formularios_respostas(beneficiaria_id);
CREATE INDEX idx_formularios_historico_resposta ON formularios_historico(resposta_id);
CREATE INDEX idx_formularios_documentos_resposta ON formularios_documentos(resposta_id);

-- Função para validar respostas
CREATE OR REPLACE FUNCTION validar_respostas_formulario()
RETURNS TRIGGER AS $$
DECLARE
    campo RECORD;
    valor_resposta TEXT;
    mensagem_erro TEXT;
BEGIN
    FOR campo IN (
        SELECT id, nome, tipo, obrigatorio, validacoes
        FROM formularios_campos
        WHERE modelo_id = NEW.modelo_id
    ) LOOP
        valor_resposta := NEW.respostas->>campo.nome;
        
        -- Verificar campos obrigatórios
        IF campo.obrigatorio AND (valor_resposta IS NULL OR valor_resposta = '') THEN
            mensagem_erro := 'Campo obrigatório não preenchido: ' || campo.nome;
            RAISE EXCEPTION '%', mensagem_erro;
        END IF;
        
        -- Validar tipo de dados
        CASE campo.tipo
            WHEN 'numero'::tipo_campo THEN
                IF valor_resposta IS NOT NULL AND valor_resposta !~ '^[0-9]+(\.[0-9]+)?$' THEN
                    mensagem_erro := 'Valor inválido para campo numérico: ' || campo.nome;
                    RAISE EXCEPTION '%', mensagem_erro;
                END IF;
            WHEN 'data'::tipo_campo THEN
                IF valor_resposta IS NOT NULL AND valor_resposta !~ '^\d{4}-\d{2}-\d{2}$' THEN
                    mensagem_erro := 'Formato de data inválido: ' || campo.nome;
                    RAISE EXCEPTION '%', mensagem_erro;
                END IF;
            WHEN 'email'::tipo_campo THEN
                IF valor_resposta IS NOT NULL AND valor_resposta !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
                    mensagem_erro := 'E-mail inválido: ' || campo.nome;
                    RAISE EXCEPTION '%', mensagem_erro;
                END IF;
            WHEN 'cpf'::tipo_campo THEN
                IF valor_resposta IS NOT NULL AND valor_resposta !~ '^\d{11}$' THEN
                    mensagem_erro := 'CPF inválido: ' || campo.nome;
                    RAISE EXCEPTION '%', mensagem_erro;
                END IF;
        END CASE;
        
        -- Validações customizadas (se existirem)
        IF campo.validacoes IS NOT NULL THEN
            -- Implementar validações específicas aqui
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validar_respostas_formulario
    BEFORE INSERT OR UPDATE OF respostas ON formularios_respostas
    FOR EACH ROW
    EXECUTE FUNCTION validar_respostas_formulario();
