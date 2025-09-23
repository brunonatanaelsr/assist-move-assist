import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest, authorize } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import redis from '../lib/redis';
import bcrypt from 'bcryptjs';

const router = Router();

const invalidateUserPermissionCache = async (userId: number) => {
  try {
    const keys = await (redis as any).keys(`perms:user:${userId}:*`);
    if (keys && keys.length) {
      await (redis as any).del(...keys);
    }
  } catch {}
  try {
    await redis.del(`perms:user:${userId}`);
  } catch {}
};

// Usuários
router.get('/usuarios', authenticateToken, authorize('users.manage'), async (_req, res) => {
  try {
    const limit = parseInt(String((_req.query as any).limit || '20'), 10);
    const page = parseInt(String((_req.query as any).page || '1'), 10);
    const search = String((_req.query as any).search || '').trim();
    const where: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (search) {
      where.push(`(email ILIKE $${idx} OR nome ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    const sql = `SELECT id, email, nome, papel, ativo, avatar_url, cargo, departamento, bio, telefone, data_criacao,
                        COUNT(*) OVER() as total_count
                 FROM usuarios ${whereSql}
                 ORDER BY id ASC
                 LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(limit, offset);
    const r = await pool.query(sql, params);
    const total = parseInt(r.rows[0]?.total_count || '0', 10);
    res.json(successResponse({ data: r.rows, pagination: { page, limit, total } }));
    return;
  } catch (e) {
    res.status(500).json(errorResponse('Erro ao listar usuários'));
    return;
  }
});

router.post('/usuarios', authenticateToken, authorize('users.manage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { email, password, nome, papel } = (authReq.body ?? {}) as Record<string, any>;
    if (!email || !password || !nome) { res.status(400).json(errorResponse('email, password e nome são obrigatórios')); return; }
    const hash = await bcrypt.hash(password, 12);
    const created = await pool.query(
      `INSERT INTO usuarios (email, senha_hash, nome, papel, ativo, data_criacao, data_atualizacao)
       VALUES ($1,$2,$3,COALESCE($4,'user'),true,NOW(),NOW()) RETURNING id, email, nome, papel, ativo`,
      [String(email).toLowerCase(), hash, nome, papel]
    );
    res.status(201).json(successResponse(created.rows[0]));
    return;
  } catch (e: any) {
    if (String(e.message || '').includes('usuarios_email_key')) { res.status(409).json(errorResponse('Email já existente')); return; }
    res.status(500).json(errorResponse('Erro ao criar usuário'));
    return;
  }
});

router.put('/usuarios/:id', authenticateToken, authorize('users.manage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = authReq.params as any;
    const { nome, papel, ativo, cargo, departamento, bio, telefone, avatar_url } = (authReq.body ?? {}) as Record<string, any>;
    // Capturar papel antigo
    const prev = await pool.query('SELECT papel FROM usuarios WHERE id = $1', [id]);
    const oldRole = prev.rows[0]?.papel || null;
    const r = await pool.query(
      `UPDATE usuarios SET 
         nome = COALESCE($2,nome),
         papel = COALESCE($3,papel),
         ativo = COALESCE($4,ativo),
         cargo = COALESCE($5,cargo),
         departamento = COALESCE($6,departamento),
         bio = COALESCE($7,bio),
         telefone = COALESCE($8,telefone),
         avatar_url = COALESCE($9,avatar_url),
         data_atualizacao = NOW()
       WHERE id = $1 RETURNING id, email, nome, papel, ativo, cargo, departamento, bio, telefone, avatar_url`,
      [id, nome, papel, ativo, cargo, departamento, bio, telefone, avatar_url]
    );
    if (r.rowCount === 0) { res.status(404).json(errorResponse('Usuário não encontrado')); return; }
    // Invalida cache de permissões do usuário
    await invalidateUserPermissionCache(Number(id));
    // Se papel mudou, invalida cache do papel novo e antigo
    const newRole = r.rows[0].papel;
    if (newRole && newRole !== oldRole) {
      try { await redis.del(`perms:role:${newRole}`); } catch {}
      if (oldRole) { try { await redis.del(`perms:role:${oldRole}`); } catch {} }
    }
    res.json(successResponse(r.rows[0]));
    return;
  } catch {
    res.status(500).json(errorResponse('Erro ao atualizar usuário'));
    return;
  }
});

