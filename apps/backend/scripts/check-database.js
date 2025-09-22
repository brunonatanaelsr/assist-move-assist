const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '15002031'
});

async function checkDatabase() {
  try {
    // Teste de conexão
    console.log('🔍 Verificando conexão com o banco...');
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão estabelecida');

    // Verifica tabelas
    console.log('\n🔍 Verificando tabelas principais...');
    const tables = ['usuarios', 'beneficiarias', 'oficinas', 'participacoes', 'mensagens'];
    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = $1
        )`,
        [table]
      );
      console.log(`${result.rows[0].exists ? '✅' : '❌'} Tabela ${table}`);
    }

    // Verifica índices
    console.log('\n🔍 Verificando índices...');
    const indices = [
      'idx_usuarios_email',
      'idx_beneficiarias_cpf',
      'idx_oficinas_data',
      'idx_participacoes_oficina',
      'idx_participacoes_beneficiaria'
    ];
    for (const index of indices) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = $1
        )`,
        [index]
      );
      console.log(`${result.rows[0].exists ? '✅' : '❌'} Índice ${index}`);
    }

    // Verifica triggers
    console.log('\n🔍 Verificando triggers...');
    const triggers = [
      'usuarios_data_atualizacao',
      'beneficiarias_data_atualizacao',
      'oficinas_data_atualizacao',
      'participacoes_data_atualizacao',
      'mensagens_data_atualizacao'
    ];
    for (const trigger of triggers) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM pg_trigger 
          WHERE tgname = $1
        )`,
        [trigger]
      );
      console.log(`${result.rows[0].exists ? '✅' : '❌'} Trigger ${trigger}`);
    }

    // Estatísticas básicas
    console.log('\n📊 Estatísticas do banco:');
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios WHERE ativo = true) as usuarios_ativos,
        (SELECT COUNT(*) FROM beneficiarias WHERE ativo = true) as beneficiarias_ativas,
        (SELECT COUNT(*) FROM oficinas WHERE ativo = true) as oficinas_ativas,
        (SELECT COUNT(*) FROM participacoes WHERE ativo = true) as participacoes_ativas,
        (SELECT COUNT(*) FROM mensagens WHERE ativo = true) as mensagens_ativas
    `);
    
    console.table(stats.rows[0]);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkDatabase().catch(console.error);
