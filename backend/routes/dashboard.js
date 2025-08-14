const express = require('express');
const { Pool } = require('pg');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias_user',
  password: process.env.POSTGRES_PASSWORD || 'movemarias_password_2025',
});

// Dashboard geral
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Estatísticas gerais
    const beneficiariasCount = await pool.query('SELECT COUNT(*) FROM beneficiarias WHERE ativo = true');
    const oficinasCount = await pool.query('SELECT COUNT(*) FROM oficinas WHERE ativo = true');
    const projetosCount = await pool.query('SELECT COUNT(*) FROM projetos WHERE ativo = true');
    const participacoesCount = await pool.query('SELECT COUNT(*) FROM participacoes WHERE ativo = true');

    // Oficinas por status
    const oficinasStatus = await pool.query(`
      SELECT ativa, COUNT(*) as total 
      FROM oficinas 
      WHERE ativo = true 
      GROUP BY ativa
    `);

    // Beneficiárias por status
    const beneficiariasStatus = await pool.query(`
      SELECT status, COUNT(*) as total 
      FROM beneficiarias 
      WHERE ativo = true 
      GROUP BY status
    `);

    const dashboardData = {
      totais: {
        beneficiarias: parseInt(beneficiariasCount.rows[0].count),
        oficinas: parseInt(oficinasCount.rows[0].count),
        projetos: parseInt(projetosCount.rows[0].count),
        participacoes: parseInt(participacoesCount.rows[0].count)
      },
      oficinas_status: oficinasStatus.rows,
      beneficiarias_status: beneficiariasStatus.rows
    };

    res.json(successResponse(dashboardData, "Dashboard carregado com sucesso"));

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json(errorResponse("Erro ao carregar dashboard"));
  }
});

module.exports = router;
