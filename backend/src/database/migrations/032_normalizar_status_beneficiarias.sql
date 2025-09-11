-- Normalizar valores de status em beneficiarias para um conjunto consistente
-- Ajuste para upper-case e padronização com o código

-- Atualiza valores comuns para upper-case
UPDATE beneficiarias SET status = 'ATIVO'   WHERE LOWER(status) IN ('ativa', 'ativo');
UPDATE beneficiarias SET status = 'INATIVO' WHERE LOWER(status) IN ('inativa', 'inativo', 'inativado', 'desativado');

-- Define default consistente
ALTER TABLE beneficiarias ALTER COLUMN status SET DEFAULT 'ATIVO';

-- Adiciona constraint opcional de domínio de status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'beneficiarias' AND constraint_name = 'chk_beneficiarias_status') THEN
    ALTER TABLE beneficiarias
      ADD CONSTRAINT chk_beneficiarias_status
      CHECK (status IN ('ATIVO','INATIVO'));
  END IF;
END $$;

