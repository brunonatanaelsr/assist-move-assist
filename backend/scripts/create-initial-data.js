const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Carrega variáveis do backend/.env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Configuração do banco
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

async function createInitialUsers() {
  try {
    console.log('🔐 Criando usuários iniciais...');

    // Dados via ENV (com defaults)
    const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || 'Super Administrador';
    const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@example.com';
    const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'ChangeMe!123';
    const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrador';
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe!123';
    const E2E_NAME = process.env.E2E_TEST_NAME || 'E2E User';
    const E2E_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e@assist.local';
    const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD || 'e2e_password';
    const E2E_ROLE = process.env.E2E_TEST_ROLE || 'admin';

    // Hash das senhas
    const brunoPasswordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
    const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const e2ePasswordHash = await bcrypt.hash(E2E_PASSWORD, 12);

    // Criar superadmin
    const upsertUser = `
      INSERT INTO usuarios (nome, email, senha_hash, papel, ativo, data_criacao, data_atualizacao)
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        senha_hash = EXCLUDED.senha_hash,
        papel = EXCLUDED.papel,
        ativo = TRUE,
        data_atualizacao = NOW()
      RETURNING id, nome, email, papel;
    `;

    const superadminResult = await pool.query(upsertUser, [
      SUPERADMIN_NAME,
      SUPERADMIN_EMAIL,
      brunoPasswordHash,
      'superadmin'
    ]);

    console.log('✅ Superadmin criado:', superadminResult.rows[0]);

    // Criar admin
    const adminResult = await pool.query(upsertUser, [
      ADMIN_NAME,
      ADMIN_EMAIL,
      adminPasswordHash,
      'admin'
    ]);

    console.log('✅ Admin criado:', adminResult.rows[0]);

    const e2eResult = await pool.query(upsertUser, [
      E2E_NAME,
      E2E_EMAIL,
      e2ePasswordHash,
      E2E_ROLE
    ]);

    console.log('✅ Usuário E2E criado:', {
      id: e2eResult.rows[0]?.id,
      nome: e2eResult.rows[0]?.nome,
      email: E2E_EMAIL,
      papel: E2E_ROLE
    });

    // Verificar se beneficiárias já existem
    await pool.query(`
      INSERT INTO beneficiarias (nome_completo, cpf, data_nascimento, telefone, endereco, status)
      VALUES 
        ('Maria Silva Santos', '123.456.789-00', '1990-01-01', '(11) 99999-1111', 'Rua das Flores, 123 - São Paulo, SP', 'ATIVO'),
        ('Ana Paula Oliveira', '987.654.321-00', '1991-02-02', '(11) 99999-2222', 'Av. Principal, 456 - São Paulo, SP', 'ATIVO'),
        ('Joana Ferreira Lima', '456.789.123-00', '1992-03-03', '(11) 99999-3333', 'Rua da Esperança, 789 - São Paulo, SP', 'ATIVO')
      ON CONFLICT (cpf) DO NOTHING;
    `);

    // Verificar estatísticas finais
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios WHERE ativo = true) as usuarios,
        (SELECT COUNT(*) FROM beneficiarias WHERE deleted_at IS NULL) as beneficiarias
    `);

    console.log('📊 Estatísticas finais:');
    console.log(`   👥 Usuários: ${stats.rows[0].usuarios}`);
    console.log(`   👩 Beneficiárias: ${stats.rows[0].beneficiarias}`);

  } catch (error) {
    console.error('❌ Erro ao criar dados iniciais:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createInitialUsers()
    .then(() => {
      console.log('✅ Dados iniciais criados com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha ao criar dados iniciais:', error);
      process.exit(1);
    });
}

module.exports = { createInitialUsers };
