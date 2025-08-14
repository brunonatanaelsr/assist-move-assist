const express = require('express');
const { Pool } = require('pg');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { authenticateToken, requireGestor } = require('../middleware/auth');

const router = express.Router();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias_user',
  password: process.env.POSTGRES_PASSWORD || 'movemarias_password_2025',
});

// Inscrever beneficiária em oficina
router.post('/', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { beneficiaria_id, oficina_id } = req.body;

    if (!beneficiaria_id || !oficina_id) {
      return res.status(400).json(errorResponse("ID da beneficiária e oficina são obrigatórios"));
    }

    // Verificar se já existe participação
    const existingCheck = await pool.query(
      "SELECT id FROM participacoes WHERE beneficiaria_id = $1 AND oficina_id = $2 AND ativo = true",
      [beneficiaria_id, oficina_id]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json(errorResponse("Beneficiária já está inscrita nesta oficina"));
    }

    const result = await pool.query(
      "INSERT INTO participacoes (beneficiaria_id, oficina_id) VALUES ($1, $2) RETURNING *",
      [beneficiaria_id, oficina_id]
    );

    res.status(201).json(successResponse(result.rows[0], "Participação registrada com sucesso"));

  } catch (error) {
    console.error("Create participacao error:", error);
    res.status(500).json(errorResponse("Erro ao registrar participação"));
  }
});

module.exports = router;
