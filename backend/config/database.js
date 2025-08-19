const { Pool } = require('pg');

if (!process.env.POSTGRES_HOST || 
    !process.env.POSTGRES_PORT || 
    !process.env.POSTGRES_DB || 
    !process.env.POSTGRES_USER || 
    !process.env.POSTGRES_PASSWORD) {
  console.error('Erro: Variáveis de ambiente do banco de dados não configuradas');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
  
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
});

// Teste de conexão na inicialização
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Erro na conexão com o banco de dados:', err);
    process.exit(1);
  } else {
    console.log('Conexão com o banco de dados estabelecida com sucesso');
  }
});

// Event listeners para o pool
pool.on('error', (err) => {
  console.error('Erro inesperado no pool do banco de dados:', err);
});

pool.on('connect', () => {
  console.log('Nova conexão estabelecida com o banco de dados');
});

module.exports = { pool };
