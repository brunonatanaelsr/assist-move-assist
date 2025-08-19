-- Correção de triggers duplicados do sistema Move Marias
-- Remove triggers redundantes mantendo apenas uma função de atualização de timestamp

-- 1. Remove triggers duplicados de todas as tabelas
DROP TRIGGER IF EXISTS update_usuarios_data_atualizacao ON usuarios;
DROP TRIGGER IF EXISTS update_projetos_data_atualizacao ON projetos;
DROP TRIGGER IF EXISTS update_oficinas_data_atualizacao ON oficinas;
DROP TRIGGER IF EXISTS update_beneficiarias_data_atualizacao ON beneficiarias;
DROP TRIGGER IF EXISTS update_participacoes_data_atualizacao ON participacoes;

-- 2. Verifica se os triggers principais existem e os recria se necessário
DO $$
BEGIN
    -- Para usuários
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_usuarios_updated_at'
    ) THEN
        CREATE TRIGGER update_usuarios_updated_at 
        BEFORE UPDATE ON usuarios 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Para projetos
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_projetos_updated_at'
    ) THEN
        CREATE TRIGGER update_projetos_updated_at 
        BEFORE UPDATE ON projetos 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Para oficinas
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_oficinas_updated_at'
    ) THEN
        CREATE TRIGGER update_oficinas_updated_at 
        BEFORE UPDATE ON oficinas 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Para beneficiárias
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_beneficiarias_updated_at'
    ) THEN
        CREATE TRIGGER update_beneficiarias_updated_at 
        BEFORE UPDATE ON beneficiarias 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Para participações
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_participacoes_updated_at'
    ) THEN
        CREATE TRIGGER update_participacoes_updated_at 
        BEFORE UPDATE ON participacoes 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;
