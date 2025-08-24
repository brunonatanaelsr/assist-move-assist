ALTER TABLE usuarios ADD COLUMN perfil_id INTEGER;
ALTER TABLE usuarios ADD FOREIGN KEY (perfil_id) REFERENCES perfis(id);

-- Criar índice para melhor performance em consultas de usuários por perfil
CREATE INDEX idx_usuarios_perfil ON usuarios(perfil_id);
