import express from 'express';
import type { Express } from 'express';

import {
  applySecurityMiddleware,
  createSecurityMiddleware
} from '../../middleware/security.middleware';

const createTestApp = (): Express => express();

describe('security middleware', () => {
  it('can be imported and applied without throwing errors', () => {
    const app = createTestApp();

    expect(() =>
      applySecurityMiddleware(app, {
        env: {
          NODE_ENV: 'test',
          RATE_LIMIT_DISABLE: true,
          CORS_ORIGIN: 'http://localhost:3000'
        }
      })
    ).not.toThrow();
  });

  it('exposes the composed middleware bundle', () => {
    const bundle = createSecurityMiddleware({
      env: {
        NODE_ENV: 'test',
        RATE_LIMIT_DISABLE: true,
        CORS_ORIGIN: 'http://localhost:3000'
      }
    });

    expect(bundle.globalMiddlewares.length).toBeGreaterThan(0);
    expect(typeof bundle.rateLimitPath).toBe('string');
  });
});
