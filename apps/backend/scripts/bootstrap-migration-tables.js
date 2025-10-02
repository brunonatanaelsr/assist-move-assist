const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'assist_move_assist',
    user: process.env.POSTGRES_USER || 'assistmove',
    password: process.env.POSTGRES_PASSWORD || 'assistmove123',
    ssl: false,
  });
  await client.connect();
  try {
    // Ensure standard migrations table exists
    await client.query(`CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`);

    // Ensure legacy-compatible migration_log exists with expected columns
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_log (
        id SERIAL PRIMARY KEY
      );
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='migration_log' AND column_name='migration_name'
        ) THEN
          ALTER TABLE migration_log ADD COLUMN migration_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_migration_log_migration_name'
        ) THEN
          CREATE UNIQUE INDEX uq_migration_log_migration_name ON migration_log (migration_name);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='migration_log' AND column_name='executed_at'
        ) THEN
          ALTER TABLE migration_log ADD COLUMN executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='migration_log' AND column_name='description'
        ) THEN
          ALTER TABLE migration_log ADD COLUMN description TEXT;
        END IF;
      END $$;
    `);
    console.log('🧩 Compat migration tables ensured.');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Failed to bootstrap migration tables:', e.stack || e.message);
  process.exit(1);
});

