-- Migração 042: estrutura de Plano de Ação com itens rastreáveis

CREATE TABLE IF NOT EXISTS planos_acao (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
  criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  objetivo_principal TEXT NOT NULL,
  areas_prioritarias TEXT[] DEFAULT ARRAY[]::TEXT[],
  observacoes TEXT,
  primeira_avaliacao_em DATE,
  primeira_avaliacao_nota TEXT,
  segunda_avaliacao_em DATE,
  segunda_avaliacao_nota TEXT,
  assinatura_beneficiaria TEXT,
  assinatura_responsavel TEXT
);

CREATE TABLE IF NOT EXISTS plano_acao_itens (
  id SERIAL PRIMARY KEY,
  plano_id INTEGER NOT NULL REFERENCES planos_acao(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  responsavel TEXT,
  prazo DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  suporte_oferecido TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planos_acao_beneficiaria ON planos_acao(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_plano_itens_plano ON plano_acao_itens(plano_id);
