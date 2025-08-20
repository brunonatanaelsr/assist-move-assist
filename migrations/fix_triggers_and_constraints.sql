-- Função para atualização de data_atualizacao
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para atualização de data_criacao
DROP FUNCTION IF EXISTS set_created_at CASCADE;
CREATE OR REPLACE FUNCTION set_created_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_criacao = CURRENT_TIMESTAMP;
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriação dos triggers para usuários
DROP TRIGGER IF EXISTS usuarios_timestamps ON usuarios;
CREATE TRIGGER usuarios_timestamps
    BEFORE INSERT ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION set_created_at();

DROP TRIGGER IF EXISTS usuarios_data_atualizacao ON usuarios;
CREATE TRIGGER usuarios_data_atualizacao
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Recriação dos triggers para beneficiárias
DROP TRIGGER IF EXISTS beneficiarias_timestamps ON beneficiarias;
CREATE TRIGGER beneficiarias_timestamps
    BEFORE INSERT ON beneficiarias
    FOR EACH ROW
    EXECUTE FUNCTION set_created_at();

DROP TRIGGER IF EXISTS beneficiarias_data_atualizacao ON beneficiarias;
CREATE TRIGGER beneficiarias_data_atualizacao
    BEFORE UPDATE ON beneficiarias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Recriação dos triggers para oficinas
DROP TRIGGER IF EXISTS oficinas_timestamps ON oficinas;
CREATE TRIGGER oficinas_timestamps
    BEFORE INSERT ON oficinas
    FOR EACH ROW
    EXECUTE FUNCTION set_created_at();

DROP TRIGGER IF EXISTS oficinas_data_atualizacao ON oficinas;
CREATE TRIGGER oficinas_data_atualizacao
    BEFORE UPDATE ON oficinas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Recriação dos triggers para participações
DROP TRIGGER IF EXISTS participacoes_timestamps ON participacoes;
CREATE TRIGGER participacoes_timestamps
    BEFORE INSERT ON participacoes
    FOR EACH ROW
    EXECUTE FUNCTION set_created_at();

DROP TRIGGER IF EXISTS participacoes_data_atualizacao ON participacoes;
CREATE TRIGGER participacoes_data_atualizacao
    BEFORE UPDATE ON participacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Recriação dos triggers para mensagens
DROP TRIGGER IF EXISTS mensagens_timestamps ON mensagens;
CREATE TRIGGER mensagens_timestamps
    BEFORE INSERT ON mensagens
    FOR EACH ROW
    EXECUTE FUNCTION set_created_at();

DROP TRIGGER IF EXISTS mensagens_data_atualizacao ON mensagens;
CREATE TRIGGER mensagens_data_atualizacao
    BEFORE UPDATE ON mensagens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Adicionando/atualizando restrições de chave estrangeira com exclusão em cascata
ALTER TABLE beneficiarias
    DROP CONSTRAINT IF EXISTS beneficiarias_deleted_by_fkey,
    ADD CONSTRAINT beneficiarias_deleted_by_fkey 
    FOREIGN KEY (deleted_by) 
    REFERENCES usuarios(id) 
    ON DELETE SET NULL;

ALTER TABLE oficinas
    DROP CONSTRAINT IF EXISTS oficinas_responsavel_id_fkey,
    ADD CONSTRAINT oficinas_responsavel_id_fkey 
    FOREIGN KEY (responsavel_id) 
    REFERENCES usuarios(id) 
    ON DELETE SET NULL;

ALTER TABLE participacoes
    DROP CONSTRAINT IF EXISTS participacoes_oficina_id_fkey,
    ADD CONSTRAINT participacoes_oficina_id_fkey 
    FOREIGN KEY (oficina_id) 
    REFERENCES oficinas(id) 
    ON DELETE CASCADE;

ALTER TABLE participacoes
    DROP CONSTRAINT IF EXISTS participacoes_beneficiaria_id_fkey,
    ADD CONSTRAINT participacoes_beneficiaria_id_fkey 
    FOREIGN KEY (beneficiaria_id) 
    REFERENCES beneficiarias(id) 
    ON DELETE CASCADE;

ALTER TABLE mensagens
    DROP CONSTRAINT IF EXISTS mensagens_remetente_id_fkey,
    ADD CONSTRAINT mensagens_remetente_id_fkey 
    FOREIGN KEY (remetente_id) 
    REFERENCES usuarios(id) 
    ON DELETE SET NULL;

ALTER TABLE mensagens
    DROP CONSTRAINT IF EXISTS mensagens_destinatario_id_fkey,
    ADD CONSTRAINT mensagens_destinatario_id_fkey 
    FOREIGN KEY (destinatario_id) 
    REFERENCES usuarios(id) 
    ON DELETE SET NULL;

-- Adicionando índices adicionais para melhorar performance
CREATE INDEX IF NOT EXISTS idx_beneficiarias_nome ON beneficiarias(nome);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_data_criacao ON beneficiarias(data_criacao);
CREATE INDEX IF NOT EXISTS idx_oficinas_nome ON oficinas(nome);
CREATE INDEX IF NOT EXISTS idx_oficinas_data_criacao ON oficinas(data_criacao);
CREATE INDEX IF NOT EXISTS idx_participacoes_data ON participacoes(data_criacao);
CREATE INDEX IF NOT EXISTS idx_mensagens_data_criacao ON mensagens(data_criacao);

-- Adicionando checks para garantir integridade dos dados
ALTER TABLE usuarios 
    ADD CONSTRAINT check_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE beneficiarias 
    ADD CONSTRAINT check_cpf_format 
    CHECK (cpf ~ '^\d{11}$');

ALTER TABLE oficinas 
    ADD CONSTRAINT check_datas_oficina 
    CHECK (data_inicio <= data_fim);

-- Atualizando as datas de todos os registros existentes para garantir consistência
UPDATE usuarios SET data_atualizacao = CURRENT_TIMESTAMP WHERE data_atualizacao IS NULL;
UPDATE beneficiarias SET data_atualizacao = CURRENT_TIMESTAMP WHERE data_atualizacao IS NULL;
UPDATE oficinas SET data_atualizacao = CURRENT_TIMESTAMP WHERE data_atualizacao IS NULL;
UPDATE participacoes SET data_atualizacao = CURRENT_TIMESTAMP WHERE data_atualizacao IS NULL;
UPDATE mensagens SET data_atualizacao = CURRENT_TIMESTAMP WHERE data_atualizacao IS NULL;
