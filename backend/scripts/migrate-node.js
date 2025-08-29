// Simple Node-based migration runner (fallback when psql is unavailable)
// Reads SQL files from src/database/migrations and applies them in order

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'src', 'database', 'migrations');

async function run() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'movemarias',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: false,
  });

  const client = await pool.connect();
  try {
    console.log('🔌 Conectado ao PostgreSQL');

    await client.query(`CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query('SELECT 1 FROM migrations WHERE name = $1', [file]);
      if (rows.length) {
        console.log(`✅ Migração já aplicada: ${file}`);
        continue;
      }

      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      console.log(`⏳ Aplicando: ${file}`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`🎉 Concluída: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Erro na migração ${file}:`, err.message);
        throw err;
      }
    }

    console.log('✅ Todas as migrações estão aplicadas');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Falha ao executar migrações via Node:', err.message);
  process.exit(1);
});

