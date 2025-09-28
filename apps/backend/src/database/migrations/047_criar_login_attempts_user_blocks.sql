-- Tabelas para controle de tentativas de login e bloqueios temporários
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts (email, attempt_time DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_time
  ON login_attempts (attempt_time);

CREATE TABLE IF NOT EXISTS user_blocks (
  email VARCHAR(255) PRIMARY KEY,
  blocked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_until
  ON user_blocks (blocked_until);

CREATE OR REPLACE FUNCTION update_user_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_blocks_updated_at ON user_blocks;
CREATE TRIGGER trg_user_blocks_updated_at
BEFORE UPDATE ON user_blocks
FOR EACH ROW
EXECUTE FUNCTION update_user_blocks_updated_at();
