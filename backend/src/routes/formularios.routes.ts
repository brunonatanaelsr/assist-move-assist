import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { validateRequest } from '../middleware/validationMiddleware';
import { z } from 'zod';
import {
  renderFormPdf,
  renderAnamnesePdf,
  renderFichaEvolucaoPdf,
  renderTermosPdf,
  renderVisaoHolisticaPdf
} from '../services/formsExport.service';

const DEFAULT_SCHEMA_VERSION = 'v1';

type AssinaturaRegistro = {
  signatario_id?: number | string;
  signatario_nome?: string;
  assinado_em: string | null;
  [key: string]: any;
};

const hasOwn = (obj: unknown, key: string): boolean =>
  typeof obj === 'object' && obj !== null && Object.prototype.hasOwnProperty.call(obj, key);

const resolveSchemaVersion = (input: unknown): string | null => {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return null;
};

const toIsoStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

const sanitizeAssinaturasInput = (value: unknown): AssinaturaRegistro[] => {
  const entries = Array.isArray(value) ? value : value !== null && value !== undefined ? [value] : [];

  return entries
    .map((entry) => {
      if (entry === null || entry === undefined) {
        return null;
      }

      if (typeof entry === 'string') {
        return { signatario_nome: entry, assinado_em: new Date().toISOString() } as AssinaturaRegistro;
      }

      if (typeof entry === 'number') {
        return { signatario_id: entry, assinado_em: new Date().toISOString() } as AssinaturaRegistro;
      }

      if (typeof entry !== 'object') {
        return null;
      }

      const normalized: Record<string, any> = { ...entry };

      if (normalized.signatarioId !== undefined && normalized.signatario_id === undefined) {
        normalized.signatario_id = normalized.signatarioId;
      }

      if (normalized.signatarioNome !== undefined && normalized.signatario_nome === undefined) {
        normalized.signatario_nome = normalized.signatarioNome;
      }

      const timestamp = normalized.assinado_em ?? normalized.assinadoEm ?? normalized.timestamp;
      const iso = toIsoStringOrNull(timestamp) ?? new Date().toISOString();
      normalized.assinado_em = iso;

      delete normalized.assinadoEm;
      delete normalized.timestamp;

      return normalized as AssinaturaRegistro;
    })
    .filter((entry): entry is AssinaturaRegistro => entry !== null);
};

const normalizeAssinaturasForResponse = (value: unknown): AssinaturaRegistro[] => {
  const entries = Array.isArray(value) ? value : value !== null && value !== undefined ? [value] : [];

  return entries
    .map((entry) => {
      if (entry === null || entry === undefined) {
        return null;
      }

      if (typeof entry === 'string') {
        return { signatario_nome: entry, assinado_em: null } as AssinaturaRegistro;
      }

      if (typeof entry === 'number') {
        return { signatario_id: entry, assinado_em: null } as AssinaturaRegistro;
      }

      if (typeof entry !== 'object') {
        return null;
      }

      const normalized: Record<string, any> = { ...entry };

      if (normalized.signatarioId !== undefined && normalized.signatario_id === undefined) {
        normalized.signatario_id = normalized.signatarioId;
      }

      if (normalized.signatarioNome !== undefined && normalized.signatario_nome === undefined) {
        normalized.signatario_nome = normalized.signatarioNome;
      }

      const timestamp = normalized.assinado_em ?? normalized.assinadoEm ?? normalized.timestamp;
      normalized.assinado_em = toIsoStringOrNull(timestamp);

      delete normalized.assinadoEm;
      delete normalized.timestamp;

      return normalized as AssinaturaRegistro;
    })
    .filter((entry): entry is AssinaturaRegistro => entry !== null);
};

const normalizeFormRow = <T extends Record<string, any>>(row: T, fallbackSchema?: string) => ({
  ...row,
  schema_version: row.schema_version || fallbackSchema || DEFAULT_SCHEMA_VERSION,
  assinaturas: normalizeAssinaturasForResponse((row as any).assinaturas)
});

