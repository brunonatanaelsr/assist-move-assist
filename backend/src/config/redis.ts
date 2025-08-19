import IORedis from 'ioredis';
import config from './config';

const redis = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  username: config.redis.username,
  db: config.redis.database,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    return Math.min(times * 50, 2000);
  },
});

redis.addListener('error', (err: Error) => {
  console.error('Redis connection error:', err);
});

redis.addListener('connect', () => {
  console.log('Redis connection established');
});

export default redis;
