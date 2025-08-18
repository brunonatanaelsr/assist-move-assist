const express = require('express');
const { Pool } = require('pg');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { formatArrayDates, formatObjectDates } = require('../utils/dateFormatter');
const { authenticateToken } = require('../middleware/auth');
const { registrarEvento } = require('../utils/auditoria');

const router = express.Router();

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias_user',
  password: process.env.POSTGRES_PASSWORD || 'movemarias_password_2025',
});

// Registrar presença
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { oficina_id, beneficiaria_id, data_encontro, presente, justificativa, observacoes } = req.body;

    if (!oficina_id || !beneficiaria_id || !data_encontro) {
      return res.status(400).json(errorResponse("Campos obrigatórios: oficina_id, beneficiaria_id, data_encontro"));
    }

    // Verificar se a beneficiária está inscrita na oficina
    const inscricaoCheck = await pool.query(
      "SELECT id FROM participacoes WHERE oficina_id = $1 AND beneficiaria_id = $2 AND ativo = true",
      [oficina_id, beneficiaria_id]
    );

    if (inscricaoCheck.rows.length === 0) {
      return res.status(400).json(errorResponse("Beneficiária não está inscrita nesta oficina"));
    }

    // Verificar se já existe registro de presença
    const presencaExistente = await pool.query(
      "SELECT id FROM presencas_oficinas WHERE oficina_id = $1 AND beneficiaria_id = $2 AND data_encontro = $3",
      [oficina_id, beneficiaria_id, data_encontro]
    );

    let result;
    if (presencaExistente.rows.length > 0) {
      // Atualizar presença existente
      result = await pool.query(
        `UPDATE presencas_oficinas 
         SET presente = $1, justificativa = $2, observacoes = $3, data_atualizacao = CURRENT_TIMESTAMP
         WHERE id = $4 RETURNING *`,
        [presente, justificativa, observacoes, presencaExistente.rows[0].id]
      );
    } else {
      // Criar novo registro de presença
      result = await pool.query(
        `INSERT INTO presencas_oficinas (
          oficina_id, beneficiaria_id, data_encontro, presente, justificativa, observacoes
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [oficina_id, beneficiaria_id, data_encontro, presente, justificativa, observacoes]
      );
    }

    // Registrar na auditoria
    await registrarEvento(
      'PRESENCA',
      `Registro de presença - Oficina ID: ${oficina_id}, Beneficiária ID: ${beneficiaria_id}`,
      req.user.id,
      'presencas_oficinas',
      {
        oficina_id,
        beneficiaria_id,
        data_encontro,
        presente,
        justificativa
      },
      req.ip
    );

    res.json(successResponse(result.rows[0], "Presença registrada com sucesso"));

  } catch (error) {
    console.error("Register presenca error:", error);
    res.status(500).json(errorResponse("Erro ao registrar presença"));
  }
});

// Listar presenças de uma oficina
router.get('/oficina/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data_inicio, data_fim } = req.query;

    let query = `
      SELECT p.*, b.nome_completo as beneficiaria_nome
      FROM presencas_oficinas p
      JOIN beneficiarias b ON p.beneficiaria_id = b.id
      WHERE p.oficina_id = $1 AND p.ativo = true
    `;
    const params = [id];

    if (data_inicio && data_fim) {
      query += " AND p.data_encontro BETWEEN $2 AND $3";
      params.push(data_inicio, data_fim);
    }

    query += " ORDER BY p.data_encontro DESC, b.nome_completo";

    const result = await pool.query(query, params);
    const presencasFormatadas = formatArrayDates(result.rows, ['data_encontro', 'data_criacao', 'data_atualizacao']);

    res.json(successResponse(presencasFormatadas, "Presenças carregadas com sucesso"));

  } catch (error) {
    console.error("Get presencas error:", error);
    res.status(500).json(errorResponse("Erro ao buscar presenças"));
  }
});

// Listar presenças de uma beneficiária
router.get('/beneficiaria/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { oficina_id } = req.query;

    let query = `
      SELECT p.*, o.nome as oficina_nome
      FROM presencas_oficinas p
      JOIN oficinas o ON p.oficina_id = o.id
      WHERE p.beneficiaria_id = $1 AND p.ativo = true
    `;
    const params = [id];

    if (oficina_id) {
      query += " AND p.oficina_id = $2";
      params.push(oficina_id);
    }

    query += " ORDER BY p.data_encontro DESC";

    const result = await pool.query(query, params);
    const presencasFormatadas = formatArrayDates(result.rows, ['data_encontro', 'data_criacao', 'data_atualizacao']);

    res.json(successResponse(presencasFormatadas, "Presenças carregadas com sucesso"));

  } catch (error) {
    console.error("Get presencas beneficiaria error:", error);
    res.status(500).json(errorResponse("Erro ao buscar presenças da beneficiária"));
  }
});

module.exports = router;
