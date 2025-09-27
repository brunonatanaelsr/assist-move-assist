import type { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';

import {
  apiLimiter,
  corsOptions,
  generalLimiter,
  helmetConfig,
  sanitizeInput,
  validateContentType,
  validateOrigin
} from '../config/security';
import { env } from '../config/env';
import { logger } from '../services/logger';

/**
 * Register security middlewares for the Express application.
 */
export function applySecurity(app: Express): void {
  app.use(helmet(helmetConfig));
  app.use(cors(corsOptions));
  app.use(hpp());

  app.use(sanitizeInput);
  app.use(validateOrigin);
  app.use(validateContentType);

  if (!env.RATE_LIMIT_DISABLE) {
    app.use('/api/', generalLimiter);
    app.use('/api/v1/', apiLimiter);
  } else {
    logger.info('Rate limiting desativado via RATE_LIMIT_DISABLE');
  }
}

export default applySecurity;
