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

-- Função e trigger para atualizar campo updated_at
CREATE OR REPLACE FUNCTION organizacoes_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Garante trigger idempotente
DROP TRIGGER IF EXISTS trg_organizacoes_updated_at ON organizacoes;
CREATE TRIGGER trg_organizacoes_updated_at
BEFORE UPDATE ON organizacoes
FOR EACH ROW EXECUTE FUNCTION organizacoes_set_updated_at();
