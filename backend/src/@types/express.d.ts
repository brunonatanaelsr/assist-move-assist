import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

declare global {
  namespace Express {
    interface Request extends ExpressRequest {
      body: any;
      user?: {
        id: number;
        email: string;
        role: 'admin' | 'user';
      };
    }

    interface Response extends ExpressResponse {
      json(obj: any): this;
    }
  }
}
