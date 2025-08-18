const validate = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body, { abortEarly: false });
      
      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Erro de validação',
          errors
        });
      }
      
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = validate;
