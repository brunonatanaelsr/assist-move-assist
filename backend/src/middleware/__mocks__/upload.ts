import { Request, Response } from 'express';
import { jest } from '@jest/globals';

type UploadMiddleware = (req: Request, res: Response, next: () => void) => void;

export const uploadMiddleware = jest.fn<UploadMiddleware>().mockImplementation(
  (req: Request, res: Response, next: () => void) => {
    next();
  }
);
