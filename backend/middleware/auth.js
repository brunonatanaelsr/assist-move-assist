const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseFormatter');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json(errorResponse("Token de acesso requerido"));
  }

  jwt.verify(token, process.env.JWT_SECRET || 'movemarias_jwt_secret_key_2025_production', (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json(errorResponse("Token expirado"));
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json(errorResponse("Token inválido"));
      }
      return res.status(403).json(errorResponse("Token inválido"));
    }

    req.user = user;
    next();
  });
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(errorResponse("Usuário não autenticado"));
    }

    if (Array.isArray(roles)) {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json(errorResponse("Acesso negado. Privilégios insuficientes"));
      }
    } else {
      if (req.user.role !== roles) {
        return res.status(403).json(errorResponse("Acesso negado. Privilégios insuficientes"));
      }
    }

    next();
  };
};

const requireAdmin = requireRole(['admin', 'superadmin']);
const requireGestor = requireRole(['gestor', 'admin', 'superadmin']);

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireGestor
};
