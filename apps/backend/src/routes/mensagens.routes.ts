import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';

const router = Router();

// Conexões SSE por usuário
const sseClients = new Map<number, Response>();

const CONFIDENTIALITY_LEVELS = ['publica', 'sensivel', 'confidencial'] as const;
type ConfidentialityLevel = (typeof CONFIDENTIALITY_LEVELS)[number];

const THREAD_SCOPE_TYPES = ['DIRECT', 'BENEFICIARIA', 'PROJETO'] as const;
type ThreadScopeType = (typeof THREAD_SCOPE_TYPES)[number];

const CONFIDENTIALITY_PRIORITY: Record<ConfidentialityLevel, number> = {
  publica: 0,
  sensivel: 1,
  confidencial: 2,
};

class ThreadNotFoundError extends Error {
  constructor() {
    super('Thread não encontrada');
    this.name = 'ThreadNotFoundError';
  }
}

const normaliseConfidentiality = (value?: unknown, fallback: ConfidentialityLevel = 'publica'): ConfidentialityLevel => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.toLowerCase();
  return (CONFIDENTIALITY_LEVELS as readonly string[]).includes(normalized)
    ? (normalized as ConfidentialityLevel)
    : fallback;
};

const parseUserIds = (input: unknown): number[] => {
  if (!Array.isArray(input)) {
    return [];
  }
  const unique = new Set<number>();
  input.forEach((value) => {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      unique.add(parsed);
    }
  });
  return Array.from(unique);
};

const ensureThreadParticipants = async (threadId: number, userIds: number[]): Promise<void> => {
  if (userIds.length === 0) {
    return;
  }
  await pool.query(
    `INSERT INTO mensagens_thread_participantes (thread_id, usuario_id)
     SELECT $1, UNNEST($2::INT[])
     ON CONFLICT DO NOTHING`,
    [threadId, userIds]
  );
};

const notifyThreadParticipants = async (threadId: number, payload: any, excludeUserId?: number): Promise<void> => {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  try {
    const { rows } = await pool.query<{ usuario_id: number | string }>(
      'SELECT usuario_id FROM mensagens_thread_participantes WHERE thread_id = $1',
      [threadId]
    );
    rows.forEach(({ usuario_id }) => {
      const uid = Number(usuario_id);
      if (excludeUserId && uid === excludeUserId) {
        return;
      }
      const client = sseClients.get(uid);
      if (client) {
        client.write(message);
      }
    });
  } catch (_error) {
    // Falha ao notificar participantes não deve interromper o fluxo principal
  }
};

const getThreadById = async (threadId: number) => {
  const result = await pool.query('SELECT * FROM mensagens_threads WHERE id = $1', [threadId]);
  return result.rows[0] ?? null;
};

const userHasAccessToThread = async (threadId: number, userId: number): Promise<boolean> => {
  const { rows } = await pool.query(
    'SELECT 1 FROM mensagens_thread_participantes WHERE thread_id = $1 AND usuario_id = $2',
    [threadId, userId]
  );
  return rows.length > 0;
};

const ensureUserInThread = async (threadId: number, userId: number): Promise<void> => {
  await ensureThreadParticipants(threadId, [userId]);
};

