CREATE TABLE permissoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    modulo VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissoes_nome ON permissoes(nome);
CREATE INDEX idx_permissoes_modulo ON permissoes(modulo);
