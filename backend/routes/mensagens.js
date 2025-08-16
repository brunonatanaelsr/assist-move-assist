const express = require('express');
const { Pool } = require('pg');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '15002031',
});

// ====== ROTAS PARA CONVERSAS ENTRE USUÁRIOS ======

// Listar usuários disponíveis para conversa
router.get('/usuarios', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    const query = `
      SELECT 
        id,
        nome,
        email,
        papel,
        ativo
      FROM usuarios 
      WHERE ativo = true AND id != $1
      ORDER BY nome ASC
    `;
    
    const result = await pool.query(query, [currentUserId]);
    
    res.json(successResponse(result.rows, 'Usuários obtidos'));
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Listar conversas do usuário logado
router.get('/conversas', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    const query = `
      SELECT DISTINCT
        CASE 
          WHEN m.remetente_id = $1 THEN m.destinatario_id
          ELSE m.remetente_id
        END as usuario_id,
        CASE 
          WHEN m.remetente_id = $1 THEN ud.nome
          ELSE ur.nome
        END as usuario_nome,
        CASE 
          WHEN m.remetente_id = $1 THEN ud.email
          ELSE ur.email
        END as usuario_email,
        COUNT(m.id) as total_mensagens,
        COUNT(CASE WHEN m.lida = false AND m.destinatario_id = $1 THEN 1 END) as nao_lidas,
        MAX(m.data_criacao) as ultima_mensagem_data,
        (SELECT m2.conteudo 
         FROM mensagens m2 
         WHERE ((m2.remetente_id = $1 AND m2.destinatario_id = 
           CASE WHEN m.remetente_id = $1 THEN m.destinatario_id ELSE m.remetente_id END)
           OR (m2.destinatario_id = $1 AND m2.remetente_id = 
           CASE WHEN m.remetente_id = $1 THEN m.destinatario_id ELSE m.remetente_id END))
         AND m2.ativo = true
         ORDER BY m2.data_criacao DESC 
         LIMIT 1) as ultima_mensagem
      FROM mensagens m
      LEFT JOIN usuarios ur ON m.remetente_id = ur.id
      LEFT JOIN usuarios ud ON m.destinatario_id = ud.id
      WHERE (m.remetente_id = $1 OR m.destinatario_id = $1)
        AND m.ativo = true
        AND m.beneficiaria_id IS NULL
      GROUP BY 
        CASE WHEN m.remetente_id = $1 THEN m.destinatario_id ELSE m.remetente_id END,
        CASE WHEN m.remetente_id = $1 THEN ud.nome ELSE ur.nome END,
        CASE WHEN m.remetente_id = $1 THEN ud.email ELSE ur.email END
      ORDER BY MAX(m.data_criacao) DESC
    `;
    
    const result = await pool.query(query, [currentUserId]);
    
    res.json(successResponse(result.rows, 'Conversas obtidas'));
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Obter mensagens de uma conversa específica
router.get('/conversa/:usuarioId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { usuarioId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        m.*,
        ur.nome as remetente_nome,
        ur.email as remetente_email,
        ud.nome as destinatario_nome,
        ud.email as destinatario_email
      FROM mensagens m
      LEFT JOIN usuarios ur ON m.remetente_id = ur.id
      LEFT JOIN usuarios ud ON m.destinatario_id = ud.id
      WHERE ((m.remetente_id = $1 AND m.destinatario_id = $2)
        OR (m.remetente_id = $2 AND m.destinatario_id = $1))
        AND m.ativo = true
        AND m.beneficiaria_id IS NULL
      ORDER BY m.data_criacao ASC
      LIMIT $3 OFFSET $4
    `;
    
    const result = await pool.query(query, [currentUserId, usuarioId, limit, offset]);
    
    // Marcar mensagens como lidas
    await pool.query(`
      UPDATE mensagens 
      SET lida = true, data_leitura = CURRENT_TIMESTAMP, data_atualizacao = CURRENT_TIMESTAMP
      WHERE remetente_id = $1 AND destinatario_id = $2 AND lida = false AND ativo = true
    `, [usuarioId, currentUserId]);
    
    res.json(successResponse(result.rows, 'Mensagens da conversa obtidas'));
  } catch (error) {
    console.error('Erro ao buscar mensagens da conversa:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Enviar mensagem para um usuário
router.post('/enviar', authenticateToken, async (req, res) => {
  try {
    const { destinatario_id, conteudo, tipo = 'mensagem', prioridade = 'normal' } = req.body;
    const remetente_id = req.user.id;
    
    if (!destinatario_id || !conteudo?.trim()) {
      return res.status(400).json(errorResponse('Destinatário e conteúdo são obrigatórios'));
    }
    
    // Verificar se o destinatário existe e está ativo
    const userCheck = await pool.query('SELECT id FROM usuarios WHERE id = $1 AND ativo = true', [destinatario_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json(errorResponse('Usuário destinatário não encontrado'));
    }
    
    const query = `
      INSERT INTO mensagens (
        assunto, conteudo, tipo, prioridade, remetente_id, destinatario_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      'Mensagem direta', // assunto padrão para mensagens diretas
      conteudo.trim(),
      tipo,
      prioridade,
      remetente_id,
      destinatario_id
    ]);
    
    // Buscar dados completos da mensagem criada
    const fullMessageQuery = `
      SELECT 
        m.*,
        ur.nome as remetente_nome,
        ur.email as remetente_email,
        ud.nome as destinatario_nome,
        ud.email as destinatario_email
      FROM mensagens m
      LEFT JOIN usuarios ur ON m.remetente_id = ur.id
      LEFT JOIN usuarios ud ON m.destinatario_id = ud.id
      WHERE m.id = $1
    `;
    
    const fullResult = await pool.query(fullMessageQuery, [result.rows[0].id]);
    
    res.status(201).json(successResponse(fullResult.rows[0], 'Mensagem enviada'));
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Listar todas as mensagens
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, tipo, prioridade, lida } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = ['m.ativo = true'];
    let queryParams = [];
    let paramIndex = 1;

    if (tipo) {
      whereConditions.push(`m.tipo = $${paramIndex++}`);
      queryParams.push(tipo);
    }

    if (prioridade) {
      whereConditions.push(`m.prioridade = $${paramIndex++}`);
      queryParams.push(prioridade);
    }

    if (lida !== undefined) {
      whereConditions.push(`m.lida = $${paramIndex++}`);
      queryParams.push(lida === 'true');
    }

    const whereClause = whereConditions.join(' AND ');
    
    const query = `
      SELECT 
        m.*,
        ur.nome as remetente_nome,
        ud.nome as destinatario_nome,
        b.nome_completo as beneficiaria_nome
      FROM mensagens m
      LEFT JOIN usuarios ur ON m.remetente_id = ur.id
      LEFT JOIN usuarios ud ON m.destinatario_id = ud.id
      LEFT JOIN beneficiarias b ON m.beneficiaria_id = b.id
      WHERE ${whereClause}
      ORDER BY m.data_criacao DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    queryParams.push(limit, offset);
    
    const result = await pool.query(query, queryParams);
    
    // Contar total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM mensagens m 
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    res.json(successResponse(result.rows, "Mensagens carregadas com sucesso", {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }));

  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json(errorResponse('Erro ao carregar mensagens'));
  }
});

// Buscar mensagem por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        m.*,
        ur.nome as remetente_nome,
        ud.nome as destinatario_nome,
        b.nome_completo as beneficiaria_nome
      FROM mensagens m
      LEFT JOIN usuarios ur ON m.remetente_id = ur.id
      LEFT JOIN usuarios ud ON m.destinatario_id = ud.id
      LEFT JOIN beneficiarias b ON m.beneficiaria_id = b.id
      WHERE m.id = $1 AND m.ativo = true
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Mensagem não encontrada'));
    }
    
    res.json(successResponse(result.rows[0], "Mensagem carregada com sucesso"));

  } catch (error) {
    console.error('Erro ao buscar mensagem:', error);
    res.status(500).json(errorResponse('Erro ao carregar mensagem'));
  }
});

// Criar nova mensagem
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      assunto,
      conteudo,
      tipo = 'mensagem',
      prioridade = 'normal',
      destinatario_id,
      beneficiaria_id,
      anexos = [],
      tags = []
    } = req.body;

    if (!assunto || !conteudo) {
      return res.status(400).json(errorResponse('Assunto e conteúdo são obrigatórios'));
    }

    const query = `
      INSERT INTO mensagens (
        assunto, conteudo, tipo, prioridade, 
        remetente_id, destinatario_id, beneficiaria_id,
        anexos, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      assunto,
      conteudo,
      tipo,
      prioridade,
      req.user.id, // remetente é o usuário autenticado
      destinatario_id,
      beneficiaria_id,
      anexos,
      tags
    ];

    const result = await pool.query(query, values);
    
    res.status(201).json(successResponse(result.rows[0], "Mensagem enviada com sucesso"));

  } catch (error) {
    console.error('Erro ao criar mensagem:', error);
    res.status(500).json(errorResponse('Erro ao enviar mensagem'));
  }
});

