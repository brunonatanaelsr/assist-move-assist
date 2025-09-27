import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

const createClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? [] : ['warn', 'error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    logger.debug('PrismaClient inicializado em modo de desenvolvimento');
  }

  return client;
};

export const prisma: PrismaClient = (() => {
  if (process.env.NODE_ENV === 'production') {
    return createClient();
  }

  if (!global.__prismaClient) {
    global.__prismaClient = createClient();
  }

  return global.__prismaClient;
})();

export type { PrismaClient };
