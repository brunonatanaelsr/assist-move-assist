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

// Registrar avaliação
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      oficina_id,
      nota,
      comentario,
      aspectos_positivos,
      aspectos_negativos,
      sugestoes
    } = req.body;

    if (!oficina_id || !nota) {
      return res.status(400).json(errorResponse("Campos obrigatórios: oficina_id, nota"));
    }

    // Verificar se a beneficiária participou da oficina
    const participacaoCheck = await pool.query(
      `SELECT id FROM participacoes 
       WHERE oficina_id = $1 AND beneficiaria_id = $2 AND ativo = true`,
      [oficina_id, req.user.id]
    );

    if (participacaoCheck.rows.length === 0) {
      return res.status(400).json(errorResponse("Beneficiária não participou desta oficina"));
    }

    // Verificar se já avaliou
    const avaliacaoExistente = await pool.query(
      `SELECT id FROM avaliacoes_oficinas 
       WHERE oficina_id = $1 AND beneficiaria_id = $2 AND ativo = true`,
      [oficina_id, req.user.id]
    );

    if (avaliacaoExistente.rows.length > 0) {
      return res.status(400).json(errorResponse("Você já avaliou esta oficina"));
    }

    const result = await pool.query(
      `INSERT INTO avaliacoes_oficinas (
        oficina_id, beneficiaria_id, nota, comentario,
        aspectos_positivos, aspectos_negativos, sugestoes,
        meta_dados
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        oficina_id,
        req.user.id,
        nota,
        comentario,
        aspectos_positivos,
        aspectos_negativos,
        sugestoes,
        {
          ip: req.ip,
          user_agent: req.headers['user-agent']
        }
      ]
    );

    // Registrar na auditoria
    await registrarEvento(
      'AVALIACAO',
      `Avaliação registrada - Oficina ID: ${oficina_id}`,
      req.user.id,
      'avaliacoes_oficinas',
      {
        oficina_id,
        nota,
        aspectos_positivos,
        aspectos_negativos
      },
      req.ip
    );

    res.json(successResponse(result.rows[0], "Avaliação registrada com sucesso"));

  } catch (error) {
    console.error("Register avaliacao error:", error);
    res.status(500).json(errorResponse("Erro ao registrar avaliação"));
  }
});

// Listar avaliações de uma oficina
router.get('/oficina/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT a.*, b.nome_completo as beneficiaria_nome
       FROM avaliacoes_oficinas a
       JOIN beneficiarias b ON a.beneficiaria_id = b.id
       WHERE a.oficina_id = $1 AND a.ativo = true
       ORDER BY a.data_avaliacao DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM avaliacoes_oficinas WHERE oficina_id = $1 AND ativo = true`,
      [id]
    );

    // Calcular média das notas
    const statsResult = await pool.query(
      `SELECT 
         ROUND(AVG(nota)::numeric, 2) as media_nota,
         COUNT(*) as total_avaliacoes,
         COUNT(CASE WHEN nota >= 4 THEN 1 END) as avaliacoes_positivas,
         COUNT(CASE WHEN nota <= 2 THEN 1 END) as avaliacoes_negativas
       FROM avaliacoes_oficinas
       WHERE oficina_id = $1 AND ativo = true`,
      [id]
    );

    const avaliacoesFormatadas = formatArrayDates(result.rows, ['data_avaliacao', 'data_criacao', 'data_atualizacao']);

    res.json(successResponse(
      {
        avaliacoes: avaliacoesFormatadas,
        estatisticas: statsResult.rows[0],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
      },
      "Avaliações carregadas com sucesso"
    ));

  } catch (error) {
    console.error("Get avaliacoes error:", error);
    res.status(500).json(errorResponse("Erro ao buscar avaliações"));
  }
});

module.exports = router;
