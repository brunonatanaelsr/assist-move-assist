import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

interface CustomRequest extends Request {
  body: any;
}

interface CustomResponse extends Response {
  status(code: number): CustomResponse;
  json(data: any): CustomResponse;
  send(): CustomResponse;
}

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: CustomRequest, res: CustomResponse, next: NextFunction) => {
import { ZodSchema } from 'zod';

interface Request extends ExpressRequest {
  body: any;
}

interface Response extends ExpressResponse {
  status(code: number): Response;
  json(data: any): Response;
}

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({ error });
    }
  };
};
