import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  retryStrategy: (times: number) => {
    if (times > 3) {
      logger.error('Falha ao conectar ao Redis após 3 tentativas');
      return null;
    }
    return Math.min(times * 100, 3000);
  }
});

(redis as any).on('error', (error: Error) => {
  logger.error('Erro na conexão com Redis:', error);
});

(redis as any).on('connect', () => {
  logger.info('Conectado ao Redis com sucesso');
});

export default redis;
