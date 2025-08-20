const Redis = require('ioredis');
const { promisify } = require('util');

class CacheService {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.redis.on('error', (err) => {
      console.error('Erro no Redis:', err);
    });

    this.redis.on('connect', () => {
      console.log('Conectado ao Redis');
    });

    // Tempos padrão de cache
    this.DEFAULT_TTL = 3600; // 1 hora
    this.DASHBOARD_TTL = 300; // 5 minutos
    this.USER_TTL = 1800; // 30 minutos
  }

  /**
   * Obtém um valor do cache
   * @param {string} key - Chave do cache
   * @returns {Promise<any>} Valor armazenado ou null
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Erro ao obter cache para ${key}:`, error);
      return null;
    }
  }

  /**
   * Armazena um valor no cache
   * @param {string} key - Chave do cache
   * @param {any} value - Valor a ser armazenado
   * @param {number} ttl - Tempo de vida em segundos
   */
  async set(key, value, ttl = this.DEFAULT_TTL) {
    try {
      const stringValue = JSON.stringify(value);
      await this.redis.setex(key, ttl, stringValue);
    } catch (error) {
      console.error(`Erro ao definir cache para ${key}:`, error);
    }
  }

  /**
   * Remove um valor do cache
   * @param {string} key - Chave do cache
   */
  async del(key) {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Erro ao deletar cache para ${key}:`, error);
    }
  }

  /**
   * Remove múltiplos valores do cache por padrão
   * @param {string} pattern - Padrão de chaves para remover
   */
  async delPattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(`Erro ao deletar cache com padrão ${pattern}:`, error);
    }
  }

  /**
   * Obtém um valor do cache ou executa uma função para obtê-lo
   * @param {string} key - Chave do cache
   * @param {Function} fn - Função para obter o valor se não estiver em cache
   * @param {number} ttl - Tempo de vida em segundos
   */
  async getOrSet(key, fn, ttl = this.DEFAULT_TTL) {
    try {
      const cached = await this.get(key);
      if (cached) {
        return cached;
      }

      const value = await fn();
      await this.set(key, value, ttl);
      return value;
    } catch (error) {
      console.error(`Erro em getOrSet para ${key}:`, error);
      throw error;
    }
  }

  /**
   * Limpa todo o cache
   */
  async flush() {
    try {
      await this.redis.flushall();
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  /**
   * Fecha a conexão com o Redis
   */
  async close() {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Erro ao fechar conexão Redis:', error);
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
