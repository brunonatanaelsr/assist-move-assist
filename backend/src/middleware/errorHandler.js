const { logger } = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log do erro
  logger.error('Error', {
    statusCode: err.statusCode,
    message: err.message,
    stack: err.stack,
    path: req.originalUrl
  });

  // Erros operacionais conhecidos
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Erros de validação do Postgres
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      status: 'fail',
      message: 'Dados duplicados. Por favor, verifique os campos únicos.'
    });
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      status: 'fail',
      message: 'Referência inválida. Verifique os dados relacionados.'
    });
  }

  // Erros de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Token inválido. Por favor, faça login novamente.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Sua sessão expirou. Por favor, faça login novamente.'
    });
  }

  // Erro de produção - não expõe detalhes do erro
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      status: 'error',
      message: 'Algo deu errado. Por favor, tente novamente mais tarde.'
    });
  }

  // Erro de desenvolvimento - expõe detalhes do erro
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const notFound = (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Não foi possível encontrar ${req.originalUrl} neste servidor`
  });
};

module.exports = {
  AppError,
  errorHandler,
  notFound
};
