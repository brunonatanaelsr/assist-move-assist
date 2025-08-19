-- Ajustes na tabela de projetos
ALTER TABLE projetos
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN data_inicio SET NOT NULL,
    ALTER COLUMN status SET DEFAULT 'planejamento',
    ALTER COLUMN responsavel_id SET NOT NULL;

-- Ajustes na tabela de oficinas
ALTER TABLE oficinas
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN data_inicio SET NOT NULL,
    ALTER COLUMN responsavel_id SET NOT NULL,
    ALTER COLUMN status SET DEFAULT 'planejamento';

-- Ajustes na tabela de beneficiarias
ALTER TABLE beneficiarias
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN cpf SET NOT NULL,
    ALTER COLUMN data_nascimento SET NOT NULL;

-- Adicionando validações e constraints
ALTER TABLE projetos
    DROP CONSTRAINT IF EXISTS projetos_status_check,
    ADD CONSTRAINT projetos_status_check 
    CHECK (status IN ('planejamento', 'em_andamento', 'ativo', 'pausado', 'finalizado', 'concluido', 'cancelado')),
    ADD CONSTRAINT projetos_datas_check 
    CHECK (
        (data_inicio IS NOT NULL) AND
        (data_fim_prevista IS NULL OR data_inicio <= data_fim_prevista) AND
        (data_fim IS NULL OR data_inicio <= data_fim)
    );

ALTER TABLE oficinas
    DROP CONSTRAINT IF EXISTS oficinas_status_check,
    ADD CONSTRAINT oficinas_status_check 
    CHECK (status IN ('planejamento', 'em_andamento', 'ativo', 'pausado', 'finalizado', 'concluido', 'cancelado')),
    ADD CONSTRAINT oficinas_datas_check 
    CHECK (
        (data_inicio IS NOT NULL) AND
        (data_fim IS NULL OR data_inicio <= data_fim)
    );

-- Adicionando índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_projetos_nome ON projetos(nome);
CREATE INDEX IF NOT EXISTS idx_projetos_status ON projetos(status);
CREATE INDEX IF NOT EXISTS idx_projetos_responsavel ON projetos(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_projetos_data_inicio ON projetos(data_inicio);

CREATE INDEX IF NOT EXISTS idx_oficinas_nome ON oficinas(nome);
CREATE INDEX IF NOT EXISTS idx_oficinas_status ON oficinas(status);
CREATE INDEX IF NOT EXISTS idx_oficinas_responsavel ON oficinas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_oficinas_projeto ON oficinas(projeto_id);

CREATE INDEX IF NOT EXISTS idx_beneficiarias_nome ON beneficiarias(nome);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_cpf ON beneficiarias(cpf);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_data_nascimento ON beneficiarias(data_nascimento);

-- Adicionando trigger para atualização automática de status baseado nas datas
CREATE OR REPLACE FUNCTION update_status_based_on_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Para projetos
    IF TG_TABLE_NAME = 'projetos' THEN
        IF NEW.data_fim IS NOT NULL THEN
            NEW.status = 'concluido';
        ELSIF NEW.data_inicio > CURRENT_DATE THEN
            NEW.status = 'planejamento';
        ELSIF NEW.status = 'planejamento' AND NEW.data_inicio <= CURRENT_DATE THEN
            NEW.status = 'em_andamento';
        END IF;
    -- Para oficinas
    ELSIF TG_TABLE_NAME = 'oficinas' THEN
        IF NEW.data_fim IS NOT NULL AND NEW.data_fim < CURRENT_DATE THEN
            NEW.status = 'concluido';
        ELSIF NEW.data_inicio > CURRENT_DATE THEN
            NEW.status = 'planejamento';
        ELSIF NEW.status = 'planejamento' AND NEW.data_inicio <= CURRENT_DATE THEN
            NEW.status = 'em_andamento';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criando os triggers para atualização de status
DROP TRIGGER IF EXISTS update_projeto_status ON projetos;
CREATE TRIGGER update_projeto_status
    BEFORE INSERT OR UPDATE ON projetos
    FOR EACH ROW
    EXECUTE FUNCTION update_status_based_on_dates();

DROP TRIGGER IF EXISTS update_oficina_status ON oficinas;
CREATE TRIGGER update_oficina_status
    BEFORE INSERT OR UPDATE ON oficinas
    FOR EACH ROW
    EXECUTE FUNCTION update_status_based_on_dates();

-- Adicionando função para validação de CPF
CREATE OR REPLACE FUNCTION is_valid_cpf(cpf text)
RETURNS boolean AS $$
DECLARE
    sum integer;
    digit integer;
    weight integer;
    i integer;
    clean_cpf text;
BEGIN
    -- Remove caracteres não numéricos
    clean_cpf := regexp_replace(cpf, '[^0-9]', '', 'g');
    
    -- Verifica se tem 11 dígitos
    IF length(clean_cpf) != 11 THEN
        RETURN false;
    END IF;
    
    -- Verifica se todos os dígitos são iguais
    IF clean_cpf ~ '^(\d)\1{10}$' THEN
        RETURN false;
    END IF;
    
    -- Valida primeiro dígito verificador
    sum := 0;
    FOR i IN 1..9 LOOP
        sum := sum + (substr(clean_cpf, i, 1)::integer * (11 - i));
    END LOOP;
    
    digit := (sum * 10) % 11;
    IF digit = 10 THEN
        digit := 0;
    END IF;
    
    IF digit != substr(clean_cpf, 10, 1)::integer THEN
        RETURN false;
    END IF;
    
    -- Valida segundo dígito verificador
    sum := 0;
    FOR i IN 1..10 LOOP
        sum := sum + (substr(clean_cpf, i, 1)::integer * (12 - i));
    END LOOP;
    
    digit := (sum * 10) % 11;
    IF digit = 10 THEN
        digit := 0;
    END IF;
    
    RETURN digit = substr(clean_cpf, 11, 1)::integer;
END;
$$ LANGUAGE plpgsql;

-- Adicionando validação de CPF para beneficiárias
ALTER TABLE beneficiarias
    DROP CONSTRAINT IF EXISTS beneficiarias_cpf_check,
    ADD CONSTRAINT beneficiarias_cpf_check 
    CHECK (is_valid_cpf(cpf));
