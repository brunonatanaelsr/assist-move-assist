import { rateLimit } from 'express-rate-limit';
import { db } from '../services/db';
import { loggerService } from '../services/logger';
import zxcvbn from 'zxcvbn';

const LOGIN_ATTEMPTS_LIMIT = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos

// Rate limiter específico para login
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // limite de 5 tentativas
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware para verificar bloqueio de login
export const checkLoginBlock = async (req: any, res: any, next: any) => {
  const { email } = req.body;
  
  if (!email) {
    return next();
  }

  try {
    const blocked = await db.query(
      `SELECT blocked_until FROM user_blocks WHERE email = $1`,
      [email]
    );

    if (blocked.length > 0 && new Date(blocked[0].blocked_until) > new Date()) {
      const remainingMs = new Date(blocked[0].blocked_until).getTime() - Date.now();
      const remainingTime = Math.ceil(remainingMs / 1000 / 60);
      return res.status(429).json({
        error: `Conta temporariamente bloqueada. Tente novamente em ${remainingTime} minutos.`
      });
    }

    next();
  } catch (error) {
    loggerService.error('Erro ao verificar bloqueio:', error);
    next();
  }
};

// Função para registrar tentativa de login falha
export const recordFailedAttempt = async (email: string) => {
  try {
    await db.query(`
      INSERT INTO login_attempts (email, attempt_time)
      VALUES ($1, NOW())
    `, [email]);

    // Verificar número de tentativas recentes
    const recentAttempts = await db.query(`
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE email = $1
      AND attempt_time > NOW() - INTERVAL '15 minutes'
    `, [email]);

    if (recentAttempts[0].count >= LOGIN_ATTEMPTS_LIMIT) {
      // Bloquear usuário
      await db.query(`
        INSERT INTO user_blocks (email, blocked_until)
        VALUES ($1, NOW() + INTERVAL '15 minutes')
        ON CONFLICT (email) DO UPDATE
        SET blocked_until = NOW() + INTERVAL '15 minutes'
      `, [email]);

      loggerService.warn(`Usuário bloqueado por excesso de tentativas: ${email}`);
    }
  } catch (error) {
    loggerService.error('Erro ao registrar tentativa de login:', error);
  }
};

// Função para validar força da senha
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  feedback: string;
} => {
  const result = zxcvbn(password);

  if (result.score < 3) {
    return {
      isValid: false,
      feedback: result.feedback.warning || 'Senha muito fraca. Use uma combinação de letras, números e símbolos.'
    };
  }

  return {
    isValid: true,
    feedback: 'Senha forte'
  };
};

// Configurações de cookie baseadas no ambiente
export const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000 // 1 dia
});
