-- Criação da tabela participacoes para inscrições de beneficiárias em oficinas/projetos

CREATE TABLE participacoes (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL,
    oficina_id INTEGER,
    projeto_id INTEGER,
    data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_participacao VARCHAR(50) DEFAULT 'ativa',
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_participacoes_beneficiaria FOREIGN KEY (beneficiaria_id) REFERENCES beneficiarias(id) ON DELETE CASCADE,
    CONSTRAINT fk_participacoes_oficina FOREIGN KEY (oficina_id) REFERENCES oficinas(id) ON DELETE SET NULL,
    CONSTRAINT fk_participacoes_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE SET NULL
);

-- Índices para otimizar buscas
CREATE INDEX idx_participacoes_beneficiaria ON participacoes(beneficiaria_id);
CREATE INDEX idx_participacoes_oficina ON participacoes(oficina_id);
CREATE INDEX idx_participacoes_projeto ON participacoes(projeto_id);
CREATE INDEX idx_participacoes_ativo ON participacoes(ativo);

-- Função e trigger para atualizar timestamp de atualização
CREATE OR REPLACE FUNCTION update_participacoes_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_participacoes_update_data_atualizacao
BEFORE UPDATE ON participacoes
FOR EACH ROW EXECUTE FUNCTION update_participacoes_data_atualizacao();

COMMENT ON TABLE participacoes IS 'Participações de beneficiárias em oficinas e projetos';
COMMENT ON COLUMN participacoes.data_inscricao IS 'Data e hora da inscrição';
COMMENT ON COLUMN participacoes.status_participacao IS 'Status da participação';
