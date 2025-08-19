export class BaseError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string = 'Erro interno do banco de dados') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = 'Erro de autenticação') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'Acesso não autorizado') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

export class ValidationError extends BaseError {
  constructor(message: string = 'Erro de validação') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends BaseError {
  constructor(message: string = 'Conflito de recursos') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}
