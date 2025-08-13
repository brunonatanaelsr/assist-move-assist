import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../services/logger';

dotenv.config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  
  // Configurações do pool
  max: 20, // máximo de conexões no pool
  min: 2, // mínimo de conexões sempre ativas
  idleTimeoutMillis: 30000, // tempo máximo que uma conexão pode ficar inativa
  connectionTimeoutMillis: 5000, // tempo máximo para estabelecer conexão
  
  // Configurações SSL para produção
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
  
  // Configurações de retry
  statement_timeout: 30000, // timeout para queries (30 segundos)
  query_timeout: 30000,
  
  // Configurações de keepalive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Evento para monitorar conexões
pool.on('connect', () => {
  logger.info('Nova conexão PostgreSQL estabelecida');
});

pool.on('error', (err) => {
  logger.error('Erro inesperado no pool PostgreSQL:', err);
});

pool.on('remove', () => {
  logger.info('Conexão PostgreSQL removida do pool');
});

// Teste de conexão ao iniciar
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW(), version()');
    client.release();
    logger.info('✅ Conexão PostgreSQL estabelecida com sucesso');
    logger.info('📅 Hora do servidor:', result.rows[0].now);
    logger.info('🗄️ Versão PostgreSQL:', result.rows[0].version.split(' ')[0]);
  } catch (err) {
    logger.error('❌ Erro ao conectar ao PostgreSQL:', err);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

// Health check para monitoramento
export const checkDbConnection = async () => {
  try {
    const client = await pool.connect();
    const startTime = Date.now();
    const result = await client.query('SELECT NOW()');
    const responseTime = Date.now() - startTime;
    client.release();
    
    return { 
      success: true, 
      time: result.rows[0].now,
      responseTime: `${responseTime}ms`,
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingCount: pool.waitingCount
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error?.message || 'Erro desconhecido',
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingCount: pool.waitingCount
    };
  }
};

// Função para executar queries com retry automático
export const executeQuery = async (text: string, params?: any[]) => {
  let retries = 3;
  
  while (retries > 0) {
    try {
      const client = await pool.connect();
      const result = await client.query(text, params);
      client.release();
      return result;
    } catch (error: any) {
      retries--;
      logger.error(`Erro na query (tentativas restantes: ${retries}):`, error);
      
      if (retries === 0) {
        throw error;
      }
      
      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Fallback - nunca deve chegar aqui
  throw new Error('Falha ao executar query após múltiplas tentativas');
};

// Wrapper para compatibilidade com código existente
export const db = {
  query: async (text: string, params?: any[]) => {
    const result = await executeQuery(text, params);
    return result?.rows || [];
  },
  pool
};

// Inicializar ao importar o módulo
if (process.env.NODE_ENV !== 'test') {
  initializeDatabase();
}

export default pool;
