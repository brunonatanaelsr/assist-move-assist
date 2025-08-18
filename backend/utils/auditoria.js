const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias_user',
  password: process.env.POSTGRES_PASSWORD || 'movemarias_password_2025',
});

/**
 * Registra um evento de auditoria no sistema
 * @param {string} tipo - O tipo do evento (CRIACAO, ATUALIZACAO, EXCLUSAO, etc)
 * @param {string} descricao - Descrição detalhada do evento
 * @param {string} usuario_id - ID do usuário que realizou a ação
 * @param {string} entidade - Nome da entidade afetada (tabela)
 * @param {object} dados - Dados relevantes do evento
 * @param {string} ip - Endereço IP do usuário
 */
async function registrarEvento(tipo, descricao, usuario_id, entidade, dados, ip) {
  try {
    await pool.query(
      `INSERT INTO eventos_auditoria (
        tipo, 
        descricao, 
        usuario_id, 
        entidade, 
        dados, 
        ip_address, 
        data_registro
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [tipo, descricao, usuario_id, entidade, JSON.stringify(dados), ip]
    );
  } catch (error) {
    console.error('Erro ao registrar evento de auditoria:', error);
    // Não lançamos o erro para não afetar a operação principal
  }
}

module.exports = {
  registrarEvento
};