const sendThreadMessage = async (params: {
  autorId: number;
  threadId: number;
  conteudo: string;
  confidencialidade: ConfidentialityLevel;
  mentions: number[];
}) => {
  const { autorId, threadId, conteudo, confidencialidade, mentions } = params;
  const thread = await getThreadById(threadId);
  if (!thread) {
    throw new ThreadNotFoundError();
  }

  await ensureUserInThread(threadId, autorId);
  const additionalParticipants = mentions.filter((id) => id !== autorId);
  if (additionalParticipants.length > 0) {
    await ensureThreadParticipants(threadId, additionalParticipants);
  }

  const result = await pool.query(
    `INSERT INTO mensagens_usuario (autor_id, thread_id, conteudo, confidencialidade, mentions, beneficiaria_id, projeto_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      autorId,
      threadId,
      conteudo,
      confidencialidade,
      mentions,
      thread.beneficiaria_id ?? null,
      thread.projeto_id ?? null,
    ]
  );

  const message = result.rows[0];
  const currentConfidentiality = normaliseConfidentiality(thread.confidencialidade as string | undefined);
  if (CONFIDENTIALITY_PRIORITY[confidencialidade] > CONFIDENTIALITY_PRIORITY[currentConfidentiality]) {
    await pool.query('UPDATE mensagens_threads SET confidencialidade = $1, atualizado_em = NOW() WHERE id = $2', [confidencialidade, threadId]);
  } else {
    await pool.query('UPDATE mensagens_threads SET atualizado_em = NOW() WHERE id = $1', [threadId]);
  }

  await notifyThreadParticipants(threadId, message, autorId);
  return message;
};

const sendDirectMessage = async (params: {
  autorId: number;
  destinatarioId: number;
  conteudo: string;
  confidencialidade: ConfidentialityLevel;
  mentions: number[];
  beneficiariaId?: number | null;
  projetoId?: number | null;
}) => {
  const { autorId, destinatarioId, conteudo, confidencialidade, mentions, beneficiariaId = null, projetoId = null } = params;
  const result = await pool.query(
    `INSERT INTO mensagens_usuario (autor_id, destinatario_id, conteudo, confidencialidade, mentions, beneficiaria_id, projeto_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [autorId, destinatarioId, conteudo, confidencialidade, mentions, beneficiariaId, projetoId]
  );

  const message = result.rows[0];
  const directPayload = `data: ${JSON.stringify(message)}\n\n`;
  const destinatarioClient = sseClients.get(destinatarioId);
  if (destinatarioClient) {
    destinatarioClient.write(directPayload);
  }

  mentions
    .filter((id) => id !== destinatarioId && id !== autorId)
    .forEach((uid) => {
      const client = sseClients.get(uid);
      if (client) {
        client.write(directPayload);
      }
    });

  return message;
};

// GET /mensagens/usuarios - lista usuários para conversar
router.get('/usuarios', authenticateToken, async (_req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const result = await pool.query('SELECT id, nome, email, papel as role FROM usuarios WHERE ativo = true ORDER BY nome');
    res.json(result.rows);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar usuários'));
    return;
  }
});

// GET /mensagens/conversas - últimas conversas do usuário
router.get('/conversas', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
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
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar conversas'));
    return;
  }
});

// GET /mensagens/conversa/:usuarioId - thread entre usuário e :usuarioId
router.get('/conversa/:usuarioId', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
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
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter conversa'));
    return;
  }
});

// GET /mensagens/threads - lista threads por usuário
router.get('/threads', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const result = await pool.query(
      `SELECT t.*, lm.ultima_mensagem, (
         SELECT ARRAY_AGG(mp.usuario_id ORDER BY mp.usuario_id)
         FROM mensagens_thread_participantes mp
         WHERE mp.thread_id = t.id
       ) AS participantes
       FROM mensagens_threads t
       JOIN mensagens_thread_participantes p ON p.thread_id = t.id AND p.usuario_id = $1
       LEFT JOIN LATERAL (
         SELECT row_to_json(m) AS ultima_mensagem
         FROM (
           SELECT m.id, m.autor_id, m.conteudo, m.data_publicacao, m.confidencialidade, m.mentions
           FROM mensagens_usuario m
           WHERE m.thread_id = t.id AND m.ativo = true
           ORDER BY m.data_publicacao DESC
           LIMIT 1
         ) m
       ) lm ON TRUE
       ORDER BY t.atualizado_em DESC, t.id DESC
       LIMIT 200`,
      [userId]
    );
    res.json(successResponse(result.rows));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar threads'));
    return;
  }
});

