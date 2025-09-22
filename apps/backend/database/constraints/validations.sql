-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Função para validar CPF
CREATE OR REPLACE FUNCTION validate_cpf(cpf TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    sum INTEGER := 0;
    dig1 INTEGER;
    dig2 INTEGER;
    i INTEGER;
BEGIN
    -- Remove caracteres não numéricos
    cpf := regexp_replace(cpf, '[^0-9]', '', 'g');
    
    -- Verifica tamanho
    IF length(cpf) != 11 THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica dígitos iguais
    IF cpf ~ '^(\d)\1{10}$' THEN
        RETURN FALSE;
    END IF;
    
    -- Calcula primeiro dígito
    FOR i IN 1..9 LOOP
        sum := sum + (substr(cpf, i, 1)::INTEGER * (11 - i));
    END LOOP;
    
    dig1 := 11 - (sum % 11);
    IF dig1 >= 10 THEN
        dig1 := 0;
    END IF;
    
    -- Verifica primeiro dígito
    IF dig1 != substr(cpf, 10, 1)::INTEGER THEN
        RETURN FALSE;
    END IF;
    
    -- Calcula segundo dígito
    sum := 0;
    FOR i IN 1..10 LOOP
        sum := sum + (substr(cpf, i, 1)::INTEGER * (12 - i));
    END LOOP;
    
    dig2 := 11 - (sum % 11);
    IF dig2 >= 10 THEN
        dig2 := 0;
    END IF;
    
    -- Verifica segundo dígito
    RETURN dig2 = substr(cpf, 11, 1)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar CPF na inserção
CREATE OR REPLACE FUNCTION validate_cpf_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT validate_cpf(NEW.cpf) THEN
        RAISE EXCEPTION 'CPF inválido';
    END IF;

    -- Verifica se CPF já existe
    IF EXISTS (
        SELECT 1 FROM beneficiarias 
        WHERE cpf = NEW.cpf 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    ) THEN
        RAISE EXCEPTION 'CPF já cadastrado';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validação de CPF
CREATE TRIGGER beneficiarias_cpf_validation
BEFORE INSERT OR UPDATE ON beneficiarias
FOR EACH ROW
EXECUTE FUNCTION validate_cpf_trigger();

-- Check constraints para validação de campos
ALTER TABLE beneficiarias
    ADD CONSTRAINT check_telefone 
    CHECK (telefone ~ '^[1-9]{2}9?[0-9]{8}$'),
    ADD CONSTRAINT check_email 
    CHECK (email ~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    ADD CONSTRAINT check_cep
    CHECK (cep ~ '^\d{5}-?\d{3}$');

-- Função para gerar texto de busca
CREATE OR REPLACE FUNCTION generate_search_text(nome text, cpf text, endereco text)
RETURNS tsvector AS $$
BEGIN
    RETURN to_tsvector('portuguese',
        COALESCE(unaccent(nome), '') || ' ' ||
        COALESCE(cpf, '') || ' ' ||
        COALESCE(unaccent(endereco), '')
    );
END;
$$ LANGUAGE plpgsql;

-- Tabela de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger de auditoria
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_by
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
        current_user
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de auditoria
CREATE TRIGGER beneficiarias_audit
AFTER INSERT OR UPDATE OR DELETE ON beneficiarias
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();
