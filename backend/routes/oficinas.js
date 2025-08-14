const express = require('express');
const { Pool } = require('pg');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { formatArrayDates, formatObjectDates } = require('../utils/dateFormatter');
const { authenticateToken, requireGestor } = require('../middleware/auth');

const router = express.Router();

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias_user',
  password: process.env.POSTGRES_PASSWORD || 'movemarias_password_2025',
});

// Listar oficinas (público para permitir visualização sem autenticação)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, projeto_id, ativa } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['o.ativo = true'];
    let params = [];
    let paramCount = 0;

    // Filtros opcionais
    if (projeto_id) {
      paramCount++;
      whereConditions.push(`o.projeto_id = $${paramCount}`);
      params.push(projeto_id);
    }

    if (ativa !== undefined) {
      paramCount++;
      whereConditions.push(`o.ativa = $${paramCount}`);
      params.push(ativa === 'true');
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await pool.query(
      `SELECT o.*,
        p.nome as projeto_nome,
        u.nome as responsavel_nome,
        COUNT(pa.id) as total_participantes
       FROM oficinas o
       LEFT JOIN projetos p ON o.projeto_id = p.id
       LEFT JOIN usuarios u ON o.responsavel_id = u.id
       LEFT JOIN participacoes pa ON o.id = pa.oficina_id AND pa.ativo = true
       WHERE ${whereClause}
       GROUP BY o.id, p.nome, u.nome
       ORDER BY o.data_inicio DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM oficinas o WHERE ${whereClause}`,
      params
    );

    // Formatar datas para o formato ISO
    const oficinasFormatadas = formatArrayDates(result.rows, ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);

    res.json(successResponse(
      oficinasFormatadas,
      "Oficinas carregadas com sucesso",
      {
        total: parseInt(countResult.rows[0].count),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
      }
    ));

  } catch (error) {
    console.error("Get oficinas error:", error);
    res.status(500).json(errorResponse("Erro ao buscar oficinas"));
  }
});

// Obter oficina específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT o.*,
        p.nome as projeto_nome,
        u.nome as responsavel_nome,
        COUNT(pa.id) as total_participantes
       FROM oficinas o
       LEFT JOIN projetos p ON o.projeto_id = p.id
       LEFT JOIN usuarios u ON o.responsavel_id = u.id
       LEFT JOIN participacoes pa ON o.id = pa.oficina_id AND pa.ativo = true
       WHERE o.id = $1 AND o.ativo = true
       GROUP BY o.id, p.nome, u.nome`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Oficina não encontrada"));
    }

    const oficinaFormatada = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);

    res.json(successResponse(oficinaFormatada, "Oficina carregada com sucesso"));

  } catch (error) {
    console.error("Get oficina error:", error);
    res.status(500).json(errorResponse("Erro ao buscar oficina"));
  }
});

// Criar oficina
router.post('/', authenticateToken, requireGestor, async (req, res) => {
  try {
    const {
      nome,
      descricao,
      instrutor,
      data_inicio,
      data_fim,
      horario_inicio,
      horario_fim,
      local,
      vagas_totais,
      projeto_id,
      ativa = true
    } = req.body;

    if (!nome || !data_inicio || !horario_inicio || !horario_fim) {
      return res.status(400).json(errorResponse("Campos obrigatórios: nome, data_inicio, horario_inicio, horario_fim"));
    }

    // Verificar se o projeto existe (se fornecido)
    if (projeto_id) {
      const projetoCheck = await pool.query(
        "SELECT id FROM projetos WHERE id = $1 AND ativo = true",
        [projeto_id]
      );
      if (projetoCheck.rows.length === 0) {
        return res.status(400).json(errorResponse("Projeto não encontrado"));
      }
    }

    const result = await pool.query(
      `INSERT INTO oficinas (
        nome, descricao, instrutor, data_inicio, data_fim, 
        horario_inicio, horario_fim, local, vagas_totais,
        projeto_id, responsavel_id, ativa
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
        RETURNING *`,
      [nome, descricao, instrutor, data_inicio, data_fim, horario_inicio, horario_fim, local, vagas_totais, projeto_id, req.user.id, ativa]
    );

    const oficinaFormatada = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);

    console.log(`Oficina criada: ${nome} por ${req.user.email}`);

    res.status(201).json(successResponse(oficinaFormatada, "Oficina criada com sucesso"));

  } catch (error) {
    console.error("Create oficina error:", error);
    res.status(500).json(errorResponse("Erro ao criar oficina"));
  }
});

// Atualizar oficina
router.put('/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      descricao,
      instrutor,
      data_inicio,
      data_fim,
      horario_inicio,
      horario_fim,
      local,
      vagas_totais,
      projeto_id,
      ativa
    } = req.body;

    // Verificar se a oficina existe
    const oficinaCheck = await pool.query(
      "SELECT id FROM oficinas WHERE id = $1 AND ativo = true",
      [id]
    );

    if (oficinaCheck.rows.length === 0) {
      return res.status(404).json(errorResponse("Oficina não encontrada"));
    }

    // Verificar se o projeto existe (se fornecido)
    if (projeto_id) {
      const projetoCheck = await pool.query(
        "SELECT id FROM projetos WHERE id = $1 AND ativo = true",
        [projeto_id]
      );
      if (projetoCheck.rows.length === 0) {
        return res.status(400).json(errorResponse("Projeto não encontrado"));
      }
    }

    const result = await pool.query(
      `UPDATE oficinas SET 
        nome = $1, descricao = $2, instrutor = $3, data_inicio = $4, data_fim = $5,
        horario_inicio = $6, horario_fim = $7, local = $8, vagas_totais = $9,
        projeto_id = $10, ativa = $11, data_atualizacao = NOW()
      WHERE id = $12 AND ativo = true 
      RETURNING *`,
      [nome, descricao, instrutor, data_inicio, data_fim, horario_inicio, horario_fim, local, vagas_totais, projeto_id, ativa, id]
    );

    const oficinaFormatada = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);

    console.log(`Oficina atualizada: ${nome} por ${req.user.email}`);

    res.json(successResponse(oficinaFormatada, "Oficina atualizada com sucesso"));

  } catch (error) {
    console.error("Update oficina error:", error);
    res.status(500).json(errorResponse("Erro ao atualizar oficina"));
  }
});

// Excluir oficina (soft delete)
router.delete('/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE oficinas SET ativo = false, data_atualizacao = NOW() WHERE id = $1 AND ativo = true RETURNING nome',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Oficina não encontrada'));
    }

    console.log(`Oficina excluída: ${result.rows[0].nome} por ${req.user.email}`);

    res.json(successResponse(null, 'Oficina excluída com sucesso'));

  } catch (error) {
    console.error("Delete oficina error:", error);
    res.status(500).json(errorResponse("Erro ao excluir oficina"));
  }
});

// Obter participantes de uma oficina
router.get('/:id/participantes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        b.id, b.nome_completo, b.email, b.telefone,
        p.data_inscricao, p.status_participacao, p.avaliacao
       FROM participacoes p
       JOIN beneficiarias b ON p.beneficiaria_id = b.id
       WHERE p.oficina_id = $1 AND p.ativo = true AND b.ativo = true
       ORDER BY b.nome_completo`,
      [id]
    );

    const participantesFormatados = formatArrayDates(result.rows, ['data_inscricao']);

    res.json(successResponse(participantesFormatados, "Participantes carregados com sucesso"));

  } catch (error) {
    console.error("Get participantes error:", error);
    res.status(500).json(errorResponse("Erro ao buscar participantes"));
  }
});

module.exports = router;
