const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Importar pool do módulo de configuração central
const { pool } = require('../config/database');

const { schemas, validate } = require('../validation');

// Login de usuário
router.post('/login', validate(schemas.auth.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário no banco
    const userQuery = "SELECT * FROM usuarios WHERE email = $1 AND ativo = true";
    const userResult = await pool.query(userQuery, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      console.log(`Failed login attempt: ${email} from ${req.ip}`);
      return res.status(401).json(errorResponse("Credenciais inválidas"));
    }

    const user = userResult.rows[0];

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.senha_hash);

    if (!passwordMatch) {
      console.log(`Failed login attempt: ${email} (wrong password) from ${req.ip}`);
      return res.status(401).json(errorResponse("Credenciais inválidas"));
    }

    // Debug da query de login
    console.log('🔍 Executando query de login...');
    console.log('🔍 Dados do usuário para update:', { userId: user.id });

    try {
      // Atualizar último login
      await pool.query(
        "UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1",
        [user.id]
      );
      console.log('✅ Query executada com sucesso');
    } catch (error) {
      console.log('❌ Erro na query:', error.message);
      console.log('❌ Código do erro:', error.code);
      console.log('❌ Query que falhou:', error.query);
      throw error;
    }

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
    console.error("Login error:", error);
    res.status(500).json(errorResponse("Erro interno do servidor"));
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
