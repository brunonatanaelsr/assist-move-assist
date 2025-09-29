import Redis from 'ioredis';
import { config } from '../config';
import { loggerService as logger } from '../services/logger';

type Primitive = string | number | null;

class InMemoryRedis {
  private kv = new Map<string, { value: string; expiresAt?: number }>();
  private lists = new Map<string, { values: string[]; expiresAt?: number }>();
  private hashes = new Map<string, { values: Map<string, string>; expiresAt?: number }>();

  private isExpired(key: string) {
    const entry = this.kv.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.kv.delete(key);
      return true;
    }
    return false;
  }

  private isListExpired(key: string) {
    const entry = this.lists.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.lists.delete(key);
      return true;
    }
    return false;
  }

  private isHashExpired(key: string) {
    const entry = this.hashes.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.hashes.delete(key);
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

  async ttl(key: string): Promise<number> {
    if (this.isExpired(key) || this.isListExpired(key) || this.isHashExpired(key)) {
      return -2;
    }
    const entry = this.kv.get(key);
    if (entry) {
      if (!entry.expiresAt) {
        return -1;
      }
      const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
      return remaining <= 0 ? -2 : remaining;
    }
    const listEntry = this.lists.get(key);
    if (listEntry) {
      if (!listEntry.expiresAt) {
        return -1;
      }
      const remaining = Math.ceil((listEntry.expiresAt - Date.now()) / 1000);
      return remaining <= 0 ? -2 : remaining;
    }
    const hashEntry = this.hashes.get(key);
    if (hashEntry) {
      if (!hashEntry.expiresAt) {
        return -1;
      }
      const remaining = Math.ceil((hashEntry.expiresAt - Date.now()) / 1000);
      return remaining <= 0 ? -2 : remaining;
    }
    return -2;
  }

  async del(...keys: string[] | [string[]]): Promise<number> {
    const list = Array.isArray(keys[0]) ? (keys[0] as string[]) : (keys as string[]);
    let count = 0;
    for (const k of list) {
      if (this.kv.delete(k)) count++;
      if (this.lists.delete(k)) count++;
      if (this.hashes.delete(k)) count++;
    }
    return count;
  }

  async keys(pattern: string): Promise<string[]> {
    const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const rx = new RegExp(`^${esc}$`);
    return [
      ...Array.from(this.kv.keys()),
      ...Array.from(this.lists.keys()),
      ...Array.from(this.hashes.keys())
    ]
      .filter((k, i, arr) => arr.indexOf(k) === i)
      .filter((k) => !this.isExpired(k) && !this.isListExpired(k) && !this.isHashExpired(k))
      .filter((k) => rx.test(k));
  }

  async scan(cursor: number, pattern = '*', count = 10): Promise<[number, string[]]> {
    const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const rx = new RegExp(`^${esc}$`);
    const uniqueKeys = [
      ...Array.from(this.kv.keys()),
      ...Array.from(this.lists.keys()),
      ...Array.from(this.hashes.keys())
    ].filter((k, idx, arr) => arr.indexOf(k) === idx);

    const filtered = uniqueKeys.filter((key) => {
      if (this.isExpired(key) || this.isListExpired(key) || this.isHashExpired(key)) {
        return false;
      }
      return rx.test(key);
    });

    const start = Math.min(cursor, filtered.length);
    const end = Math.min(start + count, filtered.length);
    const nextCursor = end >= filtered.length ? 0 : end;
    return [nextCursor, filtered.slice(start, end)];
  }

  async incr(key: string): Promise<number> {
    const cur = Number((await this.get(key)) || '0');
    const next = cur + 1;
    this.kv.set(key, { value: String(next) });
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const ttl = seconds * 1000;
    const now = Date.now();
    const kvEntry = this.kv.get(key);
    if (kvEntry) {
      kvEntry.expiresAt = now + ttl;
      this.kv.set(key, kvEntry);
      return 1;
    }
    const listEntry = this.lists.get(key);
    if (listEntry) {
      listEntry.expiresAt = now + ttl;
      this.lists.set(key, listEntry);
      return 1;
    }
    const hashEntry = this.hashes.get(key);
    if (hashEntry) {
      hashEntry.expiresAt = now + ttl;
      this.hashes.set(key, hashEntry);
      return 1;
    }
    return 0;
  }

  async lpush(key: string, value: string): Promise<number> {
    const entry = this.lists.get(key);
    if (!entry || this.isListExpired(key)) {
      const values = [value];
      this.lists.set(key, { values });
      return values.length;
    }
    entry.values.unshift(value);
    this.lists.set(key, entry);
    return entry.values.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const entry = this.lists.get(key);
    if (!entry || this.isListExpired(key)) {
      return [];
    }
    const arr = entry.values;
    const end = stop === -1 ? arr.length : stop + 1;
    return arr.slice(start, end);
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    const entry = this.lists.get(key);
    if (!entry || this.isListExpired(key)) {
      return 0;
    }
    const arr = entry.values;
    let removed = 0;
    if (count === 0) {
      const filtered = arr.filter((v) => {
        if (v === value) { removed++; return false; }
        return true;
      });
      entry.values = filtered;
      this.lists.set(key, entry);
      return removed;
    }
    const newArr: string[] = [];
    for (const v of arr) {
      if (v === value && removed < Math.abs(count)) { removed++; continue; }
      newArr.push(v);
    }
    entry.values = newArr;
    this.lists.set(key, entry);
    return removed;
  }

  async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
    const entry = this.lists.get(key);
    if (!entry || this.isListExpired(key)) {
      return 'OK';
    }
    const arr = entry.values;
    const end = stop === -1 ? arr.length : stop + 1;
    entry.values = arr.slice(start, end);
    this.lists.set(key, entry);
    return 'OK';
  }

  async hset(key: string, field: string, value: Primitive): Promise<number> {
    const str = value === null ? 'null' : String(value);
    let entry = this.hashes.get(key);
    if (!entry || this.isHashExpired(key)) {
      entry = { values: new Map() };
      this.hashes.set(key, entry);
    }
    const existed = entry.values.has(field);
    entry.values.set(field, str);
    this.hashes.set(key, entry);
    return existed ? 0 : 1;
  }

  multi() {
    const self = this;
    const ops: Array<() => Promise<any>> = [];
    return {
      setex(key: string, seconds: number, value: Primitive) { ops.push(() => self.setex(key, seconds, value)); return this; },
      del(...keys: string[]) { ops.push(() => self.del(...keys)); return this; },
      lpush(key: string, value: string) { ops.push(() => self.lpush(key, value)); return this; },
      ltrim(key: string, start: number, stop: number) { ops.push(() => self.ltrim(key, start, stop)); return this; },
      lrem(key: string, count: number, value: string) { ops.push(() => self.lrem(key, count, value)); return this; },
      hset(key: string, field: string, value: Primitive) { ops.push(() => self.hset(key, field, value)); return this; },
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
