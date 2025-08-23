const express = require('express');
const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { pool } = require('../config/database');

const router = express.Router();

// Login de usuário simplificado
router.post('/login', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, password } = req.body;
    console.log('Tentativa de login:', { email, password });

    // Buscar usuário
    const userResult = await client.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      console.log('Usuário não encontrado:', email);
      return res.status(401).json(errorResponse("Credenciais inválidas"));
    }

    const user = userResult.rows[0];
    console.log('Usuário encontrado:', user);

    // Verificação simples de senha
    if (password !== user.senha_hash) {
      console.log('Senha incorreta');
      return res.status(401).json(errorResponse("Credenciais inválidas"));
    }

    // Gerar token simples
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.papel },
      process.env.JWT_SECRET || 'chave_secreta_temporaria',
      { expiresIn: '24h' }
    );

    console.log(`Login bem sucedido: ${email}`);

    res.json(successResponse({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        papel: user.papel
      }
    }, "Login realizado com sucesso"));
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json(errorResponse("Erro interno do servidor"));
  } finally {
    client.release();
  }
});

module.exports = router;
