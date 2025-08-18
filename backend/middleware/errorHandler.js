const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERRO: ${err.message}`);
  console.error(err.stack);
  
  // Classificar erros
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Registro duplicado encontrado',
      error: err.detail
    });
  }
  
  if (err.code === '23503') {
    return res.status(409).json({
      success: false,
      message: 'Violação de chave estrangeira',
      error: err.detail
    });
  }
  
  // Erro padrão
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

module.exports = errorHandler;
