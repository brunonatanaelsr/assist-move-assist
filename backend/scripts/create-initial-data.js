const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias_user',
  password: process.env.POSTGRES_PASSWORD || 'movemarias_password_2025',
});

async function createInitialUsers() {
  try {
    console.log('🔐 Criando usuários iniciais...');

    // Hash das senhas
    const brunoPasswordHash = await bcrypt.hash('15002031', 12);
    const adminPasswordHash = await bcrypt.hash('movemarias123', 12);

    // Criar superadmin
    const superadminQuery = `
      INSERT INTO usuarios (nome, email, senha_hash, papel) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) 
      DO UPDATE SET 
        senha_hash = $3,
        papel = $4,
        ativo = true,
        data_atualizacao = NOW()
      RETURNING id, nome, email, papel;
    `;

    const superadminResult = await pool.query(superadminQuery, [
      'Bruno Superadmin',
      'bruno@move.com',
      brunoPasswordHash,
      'superadmin'
    ]);

    console.log('✅ Superadmin criado:', superadminResult.rows[0]);

    // Criar admin
    const adminResult = await pool.query(superadminQuery, [
      'Admin Move Marias',
      'admin@movemarias.com',
      adminPasswordHash,
      'admin'
    ]);

    console.log('✅ Admin criado:', adminResult.rows[0]);

    // Verificar se beneficiárias já existem
    const beneficiariasCheck = await pool.query('SELECT COUNT(*) FROM beneficiarias');
    const beneficiariasCount = parseInt(beneficiariasCheck.rows[0].count);

    if (beneficiariasCount === 0) {
      console.log('📝 Criando beneficiárias de exemplo...');

      const beneficiariasQuery = `
        INSERT INTO beneficiarias (nome_completo, cpf, contato1, endereco, programa_servico) 
        VALUES 
        ('Maria Silva Santos', '123.456.789-00', '(11) 99999-1111', 'Rua das Flores, 123 - São Paulo, SP', 'Capacitação Profissional'),
        ('Ana Paula Oliveira', '987.654.321-00', '(11) 99999-2222', 'Av. Principal, 456 - São Paulo, SP', 'Apoio Psicológico'),
        ('Joana Ferreira Lima', '456.789.123-00', '(11) 99999-3333', 'Rua da Esperança, 789 - São Paulo, SP', 'Oficinas Culturais')
        ON CONFLICT (cpf) DO NOTHING
        RETURNING id, nome_completo;
      `;

      const beneficiariasResult = await pool.query(beneficiariasQuery);
      console.log('✅ Beneficiárias criadas:', beneficiariasResult.rows.length);
    }

    // Verificar estatísticas finais
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios WHERE ativo = true) as usuarios,
        (SELECT COUNT(*) FROM beneficiarias WHERE ativo = true) as beneficiarias
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
