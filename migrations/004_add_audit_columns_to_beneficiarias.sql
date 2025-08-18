-- Migration: add_audit_columns_to_beneficiarias.sql

-- Adiciona colunas de auditoria na tabela beneficiarias
ALTER TABLE beneficiarias
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Adiciona índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_beneficiarias_updated_by ON beneficiarias(updated_by);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_deleted_by ON beneficiarias(deleted_by);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_deleted_at ON beneficiarias(deleted_at);

-- Comentários nas colunas
COMMENT ON COLUMN beneficiarias.updated_by IS 'ID do usuário que fez a última atualização';
COMMENT ON COLUMN beneficiarias.deleted_by IS 'ID do usuário que realizou a exclusão lógica';
COMMENT ON COLUMN beneficiarias.deleted_at IS 'Data e hora da exclusão lógica';

-- Função para atualizar o updated_by automaticamente
CREATE OR REPLACE FUNCTION update_beneficiaria_audit()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.updated_by = current_setting('app.current_user_id')::integer;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar os campos de auditoria
DROP TRIGGER IF EXISTS tr_beneficiaria_audit ON beneficiarias;
CREATE TRIGGER tr_beneficiaria_audit
    BEFORE UPDATE ON beneficiarias
    FOR EACH ROW
    EXECUTE FUNCTION update_beneficiaria_audit();

-- Função para soft delete
CREATE OR REPLACE FUNCTION soft_delete_beneficiaria()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deleted_at = CURRENT_TIMESTAMP;
    NEW.deleted_by = current_setting('app.current_user_id')::integer;
    NEW.status = 'inativa';
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para soft delete
DROP TRIGGER IF EXISTS tr_beneficiaria_soft_delete ON beneficiarias;
CREATE TRIGGER tr_beneficiaria_soft_delete
    BEFORE UPDATE OF status ON beneficiarias
    FOR EACH ROW
    WHEN (NEW.status = 'inativa' AND OLD.status != 'inativa')
    EXECUTE FUNCTION soft_delete_beneficiaria();
