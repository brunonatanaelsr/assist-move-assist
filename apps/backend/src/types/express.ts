import { Request, Response } from 'express';

export interface TypedRequest<T = any, P = any> extends Request {
  body: T;
  params: P;
}

export interface TypedResponse<T = any> extends Response {
  json: (body: T) => TypedResponse<T>;
  status: (code: number) => TypedResponse<T>;
}
