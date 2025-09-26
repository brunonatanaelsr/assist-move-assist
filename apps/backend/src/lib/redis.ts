import Redis from 'ioredis';
import { config } from '../config';
import { loggerService as logger } from '../services/logger';

type Primitive = string | number | null;

class InMemoryRedis {
  private kv = new Map<string, { value: string; expiresAt?: number }>();
  private lists = new Map<string, string[]>();

  private isExpired(key: string) {
    const entry = this.kv.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.kv.delete(key);
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    this.isExpired(key);
    return this.kv.get(key)?.value ?? null;
  }

  async set(key: string, value: Primitive, ...args: any[]): Promise<'OK'> {
    const str = value === null ? 'null' : String(value);
    let expiresAt: number | undefined = undefined;
    if (args && args.length >= 2) {
      const idx = args.findIndex((a: any) => String(a).toUpperCase() === 'EX');
      if (idx >= 0 && args[idx + 1]) {
        const sec = parseInt(String(args[idx + 1]), 10) || 0;
        expiresAt = Date.now() + sec * 1000;
      }
    }
    this.kv.set(key, { value: str, expiresAt });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: Primitive): Promise<'OK'> {
    const str = value === null ? 'null' : String(value);
    this.kv.set(key, { value: str, expiresAt: Date.now() + seconds * 1000 });
    return 'OK';
  }

  async del(...keys: string[] | [string[]]): Promise<number> {
    const list = Array.isArray(keys[0]) ? (keys[0] as string[]) : (keys as string[]);
    let count = 0;
    for (const k of list) {
      if (this.kv.delete(k)) count++;
      if (this.lists.delete(k)) count++;
    }
    return count;
  }

  async keys(pattern: string): Promise<string[]> {
    const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const rx = new RegExp(`^${esc}$`);
    return [
      ...Array.from(this.kv.keys()),
      ...Array.from(this.lists.keys())
    ].filter((k, i, arr) => arr.indexOf(k) === i).filter((k) => rx.test(k));
  }

  async incr(key: string): Promise<number> {
    const cur = Number((await this.get(key)) || '0');
    const next = cur + 1;
    this.kv.set(key, { value: String(next) });
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.kv.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    this.kv.set(key, entry);
    return 1;
  }

  async lpush(key: string, value: string): Promise<number> {
    const arr = this.lists.get(key) || [];
    arr.unshift(value);
    this.lists.set(key, arr);
    return arr.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const arr = this.lists.get(key) || [];
    const end = stop === -1 ? arr.length : stop + 1;
    return arr.slice(start, end);
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    const arr = this.lists.get(key) || [];
    let removed = 0;
    if (count === 0) {
      const filtered = arr.filter((v) => {
        if (v === value) { removed++; return false; }
        return true;
      });
      this.lists.set(key, filtered);
      return removed;
    }
    const newArr: string[] = [];
    for (const v of arr) {
      if (v === value && removed < Math.abs(count)) { removed++; continue; }
      newArr.push(v);
    }
    this.lists.set(key, newArr);
    return removed;
  }

  multi() {
    const self = this;
    const ops: Array<() => Promise<any>> = [];
    return {
      setex(key: string, seconds: number, value: Primitive) { ops.push(() => self.setex(key, seconds, value)); return this; },
      del(...keys: string[]) { ops.push(() => self.del(...keys)); return this; },
      lpush(key: string, value: string) { ops.push(() => self.lpush(key, value)); return this; },
      lrem(key: string, count: number, value: string) { ops.push(() => self.lrem(key, count, value)); return this; },
      async exec() { const results: any[] = []; for (const fn of ops) { results.push(await fn()); } return results; }
    } as any;
  }

  on() {
    return this;
  }
}

function createRedis(): Redis {
  if (String(process.env.REDIS_DISABLED).toLowerCase() === 'true') {
    logger.warn('REDIS_DISABLED=true — usando stub em memória');
    return new InMemoryRedis() as unknown as Redis;
  }
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: 1,
    retryStrategy: (times: number) => {
      if (times > 3) {
        logger.error('Falha ao conectar ao Redis após 3 tentativas');
        return null as any;
      }
      return Math.min(times * 100, 3000);
    }
  }) as unknown as Redis;

  (client as any).on('error', (error: Error) => {
    logger.error('Erro na conexão com Redis:', error);
  });
  (client as any).on('connect', () => {
    logger.info('Conectado ao Redis com sucesso');
  });
  return client;
}

export type RedisClient = ReturnType<typeof createRedis>;
export const redis = createRedis();
export default redis;
