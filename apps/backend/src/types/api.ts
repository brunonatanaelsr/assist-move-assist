import { Request } from 'express';
import { JWTPayload } from './auth';

export interface CustomRequest extends Request {
  user?: JWTPayload;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  order?: string;
  sort?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface File {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}
