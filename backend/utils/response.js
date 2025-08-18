const successResponse = (data, message = 'Operação realizada com sucesso', meta = {}) => {
  return {
    success: true,
    message,
    data,
    ...meta
  };
};

const errorResponse = (message = 'Erro interno do servidor', details = null) => {
  const response = {
    success: false,
    message
  };

  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }

  return response;
};

module.exports = {
  successResponse,
  errorResponse
};