type TermoConsentimentoRow = {
  id: number;
  beneficiaria_id: number;
  dados: Record<string, any> | null;
  created_at: string;
  schema_version?: string;
  assinaturas?: AssinaturaRegistro[] | null;
  revogado_em?: string | null;
  revogado_por?: number | null;
  revogacao_motivo?: string | null;
};

const formatTermoConsentimento = (row: TermoConsentimentoRow) => {
  const dados = (row?.dados || {}) as Record<string, any>;
  const assinaturasCol = Array.isArray(row.assinaturas) ? row.assinaturas : [];
  const assinaturasDados = Array.isArray((dados as any).assinaturas) ? (dados as any).assinaturas : [];

  return {
    ...dados,
    id: row.id,
    beneficiaria_id: row.beneficiaria_id,
    created_at: row.created_at,
    schema_version: row.schema_version || (dados as any).schema_version || DEFAULT_SCHEMA_VERSION,
    assinaturas: normalizeAssinaturasForResponse(assinaturasCol.length ? assinaturasCol : assinaturasDados),
    revogado_em: row.revogado_em ?? null,
    revogado_por: row.revogado_por ?? null,
    revogacao_motivo: row.revogacao_motivo ?? dados.revogacao_motivo ?? null,
    ativo: !row.revogado_em,
    data_aceite: dados.data_aceite ?? row.created_at,
  };
};

const router = Router();

// ANAMNESE SOCIAL
router.post('/anamnese', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiaria_id, dados, schema_version, assinaturas } = (req.body ?? {}) as Record<string, any>;
    const createdBy = Number(req.user!.id);
    const schemaVersion = resolveSchemaVersion(schema_version) ?? DEFAULT_SCHEMA_VERSION;
    const assinaturasPayload = sanitizeAssinaturasInput(assinaturas);
    const result = await pool.query(
      `INSERT INTO anamnese_social (beneficiaria_id, dados, schema_version, assinaturas, created_by)
       VALUES ($1,$2::jsonb,$3,$4::jsonb,$5) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), schemaVersion, JSON.stringify(assinaturasPayload), createdBy]
    );
    res.status(201).json(successResponse(normalizeFormRow(result.rows[0], schemaVersion)));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar anamnese'));
    return;
  }
});

router.get('/anamnese/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM anamnese_social WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Anamnese não encontrada')); return; }
    res.json(successResponse(normalizeFormRow(result.rows[0])));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter anamnese'));
    return;
  }
});
router.get('/anamnese/:id/pdf', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query(
      'SELECT id, beneficiaria_id, dados, schema_version, assinaturas, created_at FROM anamnese_social WHERE id = $1',
      [id]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Anamnese não encontrada')); return; }
    const pdf = await renderAnamnesePdf(normalizeFormRow(result.rows[0]));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="anamnese_${id}.pdf"`);
    res.send(pdf);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao exportar anamnese'));
    return;
  }
});

router.put('/anamnese/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const body = (req.body ?? {}) as Record<string, any>;
    const schemaProvided = hasOwn(body, 'schema_version');
    const assinaturasProvided = hasOwn(body, 'assinaturas');
    const schemaVersion = schemaProvided
      ? resolveSchemaVersion(body.schema_version) ?? DEFAULT_SCHEMA_VERSION
      : null;
    const assinaturasPayload = assinaturasProvided ? sanitizeAssinaturasInput(body.assinaturas) : null;
    const result = await pool.query(
      `UPDATE anamnese_social
          SET dados = COALESCE($2::jsonb, dados),
              schema_version = COALESCE($3, schema_version),
              assinaturas = COALESCE($4::jsonb, assinaturas)
        WHERE id = $1 RETURNING *`,
      [
        id,
        JSON.stringify(body.dados ?? null),
        schemaProvided ? schemaVersion : null,
        assinaturasProvided ? JSON.stringify(assinaturasPayload ?? []) : null
      ]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Anamnese não encontrada')); return; }
    res.json(successResponse(normalizeFormRow(result.rows[0])));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar anamnese'));
    return;
  }
});