// Marcar mensagem como lida
router.patch('/:id/lida', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { lida = true } = req.body;

    const query = `
      UPDATE mensagens 
      SET lida = $1, data_leitura = $2, data_atualizacao = NOW()
      WHERE id = $3 AND ativo = true
      RETURNING *
    `;

    const values = [lida, lida ? new Date() : null, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Mensagem não encontrada'));
    }

    res.json(successResponse(result.rows[0], "Status de leitura atualizado"));

  } catch (error) {
    console.error('Erro ao atualizar mensagem:', error);
    res.status(500).json(errorResponse('Erro ao atualizar mensagem'));
  }
});

// Buscar conversas agrupadas por beneficiária
router.get('/conversas/beneficiarias', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        b.id as beneficiaria_id,
        b.nome_completo as beneficiaria_nome,
        COUNT(m.id) as total_mensagens,
        COUNT(CASE WHEN NOT m.lida THEN 1 END) as nao_lidas,
        MAX(m.data_criacao) as ultima_mensagem_data,
        (
          SELECT m2.assunto 
          FROM mensagens m2 
          WHERE m2.beneficiaria_id = b.id AND m2.ativo = true
          ORDER BY m2.data_criacao DESC 
          LIMIT 1
        ) as ultimo_assunto
      FROM beneficiarias b
      LEFT JOIN mensagens m ON b.id = m.beneficiaria_id AND m.ativo = true
      WHERE b.ativo = true
      GROUP BY b.id, b.nome_completo
      HAVING COUNT(m.id) > 0
      ORDER BY MAX(m.data_criacao) DESC
    `;

    const result = await pool.query(query);
    
    res.json(successResponse(result.rows, "Conversas carregadas com sucesso"));

  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json(errorResponse('Erro ao carregar conversas'));
  }
});

// Buscar mensagens de uma beneficiária específica
router.get('/conversas/beneficiaria/:beneficiariaId', authenticateToken, async (req, res) => {
  try {
    const { beneficiariaId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        m.*,
        ur.nome as remetente_nome,
        ud.nome as destinatario_nome,
        b.nome_completo as beneficiaria_nome
      FROM mensagens m
      LEFT JOIN usuarios ur ON m.remetente_id = ur.id
      LEFT JOIN usuarios ud ON m.destinatario_id = ud.id
      LEFT JOIN beneficiarias b ON m.beneficiaria_id = b.id
      WHERE m.beneficiaria_id = $1 AND m.ativo = true
      ORDER BY m.data_criacao DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [beneficiariaId, limit, offset]);
    
    res.json(successResponse(result.rows, "Mensagens da conversa carregadas com sucesso"));

  } catch (error) {
    console.error('Erro ao buscar mensagens da conversa:', error);
    res.status(500).json(errorResponse('Erro ao carregar mensagens da conversa'));
  }
});

// Deletar mensagem (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE mensagens 
      SET ativo = false, data_atualizacao = NOW()
      WHERE id = $1 AND ativo = true
      RETURNING id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Mensagem não encontrada'));
    }

    res.json(successResponse({ id: result.rows[0].id }, "Mensagem removida com sucesso"));

  } catch (error) {
    console.error('Erro ao remover mensagem:', error);
    res.status(500).json(errorResponse('Erro ao remover mensagem'));
  }
});

module.exports = router;
