import { logger } from '../services/logger';
import { cacheService } from '../services/cache.service';

type CacheableValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

function sortValue(value: CacheableValue): CacheableValue {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item as CacheableValue));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, CacheableValue>>((acc, key) => {
        acc[key] = sortValue((value as Record<string, CacheableValue>)[key]);
        return acc;
      }, {});
  }

  return value;
}

export function generateCacheKey(prefix: string, params: Record<string, CacheableValue> = {}): string {
  const sorted = sortValue(params);
  return `${prefix}:${JSON.stringify(sorted)}`;
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    await cacheService.delete(key);
  } catch (error) {
    logger.warn('Falha ao invalidar cache', {
      key,
      error: error instanceof Error ? error.message : error
    });
  }
}

export async function withCache<T>(
  key: string,
  resolver: () => Promise<T>,
  ttl = 300
): Promise<T> {
  try {
    return await cacheService.getOrSet(key, resolver, ttl);
  } catch (error) {
    logger.warn('Falha ao utilizar getOrSet no cache', {
      key,
      error: error instanceof Error ? error.message : error
    });
  }

  return resolver();
}
