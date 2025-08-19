import * as express from 'express';
import { PERMISSIONS } from './permissions';

export interface ExtendedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions?: PERMISSIONS[];
  };
  method: string;
  originalUrl: string;
  ip: string;
  connection: {
    remoteAddress: string;
  };
  get(header: string): string;
  body: any;
  query: any;
  params: any;
  headers: {
    [key: string]: string | string[] | undefined;
  };
}

export interface AuthenticatedRequest extends ExtendedRequest {
  user: {
    id: string;
    email: string;
    role: string;
    permissions?: PERMISSIONS[];
  };
}

export interface TypedRequest<T = any, U = any> extends ExtendedRequest {
  body: T;
  query: U;
}

export interface TypedResponse<T = any> extends express.Response {
  json: (body: T) => TypedResponse<T>;
  setHeader(name: string, value: string): this;
  status(code: number): this;
}

export type NextFunction = express.NextFunction;
