const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo não permitido'), false);
    }
  }
});

// ====== ROTAS PARA SISTEMA DE CHAT COMPLETO ======

// Upload de arquivo
router.post('/upload', authenticateToken, upload.single('arquivo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse('Nenhum arquivo foi enviado'));
    }

    const fileInfo = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`
    };

    res.json(successResponse(fileInfo, 'Arquivo enviado com sucesso'));
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Buscar usuários para chat
router.get('/usuarios/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;
    
    if (!q || q.length < 2) {
      return res.json(successResponse([], 'Digite pelo menos 2 caracteres'));
    }
    
    const query = `
      SELECT 
        id,
        nome,
        email,
        papel
      FROM usuarios 
      WHERE ativo = true 
        AND id != $1
        AND (nome ILIKE $2 OR email ILIKE $2)
      ORDER BY nome ASC
      LIMIT 20
    `;
    
    const result = await pool.query(query, [currentUserId, `%${q}%`]);
    
    res.json(successResponse(result.rows, 'Usuários encontrados'));
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Listar conversas 1:1 do usuário
router.get('/conversas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      WITH ultimas_mensagens AS (
        SELECT DISTINCT ON (
          CASE 
            WHEN remetente_id = $1 THEN destinatario_id 
            ELSE remetente_id 
          END
        ) 
        id, remetente_id, destinatario_id, conteudo, data_criacao,
        CASE 
          WHEN remetente_id = $1 THEN destinatario_id 
          ELSE remetente_id 
        END as outro_usuario_id
        FROM mensagens
        WHERE (remetente_id = $1 OR destinatario_id = $1)
          AND grupo_id IS NULL
          AND ativo = true
        ORDER BY outro_usuario_id, data_criacao DESC
      )
      SELECT 
        m.outro_usuario_id as usuario_id,
        u.nome as usuario_nome,
        u.email as usuario_email,
        COUNT(m2.id) as total_mensagens,
        COUNT(CASE WHEN m2.destinatario_id = $1 AND m2.lida = false THEN 1 END) as nao_lidas,
        m.data_criacao as ultima_mensagem_data,
        m.conteudo as ultima_mensagem
      FROM ultimas_mensagens m
      JOIN usuarios u ON u.id = m.outro_usuario_id
      LEFT JOIN mensagens m2 ON (
        (m2.remetente_id = $1 AND m2.destinatario_id = u.id) OR 
        (m2.remetente_id = u.id AND m2.destinatario_id = $1)
      ) AND m2.grupo_id IS NULL AND m2.ativo = true
      WHERE u.ativo = true
      GROUP BY m.outro_usuario_id, u.nome, u.email, m.data_criacao, m.conteudo
      ORDER BY m.data_criacao DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json(successResponse(result.rows, 'Conversas obtidas'));
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Listar grupos do usuário
router.get('/grupos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        g.id as grupo_id,
        g.nome,
        g.descricao,
        g.criador_id,
        g.tipo,
        g.data_criacao,
        (SELECT COUNT(*) FROM mensagens m
         WHERE m.grupo_id = g.id
           AND m.remetente_id != $1
           AND m.ativo = true
           AND m.data_criacao > COALESCE(
             (SELECT data_leitura FROM mensagens m2
              WHERE m2.grupo_id = g.id AND m2.destinatario_id = $1
              ORDER BY m2.data_leitura DESC LIMIT 1),
             '1900-01-01'::timestamp)
        ) as nao_lidas,
        (SELECT m.conteudo FROM mensagens m 
         WHERE m.grupo_id = g.id AND m.ativo = true 
         ORDER BY m.data_criacao DESC LIMIT 1) as ultima_mensagem,
        (SELECT m.data_criacao FROM mensagens m 
         WHERE m.grupo_id = g.id AND m.ativo = true 
         ORDER BY m.data_criacao DESC LIMIT 1) as data_ultima_mensagem,
        pg.papel as meu_papel
      FROM grupos_conversa g
      JOIN participantes_grupo pg ON g.id = pg.grupo_id
      WHERE pg.usuario_id = $1
        AND pg.ativo = true
        AND g.ativo = true
      ORDER BY data_ultima_mensagem DESC NULLS LAST
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json(successResponse(result.rows, 'Grupos obtidos'));
  } catch (error) {
    console.error('Erro ao buscar grupos:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Obter histórico de mensagens 1:1
router.get('/conversa/:usuarioId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { usuarioId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        m.*,
        ur.nome as remetente_nome
      FROM mensagens m
      LEFT JOIN usuarios ur ON m.remetente_id = ur.id
      WHERE ((m.remetente_id = $1 AND m.destinatario_id = $2)
        OR (m.remetente_id = $2 AND m.destinatario_id = $1))
        AND m.ativo = true
        AND m.grupo_id IS NULL
      ORDER BY m.data_criacao DESC
      LIMIT $3 OFFSET $4
    `;
    
    const result = await pool.query(query, [currentUserId, usuarioId, limit, offset]);
    
    // Marcar mensagens como lidas
    await pool.query(`
      UPDATE mensagens 
      SET lida = true, data_leitura = NOW()
      WHERE remetente_id = $1 AND destinatario_id = $2 AND lida = false AND ativo = true AND grupo_id IS NULL
    `, [usuarioId, currentUserId]);
    
    res.json(successResponse(result.rows, 'Histórico de mensagens obtido'));
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Obter mensagens de grupo
router.get('/grupo/:grupoId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { grupoId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    // Verificar se o usuário faz parte do grupo
    const participantCheck = await pool.query(
      'SELECT id FROM participantes_grupo WHERE grupo_id = $1 AND usuario_id = $2 AND ativo = true',
      [grupoId, userId]
    );
    
    if (participantCheck.rows.length === 0) {
      return res.status(403).json(errorResponse('Acesso negado ao grupo'));
    }
    
    const query = `
      SELECT 
        m.*,
        ur.nome as remetente_nome
      FROM mensagens m
      LEFT JOIN usuarios ur ON m.remetente_id = ur.id
      WHERE m.grupo_id = $1
        AND m.ativo = true
      ORDER BY m.data_criacao DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [grupoId, limit, offset]);
    
    res.json(successResponse(result.rows, 'Mensagens do grupo obtidas'));
  } catch (error) {
    console.error('Erro ao buscar mensagens do grupo:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Enviar mensagem
router.post('/enviar', authenticateToken, async (req, res) => {
  try {
    const { destinatario_id, grupo_id, conteudo, anexos } = req.body;
    const remetente_id = req.user.id;
    
    if (!conteudo?.trim() && (!anexos || anexos.length === 0)) {
      return res.status(400).json(errorResponse('Mensagem deve ter conteúdo ou anexo'));
    }
    
    // Validar se é mensagem 1:1 ou grupo
    if (destinatario_id && grupo_id) {
      return res.status(400).json(errorResponse('Mensagem deve ser para usuário OU grupo, não ambos'));
    }
    
    if (!destinatario_id && !grupo_id) {
      return res.status(400).json(errorResponse('Destinatário ou grupo é obrigatório'));
    }
    
    // Se for para grupo, verificar participação
    if (grupo_id) {
      const participantCheck = await pool.query(
        'SELECT id FROM participantes_grupo WHERE grupo_id = $1 AND usuario_id = $2 AND ativo = true',
        [grupo_id, remetente_id]
      );
      
      if (participantCheck.rows.length === 0) {
        return res.status(403).json(errorResponse('Você não faz parte deste grupo'));
      }
    }
    
    // Se for para usuário, verificar se existe
    if (destinatario_id) {
      const userCheck = await pool.query(
        'SELECT id FROM usuarios WHERE id = $1 AND ativo = true',
        [destinatario_id]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json(errorResponse('Usuário destinatário não encontrado'));
      }
    }
    
    const query = `
      INSERT INTO mensagens (
        remetente_id, destinatario_id, grupo_id, conteudo, anexos, tipo, ativo
      ) VALUES ($1, $2, $3, $4, $5, 'mensagem', true)
      RETURNING id, remetente_id, destinatario_id, grupo_id, conteudo, anexos, data_criacao, lida
    `;
    
    const result = await pool.query(query, [
      remetente_id,
      destinatario_id || null,
      grupo_id || null,
      conteudo?.trim() || '',
      anexos || null
    ]);
    
    // Buscar nome do remetente
    const remetenteResult = await pool.query(
      'SELECT nome FROM usuarios WHERE id = $1',
      [remetente_id]
    );
    
    const mensagem = {
      ...result.rows[0],
      remetente_nome: remetenteResult.rows[0]?.nome || 'Usuário'
    };
    
    res.status(201).json(successResponse(mensagem, 'Mensagem enviada'));
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Buscar mensagens
router.get('/buscar', authenticateToken, async (req, res) => {
  try {
    const { q, tipo = 'all' } = req.query;
    const userId = req.user.id;
    
    if (!q || q.length < 2) {
      return res.json(successResponse([], 'Digite pelo menos 2 caracteres'));
    }
    
    let whereClause = `
      WHERE m.ativo = true 
        AND m.conteudo ILIKE $2
        AND (
          (m.remetente_id = $1 OR m.destinatario_id = $1)
          OR (m.grupo_id IN (
            SELECT grupo_id FROM participantes_grupo 
            WHERE usuario_id = $1 AND ativo = true
          ))
        )
    `;
    
    if (tipo === 'private') {
      whereClause += ' AND m.grupo_id IS NULL';
    } else if (tipo === 'group') {
      whereClause += ' AND m.grupo_id IS NOT NULL';
    }
    
    const query = `
      SELECT 
        m.*,
        ur.nome as remetente_nome,
        ud.nome as destinatario_nome,
        g.nome as grupo_nome
      FROM mensagens m
      LEFT JOIN usuarios ur ON m.remetente_id = ur.id
      LEFT JOIN usuarios ud ON m.destinatario_id = ud.id
      LEFT JOIN grupos_conversa g ON m.grupo_id = g.id
      ${whereClause}
      ORDER BY m.data_criacao DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [userId, `%${q}%`]);
    
    res.json(successResponse(result.rows, 'Resultados da busca'));
  } catch (error) {
    console.error('Erro na busca:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Criar grupo
router.post('/grupos', authenticateToken, async (req, res) => {
  try {
    const { nome, descricao, tipo = 'privado', participantes = [] } = req.body;
    const criadorId = req.user.id;
    
    if (!nome?.trim()) {
      return res.status(400).json(errorResponse('Nome do grupo é obrigatório'));
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Criar grupo
      const grupoResult = await client.query(
        `INSERT INTO grupos_conversa (nome, descricao, criador_id, tipo) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [nome.trim(), descricao?.trim() || '', criadorId, tipo]
      );
      
      const grupoId = grupoResult.rows[0].id;
      
      // Adicionar criador como admin
      await client.query(
        `INSERT INTO participantes_grupo (grupo_id, usuario_id, papel, adicionado_por) 
         VALUES ($1, $2, 'admin', $3)`,
        [grupoId, criadorId, criadorId]
      );
      
      // Adicionar outros participantes
      for (const participanteId of participantes) {
        if (participanteId !== criadorId) {
          await client.query(
            `INSERT INTO participantes_grupo (grupo_id, usuario_id, papel, adicionado_por) 
             VALUES ($1, $2, 'membro', $3)`,
            [grupoId, participanteId, criadorId]
          );
        }
      }
      
      await client.query('COMMIT');
      
      res.status(201).json(successResponse({ grupo_id: grupoId }, 'Grupo criado com sucesso'));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao criar grupo:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Adicionar participante ao grupo
router.post('/grupos/:grupoId/participantes', authenticateToken, async (req, res) => {
  try {
    const { grupoId } = req.params;
    const { usuario_id } = req.body;
    const userId = req.user.id;
    
    // Verificar se o usuário é admin do grupo
    const adminCheck = await pool.query(
      `SELECT id FROM participantes_grupo 
       WHERE grupo_id = $1 AND usuario_id = $2 AND papel = 'admin' AND ativo = true`,
      [grupoId, userId]
    );
    
    if (adminCheck.rows.length === 0) {
      return res.status(403).json(errorResponse('Apenas administradores podem adicionar participantes'));
    }
    
    // Verificar se o usuário já faz parte do grupo
    const existingCheck = await pool.query(
      'SELECT id FROM participantes_grupo WHERE grupo_id = $1 AND usuario_id = $2',
      [grupoId, usuario_id]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(409).json(errorResponse('Usuário já faz parte do grupo'));
    }
    
    // Adicionar participante
    await pool.query(
      `INSERT INTO participantes_grupo (grupo_id, usuario_id, papel, adicionado_por) 
       VALUES ($1, $2, 'membro', $3)`,
      [grupoId, usuario_id, userId]
    );
    
    res.json(successResponse({}, 'Participante adicionado ao grupo'));
  } catch (error) {
    console.error('Erro ao adicionar participante:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// Marcar mensagem como lida
router.patch('/:id/lida', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      `UPDATE mensagens 
       SET lida = true, data_leitura = NOW()
       WHERE id = $1 AND destinatario_id = $2 AND ativo = true
       RETURNING id`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Mensagem não encontrada ou acesso negado'));
    }
    
    res.json(successResponse({}, 'Mensagem marcada como lida'));
  } catch (error) {
    console.error('Erro ao marcar como lida:', error);
    res.status(500).json(errorResponse('Erro interno do servidor'));
  }
});

// ====== ROTAS ANTIGAS (COMPATIBILIDADE) ======

// Listar usuários disponíveis para conversa (rota antiga)
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

// Listar todas as mensagens (rota antiga)
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

module.exports = router;
