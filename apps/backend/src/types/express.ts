import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

export type TypedRequest<
  T = any,
  P extends ParamsDictionary = ParamsDictionary,
  Q extends ParsedQs = ParsedQs
> = Request<P, any, T, Q>;

export type TypedResponse<T = any> = Response<T>;
