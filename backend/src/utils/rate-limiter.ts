import { redis } from '../lib/redis';
import { logger } from '../services/logger';
// Interface mínima para o cliente Redis que usamos (evita conflito de tipos)
type RedisLike = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
};

export interface RateLimiterOptions {
  points: number;
  duration: number; // segundos
  keyPrefix?: string;
  redisClient?: RedisLike;
}

export class RateLimiter {
  private readonly redisClient: RedisLike;
  private readonly prefix: string;
  private readonly points: number;
  private readonly duration: number;

  constructor(options: RateLimiterOptions) {
    this.redisClient = options.redisClient ?? (redis as unknown as RedisLike);
    this.prefix = options.keyPrefix ?? 'rate_limiter:';
    this.points = options.points;
    this.duration = options.duration;
  }

  private getKey(identifier: string): string {
    return `${this.prefix}${identifier}`;
  }

  async consume(identifier: string): Promise<boolean> {
    const key = this.getKey(identifier);

    try {
      const total = await this.redisClient.incr(key);

      if (total === 1) {
        await this.redisClient.expire(key, this.duration);
      }

      if (total > this.points) {
        return false;
      }

      return true;
    } catch (error: any) {
      logger.error('Erro no rate limiter', {
        identifier,
        error: error?.message || error
      });
      // Em caso de falha no Redis, permitir envio para não bloquear funcionalidade crítica
      return true;
    }
  }

  async getRemaining(identifier: string): Promise<number> {
    try {
      const key = this.getKey(identifier);
      const current = await this.redisClient.get(key);
      const used = current ? Number(current) : 0;
      return Math.max(this.points - used, 0);
    } catch (error: any) {
      logger.error('Erro ao recuperar limite restante', {
        identifier,
        error: error?.message || error
      });
      return this.points;
    }
  }

  async reset(identifier: string): Promise<void> {
    try {
      await this.redisClient.del(this.getKey(identifier));
    } catch (error: any) {
      logger.error('Erro ao resetar limite', {
        identifier,
        error: error?.message || error
      });
    }
  }
}