// FICHA DE EVOLUÇÃO
router.post('/ficha-evolucao', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiaria_id, dados, schema_version, assinaturas } = (req.body ?? {}) as Record<string, any>;
    const createdBy = Number(req.user!.id);
    const schemaVersion = resolveSchemaVersion(schema_version) ?? DEFAULT_SCHEMA_VERSION;
    const assinaturasPayload = sanitizeAssinaturasInput(assinaturas);
    const result = await pool.query(
      `INSERT INTO ficha_evolucao (beneficiaria_id, dados, schema_version, assinaturas, created_by)
       VALUES ($1,$2::jsonb,$3,$4::jsonb,$5) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), schemaVersion, JSON.stringify(assinaturasPayload), createdBy]
    );
    res.status(201).json(successResponse(normalizeFormRow(result.rows[0], schemaVersion)));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar ficha de evolução'));
    return;
  }
});

router.get('/ficha-evolucao/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM ficha_evolucao WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Ficha não encontrada')); return; }
    res.json(successResponse(normalizeFormRow(result.rows[0])));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter ficha'));
    return;
  }
});
router.get('/ficha-evolucao/:id/pdf', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query(
      'SELECT id, beneficiaria_id, dados, schema_version, assinaturas, created_at FROM ficha_evolucao WHERE id = $1',
      [id]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Ficha não encontrada')); return; }
    const pdf = await renderFichaEvolucaoPdf(normalizeFormRow(result.rows[0]));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ficha_evolucao_${id}.pdf"`);
    res.send(pdf);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao exportar ficha'));
    return;
  }
});

router.get('/ficha-evolucao/beneficiaria/:beneficiariaId', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { beneficiariaId } = req.params as any;
    const result = await pool.query('SELECT * FROM ficha_evolucao WHERE beneficiaria_id = $1 ORDER BY created_at DESC', [beneficiariaId]);
    res.json(successResponse(result.rows.map((row) => normalizeFormRow(row))));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar fichas'));
    return;
  }
});

router.put('/ficha-evolucao/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const body = (req.body ?? {}) as Record<string, any>;
    const schemaProvided = hasOwn(body, 'schema_version');
    const assinaturasProvided = hasOwn(body, 'assinaturas');
    const schemaVersion = schemaProvided
      ? resolveSchemaVersion(body.schema_version) ?? DEFAULT_SCHEMA_VERSION
      : null;
    const assinaturasPayload = assinaturasProvided ? sanitizeAssinaturasInput(body.assinaturas) : null;
    const result = await pool.query(
      `UPDATE ficha_evolucao
          SET dados = COALESCE($2::jsonb, dados),
              schema_version = COALESCE($3, schema_version),
              assinaturas = COALESCE($4::jsonb, assinaturas)
        WHERE id = $1 RETURNING *`,
      [
        id,
        JSON.stringify(body.dados ?? null),
        schemaProvided ? schemaVersion : null,
        assinaturasProvided ? JSON.stringify(assinaturasPayload ?? []) : null
      ]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Ficha não encontrada')); return; }
    res.json(successResponse(normalizeFormRow(result.rows[0])));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar ficha'));
    return;
  }
});