router.post('/usuarios/:id/reset-password', authenticateToken, authorize('users.manage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = authReq.params as any;
    const { newPassword } = (authReq.body ?? {}) as Record<string, any>;
    if (!newPassword || String(newPassword).length < 6) { res.status(400).json(errorResponse('Nova senha inválida')); return; }
    const hash = await bcrypt.hash(String(newPassword), 12);
    await pool.query('UPDATE usuarios SET senha_hash = $1, data_atualizacao = NOW() WHERE id = $2', [hash, id]);
    res.json(successResponse({ id }));
    return;
  } catch {
    res.status(500).json(errorResponse('Erro ao redefinir senha'));
    return;
  }
});

// Permissões e papéis
router.get('/permissions', authenticateToken, authorize('roles.manage'), async (_req, res) => {
  try {
    const limit = parseInt(String((_req.query as any).limit || '50'), 10);
    const page = parseInt(String((_req.query as any).page || '1'), 10);
    const search = String((_req.query as any).search || '').trim();
    const where: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (search) { where.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (Math.max(1,page)-1)*Math.max(1,limit);
    const sql = `SELECT name, description, COUNT(*) OVER() as total_count FROM permissions ${whereSql} ORDER BY name LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(limit, offset);
    const r = await pool.query(sql, params);
    const total = parseInt(r.rows[0]?.total_count || '0', 10);
    res.json(successResponse({ data: r.rows.map((x:any)=>({ name: x.name, description: x.description })), pagination: { page, limit, total } }));
    return;
  } catch {
    res.status(500).json(errorResponse('Erro ao listar permissões'));
    return;
  }
});

router.post('/permissions', authenticateToken, authorize('roles.manage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { name, description } = (authReq.body ?? {}) as Record<string, any>;
    if (!name) { res.status(400).json(errorResponse('name é obrigatório')); return; }
    await pool.query('INSERT INTO permissions (name, description) VALUES ($1,$2) ON CONFLICT DO NOTHING', [name, description || null]);
    // Invalida todos os caches de papel, pois lista de permissions mudou
    try {
      const keys = await (redis as any).keys('perms:role:*');
      if (keys && keys.length) { await (redis as any).del(...keys); }
    } catch {}
    res.status(201).json(successResponse({ name, description }));
    return;
  } catch {
    res.status(500).json(errorResponse('Erro ao criar permissão'));
    return;
  }
});

router.get('/roles', authenticateToken, authorize('roles.manage'), async (_req, res) => {
  try {
    const a = await pool.query('SELECT DISTINCT papel as role FROM usuarios');
    const b = await pool.query('SELECT DISTINCT role FROM role_permissions');
    const set = new Set([...(a.rows||[]).map(r=>r.role), ...(b.rows||[]).map(r=>r.role)]);
    res.json(successResponse(Array.from(set).filter(Boolean)));
    return;
  } catch {
    res.status(500).json(errorResponse('Erro ao listar papéis'));
    return;
  }
});

router.get('/roles/:role/permissions', authenticateToken, authorize('roles.manage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { role } = authReq.params as any;
    const r = await pool.query('SELECT permission FROM role_permissions WHERE role = $1 ORDER BY permission', [role]);
    res.json(successResponse(r.rows.map(x => x.permission)));
    return;
  } catch {
    res.status(500).json(errorResponse('Erro ao obter permissões do papel'));
    return;
  }
});

router.put('/roles/:role/permissions', authenticateToken, authorize('roles.manage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { role } = authReq.params as any;
    const { permissions } = (authReq.body ?? {}) as Record<string, any>;
    if (!Array.isArray(permissions)) { res.status(400).json(errorResponse('permissions deve ser array')); return; }
  await pool.query('DELETE FROM role_permissions WHERE role = $1', [role]);
  for (const p of permissions) {
    await pool.query('INSERT INTO role_permissions (role, permission) VALUES ($1,$2) ON CONFLICT DO NOTHING', [role, p]);
  }
  try { await redis.del(`perms:role:${role}`); } catch {}
  res.json(successResponse({ role, permissions }));
    return;
  } catch {
    res.status(500).json(errorResponse('Erro ao atualizar permissões do papel'));
    return;
  }
});

// ---- Permissões por usuário ----
router.get('/usuarios/:id/permissions', authenticateToken, authorize('users.manage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = authReq.params as any;
    const scopeType = String((authReq.query as any).scopeType || (authReq.query as any).scope_type || '').trim();
    const scopeIdRaw = (authReq.query as any).scopeId ?? (authReq.query as any).scope_id;

    const params: Array<string | number> = [id];
    let sql = 'SELECT permission, projeto_id, oficina_id FROM user_permissions WHERE user_id = $1';

    if (scopeType) {
      if (!scopeIdRaw && scopeIdRaw !== 0) {
        res.status(400).json(errorResponse('scopeId é obrigatório quando scopeType é informado'));
        return;
      }
      const scopeId = Number(scopeIdRaw);
      if (!Number.isFinite(scopeId)) {
        res.status(400).json(errorResponse('scopeId inválido'));
        return;
      }

      if (scopeType === 'project' || scopeType === 'projeto') {
        sql += ' AND projeto_id = $2';
        params.push(scopeId);
      } else if (scopeType === 'oficina') {
        sql += ' AND oficina_id = $2';
        params.push(scopeId);
      } else {
        res.status(400).json(errorResponse('scopeType inválido'));
        return;
      }
    }

    const r = await pool.query(sql, params);
    res.json(
      successResponse(
        r.rows.map((row: any) => ({
          permission: row.permission,
          projeto_id: row.projeto_id,
          oficina_id: row.oficina_id
        }))
      )
    );
    return;
  } catch {
    res.status(500).json(errorResponse('Erro ao obter permissões do usuário'));
    return;
  }
});

router.put('/usuarios/:id/permissions', authenticateToken, authorize('users.manage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = authReq.params as any;
    const { permissions, scopeType, scopeId } = (authReq.body ?? {}) as Record<string, any>;
    if (!Array.isArray(permissions)) {
      res.status(400).json(errorResponse('permissions deve ser array'));
      return;
    }

    let normalizedScope: 'project' | 'oficina' | null = null;
    let scopeValue: number | null = null;

    if (scopeType) {
      const type = String(scopeType).toLowerCase();
      if (type === 'project' || type === 'projeto') {
        normalizedScope = 'project';
      } else if (type === 'oficina') {
        normalizedScope = 'oficina';
      } else {
        res.status(400).json(errorResponse('scopeType inválido'));
        return;
      }

      if (scopeId === undefined || scopeId === null) {
        res.status(400).json(errorResponse('scopeId é obrigatório quando scopeType é informado'));
        return;
      }

      scopeValue = Number(scopeId);
      if (!Number.isFinite(scopeValue)) {
        res.status(400).json(errorResponse('scopeId inválido'));
        return;
      }
    }

    if (normalizedScope === null) {
      await pool.query('DELETE FROM user_permissions WHERE user_id = $1 AND projeto_id IS NULL AND oficina_id IS NULL', [id]);
      for (const permission of permissions) {
        await pool.query(
          `INSERT INTO user_permissions (user_id, permission, projeto_id, oficina_id, created_at, updated_at)
           VALUES ($1,$2,NULL,NULL,NOW(),NOW())
           ON CONFLICT DO NOTHING`,
          [id, permission]
        );
      }
    } else if (normalizedScope === 'project' && scopeValue !== null) {
      await pool.query('DELETE FROM user_permissions WHERE user_id = $1 AND projeto_id = $2', [id, scopeValue]);
      for (const permission of permissions) {
        await pool.query(
          `INSERT INTO user_permissions (user_id, permission, projeto_id, oficina_id, created_at, updated_at)
           VALUES ($1,$2,$3,NULL,NOW(),NOW())
           ON CONFLICT DO NOTHING`,
          [id, permission, scopeValue]
        );
      }
    } else if (normalizedScope === 'oficina' && scopeValue !== null) {
      await pool.query('DELETE FROM user_permissions WHERE user_id = $1 AND oficina_id = $2', [id, scopeValue]);
      for (const permission of permissions) {
        await pool.query(
          `INSERT INTO user_permissions (user_id, permission, projeto_id, oficina_id, created_at, updated_at)
           VALUES ($1,$2,NULL,$3,NOW(),NOW())
           ON CONFLICT DO NOTHING`,
          [id, permission, scopeValue]
        );
      }
    }

    await invalidateUserPermissionCache(Number(id));

    res.json(
      successResponse({
        id,
        permissions,
        scopeType: normalizedScope,
        scopeId: scopeValue
      })
    );
    return;
  } catch {
    res.status(500).json(errorResponse('Erro ao atualizar permissões do usuário'));
    return;
  }
});

// ---- Papéis com escopo ----
router.get('/usuarios/:id/roles', authenticateToken, authorize('users.manage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = authReq.params as any;
    const scopeType = String((authReq.query as any).scopeType || (authReq.query as any).scope_type || '').trim();
    const scopeIdRaw = (authReq.query as any).scopeId ?? (authReq.query as any).scope_id;

    const params: Array<string | number> = [id];
    let sql = 'SELECT id, role, projeto_id, oficina_id, created_at, updated_at FROM user_role_scopes WHERE user_id = $1';

    if (scopeType) {
      if (!scopeIdRaw && scopeIdRaw !== 0) {
        res.status(400).json(errorResponse('scopeId é obrigatório quando scopeType é informado'));
        return;
      }
      const scopeId = Number(scopeIdRaw);
      if (!Number.isFinite(scopeId)) {
        res.status(400).json(errorResponse('scopeId inválido'));
        return;
      }

      if (scopeType === 'project' || scopeType === 'projeto') {
        sql += ' AND projeto_id = $2';
        params.push(scopeId);
      } else if (scopeType === 'oficina') {
        sql += ' AND oficina_id = $2';
        params.push(scopeId);
      } else {
        res.status(400).json(errorResponse('scopeType inválido'));
        return;
      }
    }

    const result = await pool.query(sql, params);
    res.json(successResponse(result.rows));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter papéis escopados do usuário'));
    return;
  }
});

router.post('/usuarios/:id/roles', authenticateToken, authorize('users.manage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = authReq.params as any;
    const { role, scopeType, scopeId } = (authReq.body ?? {}) as Record<string, any>;

    if (!role) {
      res.status(400).json(errorResponse('role é obrigatório'));
      return;
    }

    if (!scopeType || scopeId === undefined || scopeId === null) {
      res.status(400).json(errorResponse('scopeType e scopeId são obrigatórios'));
      return;
    }

    const type = String(scopeType).toLowerCase();
    const scopeValue = Number(scopeId);
    if (!Number.isFinite(scopeValue)) {
      res.status(400).json(errorResponse('scopeId inválido'));
      return;
    }

    let insertSql = '';
    const params: Array<string | number> = [id, role];

    if (type === 'project' || type === 'projeto') {
      insertSql =
        `INSERT INTO user_role_scopes (user_id, role, projeto_id, oficina_id, created_at, updated_at)
         VALUES ($1,$2,$3,NULL,NOW(),NOW())
         ON CONFLICT DO NOTHING
         RETURNING id, role, projeto_id, oficina_id, created_at, updated_at`;
      params.push(scopeValue);
    } else if (type === 'oficina') {
      insertSql =
        `INSERT INTO user_role_scopes (user_id, role, projeto_id, oficina_id, created_at, updated_at)
         VALUES ($1,$2,NULL,$3,NOW(),NOW())
         ON CONFLICT DO NOTHING
         RETURNING id, role, projeto_id, oficina_id, created_at, updated_at`;
      params.push(scopeValue);
    } else {
      res.status(400).json(errorResponse('scopeType inválido'));
      return;
    }

    const result = await pool.query(insertSql, params);
    await invalidateUserPermissionCache(Number(id));

    res.status(result.rowCount ? 201 : 200).json(successResponse(result.rows[0] ?? null));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao vincular papel escopado'));
    return;
  }
});

router.delete('/usuarios/:id/roles', authenticateToken, authorize('users.manage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = authReq.params as any;
    const { role, scopeType, scopeId } = (authReq.body ?? {}) as Record<string, any>;

    if (!role) {
      res.status(400).json(errorResponse('role é obrigatório'));
      return;
    }

    const type = String(scopeType || '').toLowerCase();
    const scopeValue = scopeId !== undefined && scopeId !== null ? Number(scopeId) : NaN;

    if (!type || !Number.isFinite(scopeValue)) {
      res.status(400).json(errorResponse('scopeType e scopeId são obrigatórios para remoção'));
      return;
    }

    let deleteSql = '';
    const params: Array<string | number> = [id, role];

    if (type === 'project' || type === 'projeto') {
      deleteSql = 'DELETE FROM user_role_scopes WHERE user_id = $1 AND role = $2 AND projeto_id = $3 RETURNING id';
      params.push(scopeValue);
    } else if (type === 'oficina') {
      deleteSql = 'DELETE FROM user_role_scopes WHERE user_id = $1 AND role = $2 AND oficina_id = $3 RETURNING id';
      params.push(scopeValue);
    } else {
      res.status(400).json(errorResponse('scopeType inválido'));
      return;
    }

    const result = await pool.query(deleteSql, params);
    await invalidateUserPermissionCache(Number(id));

    const removed = (result.rowCount ?? 0) > 0;
    res.json(successResponse({ removed }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao remover papel escopado'));
    return;
  }
});

export default router;
