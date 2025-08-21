-- Criar tabela de avaliações de oficinas
CREATE TABLE avaliacoes_oficinas (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    pontos_positivos TEXT,
    pontos_melhorar TEXT,
    sugestoes TEXT,
    data_avaliacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    anonima BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(oficina_id, beneficiaria_id)
);

-- Criar índices para otimização
CREATE INDEX idx_avaliacoes_oficinas_oficina ON avaliacoes_oficinas(oficina_id);
CREATE INDEX idx_avaliacoes_oficinas_beneficiaria ON avaliacoes_oficinas(beneficiaria_id);
CREATE INDEX idx_avaliacoes_oficinas_nota ON avaliacoes_oficinas(nota);

COMMENT ON TABLE avaliacoes_oficinas IS 'Armazena as avaliações das oficinas feitas pelas beneficiárias';
COMMENT ON COLUMN avaliacoes_oficinas.nota IS 'Nota de 1 a 5 dada pela beneficiária';
COMMENT ON COLUMN avaliacoes_oficinas.anonima IS 'Indica se a avaliação deve ser mantida anônima';
COMMENT ON COLUMN avaliacoes_oficinas.pontos_positivos IS 'Pontos positivos destacados pela beneficiária';
COMMENT ON COLUMN avaliacoes_oficinas.pontos_melhorar IS 'Pontos que podem ser melhorados segundo a beneficiária';