// POST /mensagens/threads - cria uma nova thread contextualizada
router.post('/threads', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const autorId = Number(req.user!.id);
    const { escopo_tipo, beneficiaria_id, projeto_id, titulo, confidencialidade, participantes } = (req.body ?? {}) as Record<string, any>;

    const scope = typeof escopo_tipo === 'string' ? (escopo_tipo.toUpperCase() as ThreadScopeType) : undefined;
    if (!scope || !(THREAD_SCOPE_TYPES as readonly string[]).includes(scope)) {
      res.status(400).json(errorResponse('escopo_tipo inválido'));
      return;
    }

    let beneficiariaId: number | null = null;
    let projetoId: number | null = null;

    if (scope === 'BENEFICIARIA') {
      beneficiariaId = Number(beneficiaria_id);
      if (!Number.isInteger(beneficiariaId) || beneficiariaId <= 0) {
        res.status(400).json(errorResponse('beneficiaria_id é obrigatório para threads de beneficiárias'));
        return;
      }
    }

    if (scope === 'PROJETO') {
      projetoId = Number(projeto_id);
      if (!Number.isInteger(projetoId) || projetoId <= 0) {
        res.status(400).json(errorResponse('projeto_id é obrigatório para threads de projetos'));
        return;
      }
    }

    if (scope === 'DIRECT') {
      beneficiariaId = null;
      projetoId = null;
    }

    const normalizedConfidentiality = normaliseConfidentiality(confidencialidade);
    const threadTitle = typeof titulo === 'string' && titulo.trim().length > 0 ? titulo.trim() : null;

    const threadResult = await pool.query(
      `INSERT INTO mensagens_threads (escopo_tipo, beneficiaria_id, projeto_id, titulo, criado_por, confidencialidade)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [scope, beneficiariaId, projetoId, threadTitle, autorId, normalizedConfidentiality]
    );

    const thread = threadResult.rows[0];
    const participantIds = new Set<number>([autorId, ...parseUserIds(participantes)]);
    await ensureThreadParticipants(thread.id, Array.from(participantIds));

    const participantsResult = await pool.query(
      'SELECT usuario_id FROM mensagens_thread_participantes WHERE thread_id = $1 ORDER BY usuario_id',
      [thread.id]
    );

    res.status(201).json(
      successResponse({
        ...thread,
        participantes: participantsResult.rows.map((row) => Number(row.usuario_id)),
      })
    );
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar thread'));
    return;
  }
});

// GET /mensagens/threads/:threadId - detalhes da thread
router.get('/threads/:threadId', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const threadId = Number(req.params.threadId);
    if (!Number.isInteger(threadId) || threadId <= 0) {
      res.status(400).json(errorResponse('threadId inválido'));
      return;
    }

    const thread = await getThreadById(threadId);
    if (!thread) {
      res.status(404).json(errorResponse('Thread não encontrada'));
      return;
    }

    if (!(await userHasAccessToThread(threadId, userId))) {
      res.status(403).json(errorResponse('Usuário não participa desta thread'));
      return;
    }

    const participantsResult = await pool.query(
      'SELECT usuario_id FROM mensagens_thread_participantes WHERE thread_id = $1 ORDER BY usuario_id',
      [threadId]
    );

    res.json(
      successResponse({
        ...thread,
        participantes: participantsResult.rows.map((row) => Number(row.usuario_id)),
      })
    );
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter thread'));
    return;
  }
});

// GET /mensagens/threads/:threadId/mensagens - mensagens da thread
router.get('/threads/:threadId/mensagens', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const threadId = Number(req.params.threadId);
    if (!Number.isInteger(threadId) || threadId <= 0) {
      res.status(400).json(errorResponse('threadId inválido'));
      return;
    }

    if (!(await userHasAccessToThread(threadId, userId))) {
      res.status(403).json(errorResponse('Usuário não participa desta thread'));
      return;
    }

    const messages = await pool.query(
      `SELECT * FROM mensagens_usuario
       WHERE thread_id = $1 AND ativo = true
       ORDER BY data_publicacao ASC`,
      [threadId]
    );
    res.json(successResponse(messages.rows));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter mensagens da thread'));
    return;
  }
});

// POST /mensagens/threads/:threadId/mensagens - envia mensagem na thread
router.post('/threads/:threadId/mensagens', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const autorId = Number(req.user!.id);
    const threadId = Number(req.params.threadId);
    const { conteudo, confidencialidade, mentions } = (req.body ?? {}) as Record<string, any>;

    if (!Number.isInteger(threadId) || threadId <= 0) {
      res.status(400).json(errorResponse('threadId inválido'));
      return;
    }

    if (!conteudo || typeof conteudo !== 'string' || conteudo.trim().length === 0) {
      res.status(400).json(errorResponse('conteudo é obrigatório'));
      return;
    }

    const message = await sendThreadMessage({
      autorId,
      threadId,
      conteudo,
      confidencialidade: normaliseConfidentiality(confidencialidade),
      mentions: parseUserIds(mentions),
    });

    res.status(201).json(successResponse(message));
    return;
  } catch (error) {
    if (error instanceof ThreadNotFoundError) {
      res.status(404).json(errorResponse(error.message));
      return;
    }
    res.status(500).json(errorResponse('Erro ao enviar mensagem na thread'));
    return;
  }
});

// POST /mensagens/enviar - enviar mensagem direta ou em thread
router.post('/enviar', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const autorId = Number(req.user!.id);
    const {
      destinatario_id,
      conteudo,
      thread_id,
      confidencialidade,
      mentions,
      beneficiaria_id,
      projeto_id,
    } = (req.body ?? {}) as Record<string, any>;

    if (!conteudo || typeof conteudo !== 'string' || conteudo.trim().length === 0) {
      res.status(400).json(errorResponse('conteudo é obrigatório'));
      return;
    }

    const normalizedConfidentiality = normaliseConfidentiality(confidencialidade);
    const mentionIds = parseUserIds(mentions);

    if (thread_id) {
      const threadId = Number(thread_id);
      if (!Number.isInteger(threadId) || threadId <= 0) {
        res.status(400).json(errorResponse('thread_id inválido'));
        return;
      }

      try {
        const message = await sendThreadMessage({
          autorId,
          threadId,
          conteudo,
          confidencialidade: normalizedConfidentiality,
          mentions: mentionIds,
        });
        res.status(201).json(successResponse(message));
        return;
      } catch (error) {
        if (error instanceof ThreadNotFoundError) {
          res.status(404).json(errorResponse(error.message));
          return;
        }
        throw error;
      }
    }

    if (!destinatario_id) {
      res.status(400).json(errorResponse('destinatario_id ou thread_id são obrigatórios'));
      return;
    }

    const destinatarioId = Number(destinatario_id);
    if (!Number.isInteger(destinatarioId) || destinatarioId <= 0) {
      res.status(400).json(errorResponse('destinatario_id inválido'));
      return;
    }

    const beneficiariaParsed = Number(beneficiaria_id);
    const projetoParsed = Number(projeto_id);
    const beneficiariaId = Number.isInteger(beneficiariaParsed) && beneficiariaParsed > 0 ? beneficiariaParsed : null;
    const projetoId = Number.isInteger(projetoParsed) && projetoParsed > 0 ? projetoParsed : null;

    const message = await sendDirectMessage({
      autorId,
      destinatarioId,
      conteudo,
      confidencialidade: normalizedConfidentiality,
      mentions: mentionIds,
      beneficiariaId,
      projetoId,
    });

    res.status(201).json(successResponse(message));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao enviar mensagem'));
    return;
  }
});

// PATCH /mensagens/:id/lida
router.patch('/:id/lida', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const { lida } = (req.body ?? {}) as Record<string, any>;
    await pool.query('UPDATE mensagens_usuario SET lida = COALESCE($1, lida) WHERE id = $2', [lida === undefined ? true : !!lida, id]);
    res.json(successResponse({ id, lida: lida === undefined ? true : !!lida }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao marcar mensagem como lida'));
    return;
  }
});

// DELETE /mensagens/:id
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    await pool.query('UPDATE mensagens_usuario SET ativo = false WHERE id = $1', [id]);
    res.status(204).end();
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao excluir mensagem'));
    return;
  }
});

// GET /mensagens/stream - SSE
router.get('/stream', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
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
  return;
});

export default router;
