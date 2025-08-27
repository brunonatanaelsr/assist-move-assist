import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { Query as ExpressQuery } from 'express-serve-static-core';
import { PERMISSIONS } from './permissions';

// Interface básica de usuário
export interface UserInfo {
  id: number;
  email: string;
  role: string;
  permissions?: PERMISSIONS[];
}

// Interface para requisições autenticadas
export interface AuthenticatedRequest extends ExpressRequest {
  user: UserInfo;
}

// Interface para requisições com tipos
export interface TypedRequest<T = any, Q extends ExpressQuery = ExpressQuery> extends ExpressRequest {
  body: T;
  query: Q;
  params: {
    [key: string]: string;
  };
  user?: UserInfo;
}

// Interface para respostas tipadas
export interface TypedResponse<T = any> extends ExpressResponse {
  json(body: T): this;
  status(code: number): this;
}

// Interface para corpo da requisição do plano de ação
export interface PlanoAcaoBody {
  beneficiaria_id: number;
  data_plano: string;
  objetivo_principal: string;
  areas_prioritarias: string[];
  outras_areas?: string[];
  acoes_realizadas: string[];
  suporte_instituto?: string;
  assinatura_beneficiaria: string;
  assinatura_responsavel_tecnico: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserInfo;
    }
  }
}

export { NextFunction };
    interface Request extends ExtendedRequest {}
    interface Response extends TypedResponse {}
  }
}
