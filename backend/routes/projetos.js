const express = require('express');
const { Pool } = require('pg');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { formatArrayDates, formatObjectDates } = require('../utils/dateFormatter');
const { authenticateToken, requireGestor } = require('../middleware/auth');

const router = express.Router();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias_user',
  password: process.env.POSTGRES_PASSWORD || 'movemarias_password_2025',
});

// Listar projetos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE ativo = true';
    let params = [];
    
    if (status) {
      whereClause += ' AND status = $1';
      params.push(status);
    }

    const result = await pool.query(
      `SELECT p.*, u.nome as responsavel_nome, 
              COUNT(o.id) as total_oficinas
       FROM projetos p
       LEFT JOIN usuarios u ON p.responsavel_id = u.id
       LEFT JOIN oficinas o ON p.id = o.projeto_id AND o.ativo = true
       ${whereClause}
       GROUP BY p.id, u.nome
       ORDER BY p.data_inicio DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM projetos ${whereClause}`,
      params
    );

    const projetosFormatados = formatArrayDates(result.rows, ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);

    res.json(successResponse(projetosFormatados, "Projetos carregados com sucesso", {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    }));

  } catch (error) {
    console.error("Get projetos error:", error);
    res.status(500).json(errorResponse("Erro ao buscar projetos"));
  }
});

// Criar projeto
router.post('/', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { nome, descricao, data_inicio, data_fim, status, orcamento, localizacao } = req.body;

    if (!nome || !data_inicio) {
      return res.status(400).json(errorResponse("Nome e data de início são obrigatórios"));
    }

    const result = await pool.query(
      `INSERT INTO projetos (nome, descricao, data_inicio, data_fim, status, responsavel_id, orcamento, localizacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nome, descricao, data_inicio, data_fim || null, status || 'ativo', req.user.id, orcamento || null, localizacao || null]
    );

    const projetoFormatado = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);

    res.status(201).json(successResponse(projetoFormatado, "Projeto criado com sucesso"));

  } catch (error) {
    console.error("Create projeto error:", error);
    res.status(500).json(errorResponse("Erro ao criar projeto"));
  }
});

module.exports = router;
