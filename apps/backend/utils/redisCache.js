const { createClient } = require('redis');

// Tempo máximo de tentativa de reconexão: 1 hora
const MAX_RETRY_TIME = 1000 * 60 * 60;

// Criar cliente Redis
const client = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 100, 3000);
      if (retries * delay > MAX_RETRY_TIME) {
        return new Error('Retry time exhausted');
      }
      return delay;
    }
  },
  password: process.env.REDIS_PASSWORD,
  disableOfflineQueue: true
});

let connectPromise;

client.on('error', (error) => {
  console.error('[Redis Client Error]', error);
  // Permitir novas tentativas de conexão após um erro
  connectPromise = null;
});

async function ensureConnected() {
  if (client.isOpen) {
    return;
  }

  if (!connectPromise) {
    connectPromise = client.connect().catch((error) => {
      connectPromise = null;
      throw error;
    });
  }

  await connectPromise;
}

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
    await ensureConnected();

    // Tentar obter do cache
    const cached = await client.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Se não estiver em cache, executar função
    const result = await fn();

    // Salvar no cache
    await client.set(key, JSON.stringify(result), {
      EX: ttl
    });

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
    await ensureConnected();
    await client.del(key);
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
