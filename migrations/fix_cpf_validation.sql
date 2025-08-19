-- Ajustando a validação de CPF
ALTER TABLE beneficiarias DROP CONSTRAINT IF EXISTS beneficiarias_cpf_check;
ALTER TABLE beneficiarias DROP CONSTRAINT IF EXISTS check_cpf_format;

-- Adicionando uma validação mais simples por enquanto
ALTER TABLE beneficiarias 
    ADD CONSTRAINT beneficiarias_cpf_format_check
    CHECK (cpf ~ '^[0-9]{11}$');
