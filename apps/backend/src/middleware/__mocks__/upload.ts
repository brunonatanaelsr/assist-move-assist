import { Request, Response } from 'express';
import { jest } from '@jest/globals';

type UploadMiddleware = (req: Request, res: Response, next: () => void) => void;

const uploadMiddlewareImpl: UploadMiddleware = (_req, _res, next) => {
  next();
};

export const uploadMiddleware = jest.fn(uploadMiddlewareImpl) as jest.MockedFunction<UploadMiddleware>;
