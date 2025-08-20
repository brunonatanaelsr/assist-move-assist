-- Criar tabela mensagens se não existir
CREATE TABLE IF NOT EXISTS mensagens (
    id SERIAL PRIMARY KEY,
    conteudo TEXT NOT NULL,
    remetente_id INTEGER REFERENCES usuarios(id),
    destinatario_id INTEGER REFERENCES usuarios(id),
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_leitura TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices faltantes
CREATE INDEX IF NOT EXISTS idx_oficinas_data ON oficinas(data_inicio);
CREATE INDEX IF NOT EXISTS idx_mensagens_remetente ON mensagens(remetente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario ON mensagens(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_data_envio ON mensagens(data_envio);

-- Criar triggers de atualização de data
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para cada tabela
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_beneficiarias_updated_at ON beneficiarias;
CREATE TRIGGER update_beneficiarias_updated_at
    BEFORE UPDATE ON beneficiarias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_oficinas_updated_at ON oficinas;
CREATE TRIGGER update_oficinas_updated_at
    BEFORE UPDATE ON oficinas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_participacoes_updated_at ON participacoes;
CREATE TRIGGER update_participacoes_updated_at
    BEFORE UPDATE ON participacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mensagens_updated_at ON mensagens;
CREATE TRIGGER update_mensagens_updated_at
    BEFORE UPDATE ON mensagens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
