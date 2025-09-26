import { logger } from '../services/logger';
import { cacheService } from '../services/cache.service';

export async function withCache<T>(
  key: string,
  resolver: () => Promise<T>,
  ttl = 300
): Promise<T> {
  try {
    const cached = await cacheService.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  } catch (error) {
    logger.warn('Falha ao recuperar cache', {
      key,
      error: error instanceof Error ? error.message : error
    });
  }

  const result = await resolver();

  try {
    await cacheService.set(key, result, ttl);
  } catch (error) {
    logger.warn('Falha ao definir cache', {
      key,
      error: error instanceof Error ? error.message : error
    });
  }

  return result;
}
