import { Request, Response, ParamsDictionary } from 'express';

export interface TypedRequest<T = any, P extends ParamsDictionary = ParamsDictionary> extends Request {
  body: T;
  params: P;
}

export interface TypedResponse<T = any> extends Omit<Response, 'json' | 'status'> {
  json: (body: T) => TypedResponse<T>;
  status: (code: number) => TypedResponse<T>;
}
