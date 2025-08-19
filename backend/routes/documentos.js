const express = require('express');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { formatArrayDates } = require('../utils/dateFormatter');
const { authenticateToken, requireGestor } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Listar documentos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { beneficiaria_id } = req.query;
    
    let query = `
      SELECT d.*, b.nome_completo as beneficiaria_nome
      FROM documentos d
      LEFT JOIN beneficiarias b ON d.beneficiaria_id = b.id
      WHERE d.ativo = true
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (beneficiaria_id) {
      paramCount++;
      query += ` AND d.beneficiaria_id = $${paramCount}`;
      params.push(beneficiaria_id);
    }
    
    query += ` ORDER BY d.data_upload DESC`;
    
    const result = await pool.query(query, params);
    
    const documentosFormatados = formatArrayDates(result.rows, ['data_upload']);

    res.json(successResponse(documentosFormatados, "Documentos carregados com sucesso"));

  } catch (error) {
    console.error("Get documentos error:", error);
    res.status(500).json(errorResponse("Erro ao buscar documentos"));
  }
});

// Criar documento
router.post('/', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { beneficiaria_id, tipo, nome, url } = req.body;

    if (!beneficiaria_id || !tipo || !nome) {
      return res.status(400).json(errorResponse("ID da beneficiária, tipo e nome são obrigatórios"));
    }

    const result = await pool.query(
      `INSERT INTO documentos (beneficiaria_id, tipo, nome, url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [beneficiaria_id, tipo, nome, url || null]
    );

    res.status(201).json(successResponse(result.rows[0], "Documento criado com sucesso"));

  } catch (error) {
    console.error("Create documento error:", error);
    res.status(500).json(errorResponse("Erro ao criar documento"));
  }
});

// Obter documento específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT d.*, b.nome_completo as beneficiaria_nome
       FROM documentos d
       LEFT JOIN beneficiarias b ON d.beneficiaria_id = b.id
       WHERE d.id = $1 AND d.ativo = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Documento não encontrado"));
    }

    res.json(successResponse(result.rows[0], "Documento carregado com sucesso"));

  } catch (error) {
    console.error("Get documento error:", error);
    res.status(500).json(errorResponse("Erro ao buscar documento"));
  }
});

// Atualizar documento
router.put('/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, nome, url } = req.body;

    const result = await pool.query(
      `UPDATE documentos 
       SET tipo = COALESCE($2, tipo),
           nome = COALESCE($3, nome),
           url = COALESCE($4, url),
           data_atualizacao = CURRENT_TIMESTAMP
       WHERE id = $1 AND ativo = true 
       RETURNING *`,
      [id, tipo, nome, url]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Documento não encontrado"));
    }

    res.json(successResponse(result.rows[0], "Documento atualizado com sucesso"));

  } catch (error) {
    console.error("Update documento error:", error);
    res.status(500).json(errorResponse("Erro ao atualizar documento"));
  }
});

// Deletar documento
router.delete('/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE documentos SET ativo = false, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $1 AND ativo = true RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Documento não encontrado"));
    }

    res.json(successResponse(null, "Documento deletado com sucesso"));

  } catch (error) {
    console.error("Delete documento error:", error);
    res.status(500).json(errorResponse("Erro ao deletar documento"));
  }
});

module.exports = router;
