const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '15002031'
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    // Inicia uma transação
    await client.query('BEGIN');
    
    console.log('🔄 Aplicando migration: add_audit_columns_to_beneficiarias');
    
    // Lê e executa o arquivo SQL
    const sqlFile = path.join(__dirname, '../../../migrations/004_add_audit_columns_to_beneficiarias.sql');
    const sql = await fs.readFile(sqlFile, 'utf8');
    
    await client.query(sql);
    
    // Registra a migration no controle de versão
    await client.query(`
      INSERT INTO migrations (name, applied_at)
      VALUES ($1, NOW())
      ON CONFLICT (name) DO NOTHING
    `, ['004_add_audit_columns_to_beneficiarias']);
    
    // Commit da transação
    await client.query('COMMIT');
    
    console.log('✅ Migration aplicada com sucesso!');
    
  } catch (error) {
    // Rollback em caso de erro
    await client.query('ROLLBACK');
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
    
  } finally {
    client.release();
    await pool.end();
  }
}

// Executa a migration
applyMigration().catch(console.error);
