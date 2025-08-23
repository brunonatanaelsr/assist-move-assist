const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseFormatter');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    let token;
    
    // Tentar pegar o token do cookie primeiro
    if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    } else {
      // Se não houver cookie, tentar do header Authorization
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json(errorResponse('Token não fornecido'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'movemarias_jwt_secret_key_2025_production');
    
    // Verificar se o usuário ainda está ativo
    const userResult = await pool.query(
      "SELECT id, nome, email, papel, ativo FROM usuarios WHERE id = $1 AND ativo = true",
      [decoded.id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].ativo) {
      return res.status(401).json(errorResponse('Usuário inativo ou não encontrado'));
    }

    req.user = {
      ...decoded,
      ...userResult.rows[0]
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json(errorResponse('Token expirado'));
    }
    return res.status(401).json(errorResponse('Token inválido'));
  }
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
