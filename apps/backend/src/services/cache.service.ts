import redisSingleton from '../lib/redis';
import { loggerService } from '../services/logger';

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

class CacheService {
  private redis: any;
  private defaultTTL: number = 300; // 5 minutos

  constructor(config: CacheConfig) {
    this.redis = redisSingleton as any;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      // Log no nível warn para falhas de leitura de cache, evitando ruído excessivo
      loggerService.warn(`Cache read failed`, { key, error: (error as any)?.message });
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.redis.set(
        key,
        JSON.stringify(value),
        'EX',
        ttl
      );
    } catch (error) {
      loggerService.error(`Erro ao definir cache para chave ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      loggerService.error(`Erro ao deletar cache para chave ${key}:`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      // Use SCAN to avoid blocking Redis; fallback to KEYS if SCAN unavailable (e.g., stub)
      if (typeof this.redis.scan === 'function') {
        let cursor = '0';
        const batch: string[] = [];
        const matchPattern = pattern;
        do {
          const res = await this.redis.scan(cursor, 'MATCH', matchPattern, 'COUNT', 100);
          cursor = res[0];
          const found: string[] = res[1] || [];
          batch.push(...found);
          if (batch.length >= 500) {
            await this.redis.del(...batch.splice(0, batch.length));
          }
        } while (cursor !== '0');
        if (batch.length > 0) {
          await this.redis.del(...batch);
        }
      } else {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      loggerService.error(`Erro ao deletar cache com padrão ${pattern}:`, error);
    }
  }

  async increment(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      loggerService.error(`Erro ao incrementar chave ${key}:`, error);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(key, seconds);
    } catch (error) {
      loggerService.error(`Erro ao definir expiração para chave ${key}:`, error);
    }
  }

  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      const fresh = await callback();
      await this.set(key, fresh, ttl);
      return fresh;
    } catch (error) {
      loggerService.error(`Erro em getOrSet para chave ${key}:`, error);
      throw error;
    }
  }

  async invalidateRelated(keys: string[]): Promise<void> {
    try {
      for (const key of keys) {
        await this.deletePattern(`*${key}*`);
      }
    } catch (error) {
      loggerService.error('Erro ao invalidar cache relacionado:', error);
    }
  }

  // Método para limpar cache em lote baseado em eventos
  async handleEvent(event: string, payload: any): Promise<void> {
    const patterns: { [key: string]: string[] } = {
      'beneficiaria:created': ['beneficiarias', 'dashboard', 'stats'],
      'beneficiaria:updated': [`beneficiaria:${payload.id}`, 'dashboard'],
      'oficina:created': ['oficinas', 'dashboard'],
      'atendimento:created': ['atendimentos', 'dashboard'],
      'user:updated': [`user:${payload.id}`, 'permissions']
    };

    const patternsToInvalidate = patterns[event];
    if (patternsToInvalidate) {
      await this.invalidateRelated(patternsToInvalidate);
    }
  }
}

// Configuração baseada no ambiente
const config: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  keyPrefix: process.env.REDIS_PREFIX || 'assist-move:',
  db: Number(process.env.REDIS_DB) || 0
};

export const cacheService = new CacheService(config);
