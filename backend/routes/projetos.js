const express = require('express');
const { Pool } = require('pg');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { formatArrayDates, formatObjectDates } = require('../utils/dateFormatter');
const { authenticateToken, requireGestor } = require('../middleware/auth');

const router = express.Router();

// Usar variáveis de ambiente ou valores padrão
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Listar projetos
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Buscando projetos...');
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.ativo = true';
    let params = [];
    
    if (status) {
      whereClause += ' AND p.status = $1';
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
       ORDER BY p.data_criacao DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    console.log(`Encontrados ${result.rows.length} projetos`);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM projetos p ${whereClause}`,
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
    res.status(500).json(errorResponse("Erro ao buscar projetos: " + error.message));
  }
});

// Buscar projeto por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT p.*, u.nome as responsavel_nome 
       FROM projetos p
       LEFT JOIN usuarios u ON p.responsavel_id = u.id
       WHERE p.id = $1 AND p.ativo = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Projeto não encontrado"));
    }

    const projetoFormatado = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);

    res.json(successResponse(projetoFormatado, "Projeto carregado com sucesso"));

  } catch (error) {
    console.error("Get projeto error:", error);
    res.status(500).json(errorResponse("Erro ao buscar projeto"));
  }
});

// Criar projeto
router.post('/', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { nome, descricao, data_inicio, data_fim_prevista, status, orcamento, localizacao } = req.body;

    if (!nome || !data_inicio) {
      return res.status(400).json(errorResponse("Nome e data de início são obrigatórios"));
    }

    const result = await pool.query(
      `INSERT INTO projetos (nome, descricao, data_inicio, data_fim_prevista, status, responsavel_id, orcamento, local_execucao, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
      [nome, descricao, data_inicio, data_fim_prevista || null, status || 'planejamento', req.user.id, orcamento || null, localizacao || null]
    );

    console.log(`Novo projeto criado: ${nome} por ${req.user.email}`);

    const projetoFormatado = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim_prevista', 'data_fim_real', 'data_criacao', 'data_atualizacao']);

    res.status(201).json(successResponse(projetoFormatado, "Projeto criado com sucesso"));

  } catch (error) {
    console.error("Create projeto error:", error);
    res.status(500).json(errorResponse("Erro ao criar projeto: " + error.message));
  }
});

// Atualizar projeto
router.put('/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, data_inicio, data_fim_prevista, status, orcamento, localizacao } = req.body;

    if (!nome || !data_inicio) {
      return res.status(400).json(errorResponse("Nome e data de início são obrigatórios"));
    }

    const result = await pool.query(
      `UPDATE projetos 
       SET nome = $1, descricao = $2, data_inicio = $3, data_fim_prevista = $4, 
           status = $5, orcamento = $6, local_execucao = $7, data_atualizacao = CURRENT_TIMESTAMP
       WHERE id = $8 AND ativo = true 
       RETURNING *`,
      [nome, descricao, data_inicio, data_fim_prevista || null, status || 'planejamento', orcamento || null, localizacao || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Projeto não encontrado"));
    }

    console.log(`Projeto atualizado: ${nome} por ${req.user.email}`);

    const projetoFormatado = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim_prevista', 'data_fim_real', 'data_criacao', 'data_atualizacao']);

    res.json(successResponse(projetoFormatado, "Projeto atualizado com sucesso"));

  } catch (error) {
    console.error("Update projeto error:", error);
    res.status(500).json(errorResponse("Erro ao atualizar projeto: " + error.message));
  }
});

// Deletar projeto (soft delete)
router.delete('/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE projetos SET ativo = false, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $1 AND ativo = true RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Projeto não encontrado"));
    }

    console.log(`Projeto desativado: ${result.rows[0].nome} por ${req.user.email}`);

    res.json(successResponse(null, "Projeto removido com sucesso"));

  } catch (error) {
    console.error("Delete projeto error:", error);
    res.status(500).json(errorResponse("Erro ao remover projeto"));
  }
});

module.exports = router;