// TERMOS DE CONSENTIMENTO
router.post('/termos-consentimento', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiaria_id, dados, schema_version, assinaturas } = (req.body ?? {}) as Record<string, any>;
    const createdBy = Number(req.user!.id);
    const schemaVersion = resolveSchemaVersion(schema_version) ?? DEFAULT_SCHEMA_VERSION;
    const assinaturasPayload = sanitizeAssinaturasInput(assinaturas);
    const result = await pool.query(
      `INSERT INTO termos_consentimento (beneficiaria_id, dados, schema_version, assinaturas, created_by)
       VALUES ($1,$2::jsonb,$3,$4::jsonb,$5) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), schemaVersion, JSON.stringify(assinaturasPayload), createdBy]
    );
    res.status(201).json(successResponse(formatTermoConsentimento(normalizeFormRow(result.rows[0], schemaVersion))));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar termo'));
    return;
  }
});

router.get('/termos-consentimento/beneficiaria/:beneficiariaId', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { beneficiariaId } = req.params as any;
    const result = await pool.query(
      `SELECT id, beneficiaria_id, dados, created_at, schema_version, assinaturas, revogado_em, revogado_por, revogacao_motivo
         FROM termos_consentimento
        WHERE beneficiaria_id = $1
        ORDER BY created_at DESC`,
      [beneficiariaId]
    );
    const termos = result.rows.map((row) => formatTermoConsentimento(normalizeFormRow(row)));
    res.json(successResponse(termos));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar termos de consentimento'));
    return;
  }
});

router.get('/termos-consentimento/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query(
      `SELECT id, beneficiaria_id, dados, created_at, schema_version, assinaturas, revogado_em, revogado_por, revogacao_motivo
         FROM termos_consentimento WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Termo não encontrado')); return; }
    res.json(successResponse(formatTermoConsentimento(normalizeFormRow(result.rows[0]))));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter termo'));
    return;
  }
});
router.get('/termos-consentimento/:id/pdf', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query(
      'SELECT id, beneficiaria_id, dados, created_at, schema_version, assinaturas FROM termos_consentimento WHERE id = $1',
      [id]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Termo não encontrado')); return; }
    const pdf = await renderTermosPdf(normalizeFormRow(result.rows[0]));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="termo_${id}.pdf"`);
    res.send(pdf);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao exportar termo'));
    return;
  }
});

router.patch(
  '/termos-consentimento/:id/revogacao',
  authenticateToken,
  validateRequest(
    z.object({
      params: z.object({ id: z.coerce.number() }),
      body: z.object({ motivo: z.string().max(500).optional() }),
      query: z.any().optional(),
    })
  ),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const { id } = req.params as any;
      const { motivo } = (req.body ?? {}) as { motivo?: string };
      const userId = Number(req.user!.id);

      const existente = await pool.query(
        'SELECT id, revogado_em FROM termos_consentimento WHERE id = $1',
        [id]
      );

      if (existente.rowCount === 0) {
        res.status(404).json(errorResponse('Termo não encontrado'));
        return;
      }

      if (existente.rows[0].revogado_em) {
        res.status(400).json(errorResponse('Termo já foi revogado anteriormente'));
        return;
      }

      const motivoLimpo = typeof motivo === 'string' && motivo.trim().length > 0 ? motivo.trim() : null;

      const result = await pool.query(
        `UPDATE termos_consentimento
            SET revogado_em = NOW(),
                revogado_por = $2,
                revogacao_motivo = COALESCE($3, revogacao_motivo)
          WHERE id = $1
          RETURNING id, beneficiaria_id, dados, created_at, schema_version, assinaturas, revogado_em, revogado_por, revogacao_motivo`,
        [id, userId, motivoLimpo]
      );

      res.json(
        successResponse(
          formatTermoConsentimento(normalizeFormRow(result.rows[0])),
          'Termo revogado com sucesso'
        )
      );
      return;
    } catch (error) {
      res.status(500).json(errorResponse('Erro ao revogar termo de consentimento'));
      return;
    }
  }
);

router.put('/termos-consentimento/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const body = (req.body ?? {}) as Record<string, any>;
    const schemaProvided = hasOwn(body, 'schema_version');
    const assinaturasProvided = hasOwn(body, 'assinaturas');
    const schemaVersion = schemaProvided
      ? resolveSchemaVersion(body.schema_version) ?? DEFAULT_SCHEMA_VERSION
      : null;
    const assinaturasPayload = assinaturasProvided ? sanitizeAssinaturasInput(body.assinaturas) : null;
    const result = await pool.query(
      `UPDATE termos_consentimento
          SET dados = COALESCE($2::jsonb, dados),
              schema_version = COALESCE($3, schema_version),
              assinaturas = COALESCE($4::jsonb, assinaturas)
        WHERE id = $1 RETURNING *`,
      [
        id,
        JSON.stringify(body.dados ?? null),
        schemaProvided ? schemaVersion : null,
        assinaturasProvided ? JSON.stringify(assinaturasPayload ?? []) : null
      ]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Termo não encontrado')); return; }
    res.json(successResponse(formatTermoConsentimento(normalizeFormRow(result.rows[0]))));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar termo'));
    return;
  }
});

// VISÃO HOLÍSTICA
router.post('/visao-holistica', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiaria_id, ...dados } = (req.body || {}) as any;
    if (!beneficiaria_id) {
      res.status(400).json(errorResponse('beneficiaria_id é obrigatório'));
      return;
    }

    const createdBy = Number(req.user!.id);
    const result = await pool.query(
      `INSERT INTO visao_holistica (beneficiaria_id, dados, created_by)
       VALUES ($1, $2::jsonb, $3) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), createdBy]
    );
    res.status(201).json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar visão holística'));
    return;
  }
});

