const Redis = require('redis');
const { promisify } = require('util');

// Criar cliente Redis
const client = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  // Opções para melhor performance
  enable_offline_queue: false,
  retry_strategy: (options) => {
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

// Promisificar métodos do Redis
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const delAsync = promisify(client.del).bind(client);

// Duração padrão do cache em segundos
const DEFAULT_TTL = 60 * 5; // 5 minutos

/**
 * Wrapper para cachear resultados de funções
 * @param {string} key Chave do cache
 * @param {Function} fn Função que retorna a Promise com os dados
 * @param {number} ttl Tempo de vida em segundos
 */
async function withCache(key, fn, ttl = DEFAULT_TTL) {
  try {
    // Tentar obter do cache
    const cached = await getAsync(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Se não estiver em cache, executar função
    const result = await fn();
    
    // Salvar no cache
    await setAsync(key, JSON.stringify(result), 'EX', ttl);
    
    return result;
  } catch (error) {
    console.error('[Redis Cache Error]', error);
    // Em caso de erro no Redis, executar função diretamente
    return fn();
  }
}

/**
 * Invalida o cache para uma chave específica
 * @param {string} key Chave do cache para invalidar
 */
async function invalidateCache(key) {
  try {
    await delAsync(key);
  } catch (error) {
    console.error('[Redis Cache Invalidation Error]', error);
  }
}

/**
 * Gera uma chave de cache baseada nos parâmetros
 * @param {string} prefix Prefixo da chave
 * @param {Object} params Parâmetros para compor a chave
 */
function generateCacheKey(prefix, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});
  
  return `${prefix}:${JSON.stringify(sortedParams)}`;
}

module.exports = {
  withCache,
  invalidateCache,
  generateCacheKey
};
