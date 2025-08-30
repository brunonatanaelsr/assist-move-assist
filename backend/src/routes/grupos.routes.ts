import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';

const router = Router();

// Lista grupos do usuário autenticado
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const result = await pool.query(
      `SELECT g.id, g.nome, g.descricao, g.ativo, g.data_criacao
       FROM grupos g
       JOIN grupo_membros gm ON gm.grupo_id = g.id
       WHERE gm.usuario_id = $1 AND g.ativo = TRUE
       ORDER BY g.nome ASC`,
      [userId]
    );
    res.json(successResponse(result.rows));
    return;
  } catch (error: any) {
    res.status(500).json(errorResponse('Erro ao listar grupos'));
    return;
  }
});

// Detalhe de um grupo (somente membros)
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const groupId = parseInt(String(req.params.id));

    const member = await pool.query(
      `SELECT 1 FROM grupo_membros WHERE grupo_id = $1 AND usuario_id = $2`,
      [groupId, userId]
    );
    if ((member.rowCount || 0) === 0) { res.status(403).json(errorResponse('Acesso negado ao grupo')); return; }

    const result = await pool.query(`SELECT id, nome, descricao, ativo, data_criacao FROM grupos WHERE id = $1`, [groupId]);
    if ((result.rowCount || 0) === 0) { res.status(404).json(errorResponse('Grupo não encontrado')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error: any) {
    res.status(500).json(errorResponse('Erro ao obter grupo'));
    return;
  }
});

// Lista mensagens de um grupo (verifica participação)
router.get('/:id/mensagens', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const groupId = parseInt(String(req.params.id));
    
    const isMember = await pool.query(
      `SELECT 1 FROM grupo_membros WHERE grupo_id = $1 AND usuario_id = $2`,
      [groupId, userId]
    );
    if ((isMember.rowCount || 0) === 0) { res.status(403).json(errorResponse('Acesso negado ao grupo')); return; }

    const result = await pool.query(
      `SELECT id, grupo_id, autor_id, conteudo, data_publicacao AS data_criacao, ativo
       FROM mensagens_grupo
       WHERE grupo_id = $1 AND ativo = TRUE
       ORDER BY data_publicacao DESC
       LIMIT 200`,
      [groupId]
    );
    res.json(successResponse(result.rows));
    return;
  } catch (error: any) {
    res.status(500).json(errorResponse('Erro ao listar mensagens do grupo'));
    return;
  }
});

// Listar membros de um grupo
router.get('/:id/membros', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const groupId = parseInt(String(req.params.id));
    const member = await pool.query(
      `SELECT 1 FROM grupo_membros WHERE grupo_id = $1 AND usuario_id = $2`,
      [groupId, userId]
    );
    if ((member.rowCount || 0) === 0) { res.status(403).json(errorResponse('Acesso negado ao grupo')); return; }
    const result = await pool.query(
      `SELECT gm.usuario_id, gm.papel, u.nome, u.email
       FROM grupo_membros gm
       JOIN usuarios u ON u.id = gm.usuario_id
       WHERE gm.grupo_id = $1
       ORDER BY u.nome ASC`,
      [groupId]
    );
    res.json(successResponse(result.rows));
    return;
  } catch (error: any) {
    res.status(500).json(errorResponse('Erro ao listar membros'));
    return;
  }
});

// Criar grupo (criador vira admin)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const { nome, descricao } = req.body || {};
    if (!nome || String(nome).trim() === '') { res.status(400).json(errorResponse('nome é obrigatório')); return; }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const created = await client.query(
        `INSERT INTO grupos (nome, descricao) VALUES ($1,$2) RETURNING *`,
        [nome, descricao || null]
      );
      const groupId = created.rows[0].id;
      await client.query(
        `INSERT INTO grupo_membros (grupo_id, usuario_id, papel) VALUES ($1,$2,'admin')`,
        [groupId, userId]
      );
      await client.query('COMMIT');
      res.status(201).json(successResponse(created.rows[0]));
      return;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json(errorResponse('Erro ao criar grupo'));
    return;
  }
});

