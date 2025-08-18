import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

declare global {
  namespace Express {
    export interface Request extends ExpressRequest {
      method: string;
      originalUrl: string;
      ip: string;
      body: any;
      query: any;
      params: any;
      path: string;
      get(name: string): string | undefined;
      user?: {
        id: number;
        [key: string]: any;
      };
    }

    export interface Response extends ExpressResponse {
      statusCode: number;
      on(event: string, listener: Function): this;
      status(code: number): this;
      json(body: any): this;
    }
  }
}

declare module 'express' {
  export interface Request extends Express.Request {}
  export interface Response extends Express.Response {}
  export interface Application {
    use: Function;
    get: Function;
    post: Function;
    put: Function;
    delete: Function;
  }
  export type NextFunction = (error?: any) => void;
}

export { Request, Response, NextFunction } from 'express';
