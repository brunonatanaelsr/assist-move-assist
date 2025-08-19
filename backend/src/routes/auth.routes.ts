import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { AuthService } from '../services/auth.service';
import { authenticateToken } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { loginSchema, changePasswordSchema } from '../validators/auth.validator';

const router = express.Router();

// Inicialização do pool e redis
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '15002031',
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0
});

const authService = new AuthService(pool, redis);

// Login de usuário
router.post('/login', async (req, res) => {
  try {
    // Validar dados de entrada
    const loginData = loginSchema.parse(req.body);

    const result = await authService.login(loginData, req.ip);
    res.json(successResponse(result, "Login realizado com sucesso"));

  } catch (error: any) {
    console.error("Login error:", error);

    if (error.name === 'ZodError') {
      return res.status(400).json(errorResponse("Dados de entrada inválidos"));
    }

    if (error.message === "Credenciais inválidas") {
      return res.status(401).json(errorResponse(error.message));
    }

    res.status(500).json(errorResponse("Erro interno do servidor"));
  }
});

// Obter informações do usuário autenticado
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await authService.getCurrentUser(userId);
    res.json(successResponse(user, "Dados do usuário carregados com sucesso"));
  } catch (error: any) {
    console.error("Get user error:", error);

    if (error.message === "Usuário não encontrado") {
      return res.status(404).json(errorResponse(error.message));
    }

    res.status(500).json(errorResponse("Erro ao buscar informações do usuário"));
  }
});

// Logout (invalidar token)
router.post('/logout', authenticateToken, (req, res) => {
  // Em uma implementação mais robusta, manteria uma blacklist de tokens no Redis
  res.json(successResponse(null, "Logout realizado com sucesso"));
});

// Alterar senha
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    // Validar dados de entrada
    const passwordData = changePasswordSchema.parse(req.body);

    await authService.changePassword(req.user.id, passwordData, req.ip);
    res.json(successResponse(null, "Senha alterada com sucesso"));

  } catch (error: any) {
    console.error("Change password error:", error);

    if (error.name === 'ZodError') {
      return res.status(400).json(errorResponse("Dados de entrada inválidos"));
    }

    if (error.message === "Senha atual incorreta") {
      return res.status(401).json(errorResponse(error.message));
    }

    if (error.message === "Usuário não encontrado") {
      return res.status(404).json(errorResponse(error.message));
    }

    if (error.message === "Nova senha deve ser diferente da atual") {
      return res.status(400).json(errorResponse(error.message));
    }

    res.status(500).json(errorResponse("Erro ao alterar senha"));
  }
});

export default router;
