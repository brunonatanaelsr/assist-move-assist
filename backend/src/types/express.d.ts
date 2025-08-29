import 'express';
import { PERMISSIONS } from './permissions';

declare global {
  namespace Express {
    interface UserInfo {
      id: number | string;
      email?: string;
      role?: string;
      permissions?: PERMISSIONS[];
      nome?: string;
      avatar_url?: string;
    }

    interface Request {
      user?: UserInfo;
    }
  }
}

export {};
