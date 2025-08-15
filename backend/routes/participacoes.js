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

// Listar participações
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { beneficiaria_id, oficina_id } = req.query;
    
    let query = `
      SELECT p.*, 
             o.nome as oficina_nome, o.data_inicio, o.data_fim,
             b.nome_completo as beneficiaria_nome
      FROM participacoes p
      LEFT JOIN oficinas o ON p.oficina_id = o.id
      LEFT JOIN beneficiarias b ON p.beneficiaria_id = b.id
      WHERE p.ativo = true
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (beneficiaria_id) {
      paramCount++;
      query += ` AND p.beneficiaria_id = $${paramCount}`;
      params.push(beneficiaria_id);
    }
    
    if (oficina_id) {
      paramCount++;
      query += ` AND p.oficina_id = $${paramCount}`;
      params.push(oficina_id);
    }
    
    query += ` ORDER BY p.data_inscricao DESC`;
    
    const result = await pool.query(query, params);

    res.json(successResponse(result.rows, "Participações carregadas com sucesso"));

  } catch (error) {
    console.error("Get participacoes error:", error);
    res.status(500).json(errorResponse("Erro ao buscar participações"));
  }
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
