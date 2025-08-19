-- Remove trigger e função duplicada de atualização de timestamp
DROP TRIGGER IF EXISTS update_usuarios_data_atualizacao ON usuarios;
DROP FUNCTION IF EXISTS update_data_atualizacao();

-- Confirma que ainda temos o trigger principal
DO $$
BEGIN
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
END;
$$;