// RODA DA VIDA (genérico via tabela formularios)
router.post('/roda-vida', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiaria_id, dados, schema_version, assinaturas } = (req.body ?? {}) as Record<string, any>;
    const createdBy = Number(req.user!.id);
    const schemaVersion = resolveSchemaVersion(schema_version) ?? DEFAULT_SCHEMA_VERSION;
    const assinaturasPayload = sanitizeAssinaturasInput(assinaturas);
    const result = await pool.query(
      `INSERT INTO formularios (tipo, beneficiaria_id, dados, status, schema_version, assinaturas, usuario_id)
       VALUES ('roda_vida', $1, $2::jsonb, 'completo', $3, $4::jsonb, $5) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), schemaVersion, JSON.stringify(assinaturasPayload), createdBy]
    );
    res.status(201).json(successResponse(normalizeFormRow(result.rows[0], schemaVersion)));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar Roda da Vida'));
    return;
  }
});

router.get('/roda-vida/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM formularios WHERE id = $1 AND tipo = $2', [id, 'roda_vida']);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Roda da Vida não encontrada')); return; }
    res.json(successResponse(normalizeFormRow(result.rows[0])));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter Roda da Vida'));
    return;
  }
});

router.put('/roda-vida/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const body = (req.body ?? {}) as Record<string, any>;
    const schemaProvided = hasOwn(body, 'schema_version');
    const assinaturasProvided = hasOwn(body, 'assinaturas');
    const schemaVersion = schemaProvided
      ? resolveSchemaVersion(body.schema_version) ?? DEFAULT_SCHEMA_VERSION
      : null;
    const assinaturasPayload = assinaturasProvided ? sanitizeAssinaturasInput(body.assinaturas) : null;
    const result = await pool.query(
      `UPDATE formularios
          SET dados = COALESCE($2::jsonb, dados),
              schema_version = COALESCE($3, schema_version),
              assinaturas = COALESCE($4::jsonb, assinaturas),
              updated_at = NOW()
        WHERE id = $1 AND tipo = $5 RETURNING *`,
      [
        id,
        JSON.stringify(body.dados ?? null),
        schemaProvided ? schemaVersion : null,
        assinaturasProvided ? JSON.stringify(assinaturasPayload ?? []) : null,
        'roda_vida'
      ]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Roda da Vida não encontrada')); return; }
    res.json(successResponse(normalizeFormRow(result.rows[0])));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar Roda da Vida'));
    return;
  }
});

router.get('/visao-holistica/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM visao_holistica WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Registro não encontrado')); return; }
    res.json(successResponse(normalizeFormRow(result.rows[0])));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter visão holística'));
    return;
  }
});
router.get('/visao-holistica/:id/pdf', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT id, beneficiaria_id, dados, created_at FROM visao_holistica WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Registro não encontrado')); return; }
    const pdf = await renderVisaoHolisticaPdf(result.rows[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="visao_holistica_${id}.pdf"`);
    res.send(pdf);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao exportar visão holística'));
    return;
  }
});

