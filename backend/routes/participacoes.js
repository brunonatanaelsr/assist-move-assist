const express = require('express');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { authenticateToken, requireGestor } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Listar participações
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { beneficiaria_id, oficina_id } = req.query;
    
    let query = `
      SELECT p.*, 
             pr.nome as projeto_nome, pr.data_inicio, pr.data_fim_prevista, pr.data_fim_real,
             b.nome_completo as beneficiaria_nome
      FROM participacoes p
      LEFT JOIN projetos pr ON p.projeto_id = pr.id
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
      // Nota: Como participações são por projeto, vamos buscar o projeto da oficina
      paramCount++;
      query += ` AND p.projeto_id IN (SELECT projeto_id FROM oficinas WHERE id = $${paramCount})`;
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
