import { Request, Response } from 'express';
import { jest } from '@jest/globals';

type AuthRequest = Request & {
  user?: {
    id: number;
    role: string;
  };
};

type AuthMiddleware = (req: AuthRequest, res: Response, next: () => void) => void;

const authenticateTokenImpl: AuthMiddleware = (req, _res, next) => {
  req.user = { id: 123, role: 'admin' };
  next();
};

export const authenticateToken = jest.fn(authenticateTokenImpl) as jest.MockedFunction<AuthMiddleware>;
