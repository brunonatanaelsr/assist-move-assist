-- Criação da tabela de logs de auditoria e permissão associada
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tabela VARCHAR(120) NOT NULL,
  operacao VARCHAR(50) NOT NULL,
  registro_id VARCHAR(255),
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  detalhes TEXT,
  ip VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tabela ON audit_logs(tabela);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Permissão para leitura dos logs de auditoria
INSERT INTO permissions (name, description)
VALUES ('auditoria.ler', 'Visualizar registros de auditoria')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role, permission)
VALUES ('admin', 'auditoria.ler')
ON CONFLICT (role, permission) DO NOTHING;
