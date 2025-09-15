-- Tabela de organizações (multi-tenant básico)
CREATE TABLE IF NOT EXISTS organizacoes (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj VARCHAR(18) UNIQUE,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Trigger simples para updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'organizacoes_set_updated_at'
  ) THEN
    CREATE FUNCTION organizacoes_set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_organizacoes_updated_at'
  ) THEN
    CREATE TRIGGER trg_organizacoes_updated_at
    BEFORE UPDATE ON organizacoes
    FOR EACH ROW EXECUTE FUNCTION organizacoes_set_updated_at();
  END IF;
END $$;