// Atualizar grupo (somente admin)
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const groupId = parseInt(String(req.params.id));
    const { nome, descricao, ativo } = req.body || {};
    const admin = await pool.query(
      `SELECT 1 FROM grupo_membros WHERE grupo_id = $1 AND usuario_id = $2 AND papel IN ('admin','owner')`,
      [groupId, userId]
    );
    if ((admin.rowCount || 0) === 0) { res.status(403).json(errorResponse('Apenas administradores podem atualizar o grupo')); return; }

    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (nome !== undefined) { fields.push(`nome = $${idx++}`); params.push(nome); }
    if (descricao !== undefined) { fields.push(`descricao = $${idx++}`); params.push(descricao); }
    if (ativo !== undefined) { fields.push(`ativo = $${idx++}`); params.push(!!ativo); }
    if (fields.length === 0) { res.json(successResponse({})); return; }
    params.push(groupId);
    const updated = await pool.query(`UPDATE grupos SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(successResponse(updated.rows[0]));
    return;
  } catch (error: any) {
    res.status(500).json(errorResponse('Erro ao atualizar grupo'));
    return;
  }
});

// Excluir (soft delete) grupo (somente admin)
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const groupId = parseInt(String(req.params.id));
    const admin = await pool.query(
      `SELECT 1 FROM grupo_membros WHERE grupo_id = $1 AND usuario_id = $2 AND papel IN ('admin','owner')`,
      [groupId, userId]
    );
    if ((admin.rowCount || 0) === 0) { res.status(403).json(errorResponse('Apenas administradores podem excluir o grupo')); return; }
    await pool.query(`UPDATE grupos SET ativo = FALSE WHERE id = $1`, [groupId]);
    res.status(204).end();
    return;
  } catch (error: any) {
    res.status(500).json(errorResponse('Erro ao excluir grupo'));
    return;
  }
});

// Adicionar membro (somente admin)
router.post('/:id/membros', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const groupId = parseInt(String(req.params.id));
    const { usuario_id, papel } = req.body || {};
    if (!usuario_id) { res.status(400).json(errorResponse('usuario_id é obrigatório')); return; }
    const admin = await pool.query(
      `SELECT 1 FROM grupo_membros WHERE grupo_id = $1 AND usuario_id = $2 AND papel IN ('admin','owner')`,
      [groupId, userId]
    );
    if ((admin.rowCount || 0) === 0) { res.status(403).json(errorResponse('Apenas administradores podem adicionar membros')); return; }
    const added = await pool.query(
      `INSERT INTO grupo_membros (grupo_id, usuario_id, papel)
       VALUES ($1,$2,$3) ON CONFLICT (grupo_id, usuario_id) DO UPDATE SET papel = EXCLUDED.papel
       RETURNING grupo_id, usuario_id, papel`,
      [groupId, Number(usuario_id), papel || 'membro']
    );
    res.status(201).json(successResponse(added.rows[0]));
    return;
  } catch (error: any) {
    res.status(500).json(errorResponse('Erro ao adicionar membro'));
    return;
  }
});

// Remover membro (somente admin)
router.delete('/:id/membros/:usuarioId', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const groupId = parseInt(String(req.params.id));
    const usuarioId = parseInt(String(req.params.usuarioId));
    const admin = await pool.query(
      `SELECT 1 FROM grupo_membros WHERE grupo_id = $1 AND usuario_id = $2 AND papel IN ('admin','owner')`,
      [groupId, userId]
    );
    if ((admin.rowCount || 0) === 0) { res.status(403).json(errorResponse('Apenas administradores podem remover membros')); return; }
    await pool.query(`DELETE FROM grupo_membros WHERE grupo_id = $1 AND usuario_id = $2`, [groupId, usuarioId]);
    res.status(204).end();
    return;
  } catch (error: any) {
    res.status(500).json(errorResponse('Erro ao remover membro'));
    return;
  }
});

export default router;
