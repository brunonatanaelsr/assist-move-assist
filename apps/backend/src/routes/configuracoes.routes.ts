import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest, authorize } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { redis } from '../lib/redis';
import bcrypt from 'bcryptjs';

type TemaPreferido = 'claro' | 'escuro' | 'sistema';

interface ConfiguracoesPersistidas {
  tema: TemaPreferido;
  idioma: string;
  fusoHorario: string;
  notificacoes: {
    habilitarEmails: boolean;
    habilitarPush: boolean;
  };
  organizacao: {
    nome: string | null;
    emailSuporte: string | null;
  };
}

interface ConfiguracoesResposta extends ConfiguracoesPersistidas {
  atualizadoEm: string | null;
}

type AtualizacaoConfiguracoes = {
  tema?: ConfiguracoesPersistidas['tema'];
  idioma?: ConfiguracoesPersistidas['idioma'];
  fusoHorario?: ConfiguracoesPersistidas['fusoHorario'];
  notificacoes?: Partial<ConfiguracoesPersistidas['notificacoes']>;
  organizacao?: Partial<ConfiguracoesPersistidas['organizacao']>;
};

const DEFAULT_CONFIGURACOES: ConfiguracoesPersistidas = {
  tema: 'sistema',
  idioma: 'pt-BR',
  fusoHorario: 'America/Sao_Paulo',
  notificacoes: {
    habilitarEmails: true,
    habilitarPush: false,
  },
  organizacao: {
    nome: null,
    emailSuporte: null,
  },
};

const TEMA_VALIDO = new Set<TemaPreferido>(['claro', 'escuro', 'sistema']);

const ensureConfiguracoesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracoes_globais (
      id INTEGER PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
};

interface ConfiguracoesRow {
  payload: ConfiguracoesPersistidas | string;
  updated_at: Date | string | null;
}

