import { Request, Response } from 'express';
import { jest } from '@jest/globals';

type AuthRequest = Request & {
  user?: {
    id: number;
    role: string;
  };
};

type AuthMiddleware = (req: AuthRequest, res: Response, next: () => void) => void;

export const authenticateToken = jest.fn<AuthMiddleware>().mockImplementation(
  (req: AuthRequest, res: Response, next: () => void) => {
    req.user = { id: 123, role: 'admin' };
    next();
  }
);
