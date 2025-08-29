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

    // Hash das senhas
    const brunoPasswordHash = await bcrypt.hash('15002031', 12);
    const adminPasswordHash = await bcrypt.hash('movemarias123', 12);

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
      'Bruno Superadmin',
      'bruno@move.com',
      brunoPasswordHash,
      'superadmin'
    ]);

    console.log('✅ Superadmin criado:', superadminResult.rows[0]);

    // Criar admin
    const adminResult = await pool.query(upsertUser, [
      'Admin Move Marias',
      'admin@movemarias.com',
      adminPasswordHash,
      'admin'
    ]);

    console.log('✅ Admin criado:', adminResult.rows[0]);

    // Verificar se beneficiárias já existem
    await pool.query(`
      INSERT INTO beneficiarias (nome_completo, cpf, data_nascimento, telefone, endereco, status)
      VALUES 
        ('Maria Silva Santos', '123.456.789-00', '1990-01-01', '(11) 99999-1111', 'Rua das Flores, 123 - São Paulo, SP', 'ativa'),
        ('Ana Paula Oliveira', '987.654.321-00', '1991-02-02', '(11) 99999-2222', 'Av. Principal, 456 - São Paulo, SP', 'ativa'),
        ('Joana Ferreira Lima', '456.789.123-00', '1992-03-03', '(11) 99999-3333', 'Rua da Esperança, 789 - São Paulo, SP', 'ativa')
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
