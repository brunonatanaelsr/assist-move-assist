CREATE TABLE perfil_permissoes (
    id SERIAL PRIMARY KEY,
    perfil_id INTEGER NOT NULL,
    permissao_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (perfil_id) REFERENCES perfis(id) ON DELETE CASCADE,
    FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE
);

CREATE INDEX idx_perfil_permissoes_perfil ON perfil_permissoes(perfil_id);
CREATE INDEX idx_perfil_permissoes_permissao ON perfil_permissoes(permissao_id);
