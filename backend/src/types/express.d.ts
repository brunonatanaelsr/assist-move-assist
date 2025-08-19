import { Request, Response, NextFunction } from 'express';
import { PERMISSIONS } from './permissions';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions?: PERMISSIONS[];
  };
}
