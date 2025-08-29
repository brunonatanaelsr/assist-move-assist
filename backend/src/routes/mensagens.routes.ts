import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';

const router = Router();

// Conexões SSE por usuário
const sseClients = new Map<number, Response>();

// GET /mensagens/usuarios - lista usuários para conversar
router.get('/usuarios', authenticateToken, async (_req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query('SELECT id, nome, email, papel as role FROM usuarios WHERE ativo = true ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar usuários'));
  }
});

// GET /mensagens/conversas - últimas conversas do usuário
router.get('/conversas', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.user!.id);
    const result = await pool.query(
      `SELECT m.* FROM mensagens_usuario m
       WHERE (m.autor_id = $1 OR m.destinatario_id = $1) AND m.ativo = true
       ORDER BY m.data_publicacao DESC
       LIMIT 200`,
      [userId]
    );
    res.json(successResponse(result.rows));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar conversas'));
  }
});

// GET /mensagens/conversa/:usuarioId - thread entre usuário e :usuarioId
router.get('/conversa/:usuarioId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.user!.id);
    const { usuarioId } = req.params as any;
    const result = await pool.query(
      `SELECT * FROM mensagens_usuario 
       WHERE ativo = true AND (
         (autor_id = $1 AND destinatario_id = $2) OR
         (autor_id = $2 AND destinatario_id = $1)
       )
       ORDER BY data_publicacao ASC`,
      [userId, usuarioId]
    );
    res.json(successResponse(result.rows));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter conversa'));
  }
});

// POST /mensagens/enviar - enviar mensagem
router.post('/enviar', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const autorId = Number(req.user!.id);
    const { destinatario_id, conteudo } = req.body || {};
    if (!destinatario_id || !conteudo) return res.status(400).json(errorResponse('destinatario_id e conteudo são obrigatórios'));
    const result = await pool.query(
      `INSERT INTO mensagens_usuario (autor_id, destinatario_id, conteudo)
       VALUES ($1,$2,$3) RETURNING *`,
      [autorId, destinatario_id, conteudo]
    );
    // Notificar via SSE
    const client = sseClients.get(Number(destinatario_id));
    if (client) client.write(`data: ${JSON.stringify(result.rows[0])}\n\n`);
    res.status(201).json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao enviar mensagem'));
  }
});

// PATCH /mensagens/:id/lida
router.patch('/:id/lida', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params as any;
    const { lida } = req.body || {};
    await pool.query('UPDATE mensagens_usuario SET lida = COALESCE($1, lida) WHERE id = $2', [lida === undefined ? true : !!lida, id]);
    res.json(successResponse({ id, lida: lida === undefined ? true : !!lida }));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao marcar mensagem como lida'));
  }
});

// DELETE /mensagens/:id
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params as any;
    await pool.query('UPDATE mensagens_usuario SET ativo = false WHERE id = $1', [id]);
    res.status(204).end();
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao excluir mensagem'));
  }
});

// GET /mensagens/stream - SSE
router.get('/stream', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = Number(req.user!.id);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  sseClients.set(userId, res);
  const interval = setInterval(() => {
    res.write(`event: ping\n`);
    res.write(`data: ${Date.now()}\n\n`);
  }, 25000);
  req.on('close', () => {
    clearInterval(interval);
    sseClients.delete(userId);
  });
});

export default router;

