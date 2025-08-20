-- Migration: 2025_08_20_01_enhance_users_table.sql

-- Adicionando novas colunas para controle de token e sessão
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ultimo_token_refresh TIMESTAMP,
    ADD COLUMN IF NOT EXISTS sessoes_ativas INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_sessoes INTEGER NOT NULL DEFAULT 5;

-- Adicionando índices para otimização
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_token_version ON usuarios(token_version);

-- Adicionando constraints
ALTER TABLE usuarios
    ADD CONSTRAINT check_max_sessoes CHECK (sessoes_ativas <= max_sessoes),
    ADD CONSTRAINT check_valid_role CHECK (role IN ('super_admin', 'admin', 'coordenador', 'profissional', 'assistente'));

-- Function para atualizar sessoes_ativas
CREATE OR REPLACE FUNCTION update_sessoes_ativas()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE usuarios 
        SET sessoes_ativas = sessoes_ativas + 1
        WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE usuarios 
        SET sessoes_ativas = GREATEST(sessoes_ativas - 1, 0)
        WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