// Série temporal da Ficha de Evolução por beneficiária
router.get('/ficha-evolucao/beneficiaria/:beneficiariaId/series', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiariaId } = req.params as any;
    const result = await pool.query(
      `SELECT to_char(created_at, 'YYYY-MM') as mes, COUNT(*)::int as total
       FROM ficha_evolucao WHERE beneficiaria_id = $1
       GROUP BY 1 ORDER BY 1`,
      [beneficiariaId]
    );
    res.json(successResponse({ data: result.rows }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter série de evolução'));
    return;
  }
});

router.get('/visao-holistica/beneficiaria/:beneficiariaId', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { beneficiariaId } = req.params as any;
    const result = await pool.query(
      'SELECT * FROM visao_holistica WHERE beneficiaria_id = $1 ORDER BY created_at DESC',
      [beneficiariaId]
    );
    res.json(successResponse(result.rows));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar visões holísticas'));
    return;
  }
});

router.put('/visao-holistica/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const { dados } = (req.body || {}) as any;
    // Permitir atualizar passando o objeto completo (sem beneficiaria_id)
    const payload = dados ?? req.body;

    const result = await pool.query(
      'UPDATE visao_holistica SET dados = COALESCE($2::jsonb, dados) WHERE id = $1 RETURNING *',
      [id, JSON.stringify(payload || null)]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Registro não encontrado')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar visão holística'));
    return;
  }
});

export default router;

