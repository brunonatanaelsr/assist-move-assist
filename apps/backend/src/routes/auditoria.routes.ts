import { Request, Response, Router } from 'express';
import type { ParsedQs } from 'qs';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { loggerService } from '../services/logger';
import { stringify } from 'csv-stringify/sync';

interface AuditLogRecord {
  id: number;
  tabela: string;
  operacao: string;
  registro_id: string | null;
  usuario_id: number | null;
  detalhes: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: Date;
}

interface AppliedFilters {
  entidade?: string | null;
  usuarioId?: number | null;
  dataInicio?: string | null;
  dataFim?: string | null;
}

type QueryValue = string | ParsedQs | Array<string | ParsedQs> | undefined;

const router = Router();

function extractFirst(value: QueryValue): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}

function parsePositiveInt(value: QueryValue, fallback: number): number {
  const raw = extractFirst(value);
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

function parseDate(value: QueryValue): Date | null {
  const raw = extractFirst(value);
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date.getTime());
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

function buildFilters(query: Request['query']): {
  whereClause: string;
  params: Array<string | number | Date>;
  applied: AppliedFilters;
} {
  const filters: string[] = [];
  const params: Array<string | number | Date> = [];
  const applied: AppliedFilters = {};

  const entidade = extractFirst(query.entidade);
  if (typeof entidade === 'string' && entidade.trim().length > 0) {
    applied.entidade = entidade.trim();
    params.push(applied.entidade);
    filters.push(`tabela = $${params.length}`);
  }

  const usuarioIdRaw = extractFirst(query.usuarioId);
  if (typeof usuarioIdRaw === 'string' && usuarioIdRaw.trim().length > 0) {
    const usuarioId = Number.parseInt(usuarioIdRaw, 10);
    if (!Number.isNaN(usuarioId)) {
      applied.usuarioId = usuarioId;
      params.push(usuarioId);
      filters.push(`usuario_id = $${params.length}`);
    }
  }

  const dataInicio = parseDate(query.dataInicio);
  if (dataInicio) {
    applied.dataInicio = dataInicio.toISOString();
    params.push(dataInicio);
    filters.push(`created_at >= $${params.length}`);
  }

  const dataFim = parseDate(query.dataFim);
  if (dataFim) {
    const fimDoDia = endOfDay(dataFim);
    applied.dataFim = fimDoDia.toISOString();
    params.push(fimDoDia);
    filters.push(`created_at <= $${params.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  return { whereClause, params, applied };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 25), 100);
    const offset = (page - 1) * limit;

    const { whereClause, params, applied } = buildFilters(req.query);

    const dataSql = `
      SELECT id, tabela, operacao, registro_id, usuario_id, detalhes, ip, user_agent, created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const countSql = `SELECT COUNT(*)::int AS total FROM audit_logs ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query<AuditLogRecord>(dataSql, [...params, limit, offset]),
      pool.query<{ total: number }>(countSql, params)
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    const registros = dataResult.rows.map((row) => ({
      ...row,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    }));

    res.json(successResponse({
      registros,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      filtros: applied
    }, 'Registros de auditoria recuperados com sucesso'));
  } catch (error) {
    loggerService.error('Erro ao listar logs de auditoria', { error });
    res.status(500).json(errorResponse('Erro ao listar logs de auditoria'));
  }
});

router.get('/export', async (req: Request, res: Response) => {
  try {
    const { whereClause, params } = buildFilters(req.query);
    const sql = `
      SELECT id, tabela, operacao, registro_id, usuario_id, detalhes, ip, user_agent, created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC, id DESC
    `;

    const result = await pool.query<AuditLogRecord>(sql, params);
    const normalized = result.rows.map((row) => ({
      ...row,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    }));

    const csv = stringify(normalized, {
      header: true,
      columns: [
        { key: 'id', header: 'id' },
        { key: 'tabela', header: 'tabela' },
        { key: 'operacao', header: 'operacao' },
        { key: 'registro_id', header: 'registro_id' },
        { key: 'usuario_id', header: 'usuario_id' },
        { key: 'detalhes', header: 'detalhes' },
        { key: 'ip', header: 'ip' },
        { key: 'user_agent', header: 'user_agent' },
        { key: 'created_at', header: 'created_at' }
      ]
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="auditoria_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) {
    loggerService.error('Erro ao exportar logs de auditoria', { error });
    res.status(500).json(errorResponse('Erro ao exportar logs de auditoria'));
  }
});

export default router;
