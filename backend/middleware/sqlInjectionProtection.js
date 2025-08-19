const sqlKeywords = [
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE',
  'ALTER', 'CREATE', 'UNION', 'JOIN', 'WHERE', 'FROM'
];

const sqlInjectionPattern = new RegExp(
  `(${sqlKeywords.join('|')})[^\\w]|--|;|/\\*|\\*/|@@|@`,
  'i'
);

function detectSqlInjection(value) {
  if (typeof value !== 'string') return false;
  return sqlInjectionPattern.test(value);
}

function sqlInjectionProtection(req, res, next) {
  // Função para verificar objetos recursivamente
  function checkObject(obj) {
    for (let key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkObject(obj[key])) return true;
      } else if (detectSqlInjection(obj[key])) {
        return true;
      }
    }
    return false;
  }

  // Verificar body, query e params
  const hasInjection = checkObject(req.body) || 
                      checkObject(req.query) || 
                      checkObject(req.params);

  if (hasInjection) {
    return res.status(403).json({
      status: 'error',
      message: 'Caracteres inválidos detectados na requisição'
    });
  }

  next();
}

module.exports = sqlInjectionProtection;