// ========= GENÉRICOS =========
// Listar formularios (genéricos) com filtros e paginação
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const page = parseInt((req.query.page as string) || '1', 10);
    const tipo = (req.query.tipo as string) || undefined;
    const beneficiaria_id = (req.query.beneficiaria_id as string) || undefined;

    const where: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (tipo) { where.push(`tipo = $${idx++}`); params.push(tipo); }
    if (beneficiaria_id) { where.push(`beneficiaria_id = $${idx++}`); params.push(parseInt(beneficiaria_id)); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    const sql = `SELECT *, COUNT(*) OVER() as total_count FROM formularios ${whereSql} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(limit, offset);
    const result = await pool.query(sql, params);
    const total = parseInt(result.rows[0]?.total_count || '0', 10);
    const data = result.rows.map((row) => normalizeFormRow(row));
    res.json(successResponse({ data, pagination: { page, limit, total } }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar formulários'));
    return;
  }
});

// Agregador: listar todos os formulários (dedicados + genéricos) de uma beneficiária
router.get('/beneficiaria/:beneficiariaId', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiariaId } = req.params as any;
    const [gen, ana, evo, ter, vis] = await Promise.all([
      pool.query(
        'SELECT id, tipo, beneficiaria_id, dados, status, schema_version, assinaturas, created_at, usuario_id as created_by FROM formularios WHERE beneficiaria_id = $1',
        [beneficiariaId]
      ),
      pool.query(
        `SELECT id, 'anamnese' as tipo, beneficiaria_id, dados, schema_version, assinaturas, created_at, created_by FROM anamnese_social WHERE beneficiaria_id = $1`,
        [beneficiariaId]
      ),
      pool.query(
        `SELECT id, 'ficha_evolucao' as tipo, beneficiaria_id, dados, schema_version, assinaturas, created_at, created_by FROM ficha_evolucao WHERE beneficiaria_id = $1`,
        [beneficiariaId]
      ),
      pool.query(
        `SELECT id, 'termos_consentimento' as tipo, beneficiaria_id, dados, schema_version, assinaturas, created_at, created_by, revogado_em, revogado_por, revogacao_motivo FROM termos_consentimento WHERE beneficiaria_id = $1`,
        [beneficiariaId]
      ),
      pool.query(`SELECT id, 'visao_holistica' as tipo, beneficiaria_id, dados, created_at, created_by FROM visao_holistica WHERE beneficiaria_id = $1`, [beneficiariaId])
    ]);
    const data = [
      ...gen.rows.map((row) => normalizeFormRow(row)),
      ...ana.rows.map((row) => normalizeFormRow(row)),
      ...evo.rows.map((row) => normalizeFormRow(row)),
      ...ter.rows.map((row) => normalizeFormRow(row)),
      ...vis.rows
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(successResponse({ data, total: data.length }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar formulários da beneficiária'));
    return;
  }
});

// Criar formulário genérico por tipo
router.post('/:tipo', authenticateToken,
  validateRequest(z.object({
    body: z.object({
      beneficiaria_id: z.coerce.number(),
      dados: z.any().optional(),
      status: z.string().optional(),
      observacoes: z.string().optional(),
      schema_version: z.string().max(50).optional(),
      assinaturas: z.array(z.any()).optional(),
    }),
    params: z.object({ tipo: z.string().min(1) }),
    query: z.any().optional(),
  })),
  async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { tipo } = req.params as any;
    const { beneficiaria_id, dados, status, observacoes, schema_version, assinaturas } = (req.body || {}) as any;
    const userId = Number(req.user!.id);
    if (!beneficiaria_id) { res.status(400).json(errorResponse('beneficiaria_id é obrigatório')); return; }
    const schemaVersion = resolveSchemaVersion(schema_version) ?? DEFAULT_SCHEMA_VERSION;
    const assinaturasPayload = sanitizeAssinaturasInput(assinaturas);
    const created = await pool.query(
      `INSERT INTO formularios (tipo, beneficiaria_id, dados, status, observacoes, schema_version, assinaturas, usuario_id)
       VALUES ($1,$2,$3::jsonb,COALESCE($4,'completo'),$5,$6,$7::jsonb,$8) RETURNING *`,
      [
        tipo,
        beneficiaria_id,
        JSON.stringify(dados || {}),
        status,
        observacoes || null,
        schemaVersion,
        JSON.stringify(assinaturasPayload),
        userId
      ]
    );
    res.status(201).json(successResponse(normalizeFormRow(created.rows[0], schemaVersion)));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar formulário'));
    return;
  }
});

// Obter/Atualizar genérico e Exportar PDF
router.get('/:tipo/:id', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { tipo, id } = req.params as any;
    const result = await pool.query('SELECT * FROM formularios WHERE id = $1 AND tipo = $2', [id, tipo]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Formulário não encontrado')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter formulário'));
    return;
  }
});

router.put('/:tipo/:id', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { tipo, id } = req.params as any;
    const body = (req.body || {}) as any;
    const schemaProvided = hasOwn(body, 'schema_version');
    const assinaturasProvided = hasOwn(body, 'assinaturas');
    const schemaVersion = schemaProvided
      ? resolveSchemaVersion(body.schema_version) ?? DEFAULT_SCHEMA_VERSION
      : null;
    const assinaturasPayload = assinaturasProvided ? sanitizeAssinaturasInput(body.assinaturas) : null;
    const result = await pool.query(
      `UPDATE formularios
          SET dados = COALESCE($2::jsonb, dados),
              status = COALESCE($3, status),
              observacoes = COALESCE($4, observacoes),
              schema_version = COALESCE($5, schema_version),
              assinaturas = COALESCE($6::jsonb, assinaturas),
              updated_at = NOW()
        WHERE id = $1 AND tipo = $7 RETURNING *`,
      [
        id,
        JSON.stringify(body.dados ?? null),
        body.status || null,
        body.observacoes || null,
        schemaProvided ? schemaVersion : null,
        assinaturasProvided ? JSON.stringify(assinaturasPayload ?? []) : null,
        tipo
      ]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Formulário não encontrado')); return; }
    res.json(successResponse(normalizeFormRow(result.rows[0])));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar formulário'));
    return;
  }
});

router.get('/:tipo/:id/pdf', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { tipo, id } = req.params as any;
    const result = await pool.query('SELECT * FROM formularios WHERE id = $1 AND tipo = $2', [id, tipo]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Formulário não encontrado')); return; }
    const pdf = await renderFormPdf(normalizeFormRow(result.rows[0]), { titulo: 'Formulário', subtitulo: `Tipo: ${tipo}` });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="form_${tipo}_${id}.pdf"`);
    res.send(pdf);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao exportar PDF'));
    return;
  }
});

// Excluir formulário genérico por ID
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('DELETE FROM formularios WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Formulário não encontrado')); return; }
    res.json(successResponse({ id }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao excluir formulário'));
    return;
  }
});
