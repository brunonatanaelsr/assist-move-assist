const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'movemarias',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: false,
  });
  const email = process.env.SUPERADMIN_EMAIL || process.env.SUPER_EMAIL || 'bruno@move.com';
  const password = process.env.SUPERADMIN_PASSWORD || process.env.SUPER_PASS || '15002031';
  const name = process.env.SUPERADMIN_NAME || 'Super Administrador';
  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel, ativo, data_criacao, data_atualizacao)
       VALUES ($1,$2,$3,'superadmin', true, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET 
         senha_hash = EXCLUDED.senha_hash,
         papel = 'superadmin',
         ativo = TRUE,
         data_atualizacao = NOW()
      `,
      [name, email.toLowerCase(), hash]
    );
    await client.query('COMMIT');
    console.log(`✅ Superadmin garantido: ${email}`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Falha ao garantir superadmin:', e.message || e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

