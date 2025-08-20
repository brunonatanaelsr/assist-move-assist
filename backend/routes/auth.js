const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const { schemas, validate } = require('../validation');
const crypto = require('crypto');

const router = express.Router();

// Configurações de token
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
};

// Gerar tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { id: user.id, tokenVersion: user.token_version },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
};

// Hash do refresh token para armazenamento
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Login de usuário
router.post('/login', validate(schemas.auth.login), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const { email, password } = req.body;

    // Buscar usuário
    const userResult = await client.query(
      "SELECT * FROM usuarios WHERE email = $1 AND ativo = true",
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(401).json(errorResponse("Credenciais inválidas"));
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.senha_hash);

    if (!passwordMatch) {
      await client.query('ROLLBACK');
      return res.status(401).json(errorResponse("Credenciais inválidas"));
    }

    // Gerar tokens
    const tokens = generateTokens(user);
    const tokenHash = hashToken(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Salvar refresh token
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, tokenHash, req.ip, req.get('user-agent'), expiresAt]
    );

    // Atualizar último login
    await client.query(
      "UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1",
      [user.id]
    );

    await client.query('COMMIT');

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.papel 
      },
      process.env.JWT_SECRET || 'movemarias_jwt_secret_key_2025_production',
      { expiresIn: "24h" }
    );

    console.log(`Successful login: ${email} from ${req.ip}`);

    res.json(successResponse({
      token,
      user: {
        id: user.id,
        name: user.nome,
        email: user.email,
        role: user.papel
      }
    }, "Login realizado com sucesso"));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Login error:", error);
    res.status(500).json(errorResponse("Erro interno do servidor"));
  } finally {
    client.release(); // Liberando o cliente de volta para o pool
  }
});

// Obter informações do usuário autenticado
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userQuery = "SELECT id, nome, email, papel, telefone FROM usuarios WHERE id = $1 AND ativo = true";
    const userResult = await pool.query(userQuery, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json(errorResponse("Usuário não encontrado"));
    }

    const user = userResult.rows[0];
    
    res.json(successResponse({
      id: user.id,
      name: user.nome,
      email: user.email,
      role: user.papel,
      phone: user.telefone
    }, "Dados do usuário carregados com sucesso"));
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json(errorResponse("Erro ao buscar informações do usuário"));
  }
});

// Logout (invalidar token - implementação básica)
router.post('/logout', authenticateToken, (req, res) => {
  // Em uma implementação mais robusta, manteria uma blacklist de tokens
  res.json(successResponse(null, "Logout realizado com sucesso"));
});

// Alterar senha
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json(errorResponse("Senha atual e nova senha são obrigatórias"));
    }

    if (newPassword.length < 6) {
      return res.status(400).json(errorResponse("Nova senha deve ter pelo menos 6 caracteres"));
    }

    // Buscar usuário atual
    const userQuery = "SELECT senha_hash FROM usuarios WHERE id = $1 AND ativo = true";
    const userResult = await pool.query(userQuery, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json(errorResponse("Usuário não encontrado"));
    }

    const user = userResult.rows[0];

    // Verificar senha atual
    const passwordMatch = await bcrypt.compare(currentPassword, user.senha_hash);

    if (!passwordMatch) {
      return res.status(401).json(errorResponse("Senha atual incorreta"));
    }

    // Hash da nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Atualizar senha no banco
    await pool.query(
      "UPDATE usuarios SET senha_hash = $1, data_atualizacao = NOW() WHERE id = $2",
      [newPasswordHash, req.user.id]
    );

    console.log(`Password changed for user: ${req.user.email} from ${req.ip}`);

    res.json(successResponse(null, "Senha alterada com sucesso"));

  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json(errorResponse("Erro ao alterar senha"));
  }
});

module.exports = router;
