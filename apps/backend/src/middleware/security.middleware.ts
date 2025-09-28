import type { Express, RequestHandler } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

const xssClean: () => RequestHandler = require('xss-clean');

export const mongoSanitizeMiddleware: RequestHandler = mongoSanitize();
export const xssCleanMiddleware: RequestHandler = xssClean();
export const hppMiddleware: RequestHandler = hpp();

export const securityMiddlewares: RequestHandler[] = [
  mongoSanitizeMiddleware,
  xssCleanMiddleware,
  hppMiddleware,
];

export const applySecurityMiddlewares = (app: Express): Express => {
  securityMiddlewares.forEach((middleware) => {
    app.use(middleware);
  });

  return app;
};

export default securityMiddlewares;
