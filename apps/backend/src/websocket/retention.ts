import { config } from '../config';
import { redis } from '../lib/redis';

interface RetentionConfig {
  ttlSeconds?: number;
  maxItems?: number;
}

export async function applyUnreadRetention(
  key: string,
  retention: RetentionConfig = config.redis.unreadRetention
) {
  const operations: Array<Promise<unknown>> = [];

  if (retention.maxItems && retention.maxItems > 0) {
    operations.push((redis as any).ltrim(key, 0, retention.maxItems - 1));
  }

  if (retention.ttlSeconds && retention.ttlSeconds > 0) {
    operations.push(redis.expire(key, retention.ttlSeconds));
  }

  if (operations.length > 0) {
    await Promise.all(operations);
  }
}