const toResponse = (row: ConfiguracoesRow | null): ConfiguracoesResposta => {
  if (!row) {
    return { ...DEFAULT_CONFIGURACOES, atualizadoEm: null };
  }
  const parsed = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  return {
    tema: parsed?.tema ?? DEFAULT_CONFIGURACOES.tema,
    idioma: parsed?.idioma ?? DEFAULT_CONFIGURACOES.idioma,
    fusoHorario: parsed?.fusoHorario ?? DEFAULT_CONFIGURACOES.fusoHorario,
    notificacoes: {
      habilitarEmails: parsed?.notificacoes?.habilitarEmails ?? DEFAULT_CONFIGURACOES.notificacoes.habilitarEmails,
      habilitarPush: parsed?.notificacoes?.habilitarPush ?? DEFAULT_CONFIGURACOES.notificacoes.habilitarPush,
    },
    organizacao: {
      nome: parsed?.organizacao?.nome ?? DEFAULT_CONFIGURACOES.organizacao.nome,
      emailSuporte: parsed?.organizacao?.emailSuporte ?? DEFAULT_CONFIGURACOES.organizacao.emailSuporte,
    },
    atualizadoEm: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
};

const loadConfiguracoes = async (): Promise<ConfiguracoesResposta | null> => {
  const result = await pool.query('SELECT payload, updated_at FROM configuracoes_globais WHERE id = 1');
  if (!result.rows?.length) {
    return null;
  }
  return toResponse(result.rows[0] as ConfiguracoesRow);
};

const persistConfiguracoes = async (payload: ConfiguracoesPersistidas): Promise<ConfiguracoesResposta> => {
  const result = await pool.query(
    `
      INSERT INTO configuracoes_globais (id, payload, updated_at)
      VALUES (1, $1::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE
        SET payload = EXCLUDED.payload,
            updated_at = NOW()
      RETURNING payload, updated_at
    `,
    [JSON.stringify(payload)]
  );
  return toResponse(result.rows[0] as ConfiguracoesRow);
};

const sanitizePayload = (input: any): AtualizacaoConfiguracoes => {
  if (!input || typeof input !== 'object') {
    return {};
  }
  const sanitized: AtualizacaoConfiguracoes = {};

  if (typeof input.tema === 'string') {
    const tema = input.tema.toLowerCase();
    if (TEMA_VALIDO.has(tema as TemaPreferido)) {
      sanitized.tema = tema as TemaPreferido;
    }
  }

  if (typeof input.idioma === 'string') {
    const idioma = input.idioma.trim();
    if (idioma) {
      sanitized.idioma = idioma;
    }
  }

  if (typeof input.fusoHorario === 'string') {
    const tz = input.fusoHorario.trim();
    if (tz) {
      sanitized.fusoHorario = tz;
    }
  }

  if (input.notificacoes && typeof input.notificacoes === 'object') {
    const notificacoes: Partial<ConfiguracoesPersistidas['notificacoes']> = {};
    if (typeof input.notificacoes.habilitarEmails === 'boolean') {
      notificacoes.habilitarEmails = input.notificacoes.habilitarEmails;
    }
    if (typeof input.notificacoes.habilitarPush === 'boolean') {
      notificacoes.habilitarPush = input.notificacoes.habilitarPush;
    }
    if (Object.keys(notificacoes).length > 0) {
      sanitized.notificacoes = notificacoes;
    }
  }

  if (input.organizacao && typeof input.organizacao === 'object') {
    const organizacao: Partial<ConfiguracoesPersistidas['organizacao']> = {};
    if ('nome' in input.organizacao) {
      const nome = typeof input.organizacao.nome === 'string' ? input.organizacao.nome.trim() : null;
      organizacao.nome = nome && nome.length ? nome : null;
    }
    if ('emailSuporte' in input.organizacao) {
      const email = typeof input.organizacao.emailSuporte === 'string' ? input.organizacao.emailSuporte.trim() : null;
      organizacao.emailSuporte = email && email.length ? email : null;
    }
    if (Object.keys(organizacao).length > 0) {
      sanitized.organizacao = organizacao;
    }
  }

  return sanitized;
};

const mergeConfiguracoes = (
  atual: ConfiguracoesPersistidas,
  patch: AtualizacaoConfiguracoes
): ConfiguracoesPersistidas => {
  const merged: ConfiguracoesPersistidas = {
    tema: patch.tema ?? atual.tema,
    idioma: patch.idioma ?? atual.idioma,
    fusoHorario: patch.fusoHorario ?? atual.fusoHorario,
    notificacoes: { ...atual.notificacoes },
    organizacao: { ...atual.organizacao },
  };

  if (patch.notificacoes) {
    if (patch.notificacoes.habilitarEmails !== undefined) {
      merged.notificacoes.habilitarEmails = patch.notificacoes.habilitarEmails;
    }
    if (patch.notificacoes.habilitarPush !== undefined) {
      merged.notificacoes.habilitarPush = patch.notificacoes.habilitarPush;
    }
  }

  if (patch.organizacao) {
    if (patch.organizacao.nome !== undefined) {
      merged.organizacao.nome = patch.organizacao.nome;
    }
    if (patch.organizacao.emailSuporte !== undefined) {
      merged.organizacao.emailSuporte = patch.organizacao.emailSuporte;
    }
  }

  return merged;
};

const router = Router();

router.get('/', authenticateToken, authorize('users.manage'), async (_req, res) => {
  try {
    await ensureConfiguracoesTable();
    const existentes = await loadConfiguracoes();
    if (!existentes) {
      const defaults = await persistConfiguracoes(DEFAULT_CONFIGURACOES);
      res.json(successResponse(defaults));
      return;
    }
    res.json(successResponse(existentes));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao carregar configurações globais'));
  }
});

router.put('/', authenticateToken, authorize('users.manage'), async (req, res) => {
  try {
    await ensureConfiguracoesTable();
    const patch = sanitizePayload((req as AuthenticatedRequest).body);
    const possuiAlteracoes = Boolean(
      patch.tema !== undefined ||
      patch.idioma !== undefined ||
      patch.fusoHorario !== undefined ||
      patch.notificacoes !== undefined ||
      patch.organizacao !== undefined
    );
    if (!possuiAlteracoes) {
      res.status(400).json(errorResponse('Nenhuma configuração válida fornecida'));
      return;
    }
    const atuais = (await loadConfiguracoes()) ?? (await persistConfiguracoes(DEFAULT_CONFIGURACOES));
    const atualizadas = mergeConfiguracoes(atuais, patch);
    const resposta = await persistConfiguracoes(atualizadas);
    res.json(successResponse(resposta));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar configurações globais'));
  }
});

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
    try { await redis.del(`perms:user:${id}`); } catch {}
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

export default router;

// ---- Permissões por usuário ----
router.get('/usuarios/:id/permissions', authenticateToken, authorize('users.manage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = authReq.params as any;
    const r = await pool.query('SELECT permission FROM user_permissions WHERE user_id = $1', [id]);
    res.json(successResponse(r.rows.map((x:any)=>x.permission)));
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
    const { permissions } = (authReq.body ?? {}) as Record<string, any>;
    if (!Array.isArray(permissions)) { res.status(400).json(errorResponse('permissions deve ser array')); return; }
  await pool.query('DELETE FROM user_permissions WHERE user_id = $1', [id]);
  for (const p of permissions) {
    await pool.query('INSERT INTO user_permissions (user_id, permission) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, p]);
  }
  try { await redis.del(`perms:user:${id}`); } catch {}
  res.json(successResponse({ id, permissions }));
    return;
  } catch {
    res.status(500).json(errorResponse('Erro ao atualizar permissões do usuário'));
    return;
  }
});
