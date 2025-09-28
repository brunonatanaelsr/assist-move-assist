-- Tabela responsável por armazenar tokens de refresh individuais por usuário e dispositivo
CREATE TABLE IF NOT EXISTS user_refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_id TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  device_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_refresh_tokens_user_device
  ON user_refresh_tokens(user_id, device_id);

CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_expires_at
  ON user_refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_revoked_at
  ON user_refresh_tokens(revoked_at);
