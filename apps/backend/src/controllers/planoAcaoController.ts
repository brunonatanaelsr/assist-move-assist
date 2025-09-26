import { TypedRequest, TypedResponse } from '../types/express';
import pool from '../config/database';
import { logger } from '../services/logger';
import { PlanoAcao, PlanoAcaoResponse } from '../models/PlanoAcao';
import { formatDateToISO } from '../utils/dateFormatter';
import { validatePlanoAcao } from '../validators/planoAcao.validator';
import { ZodError } from 'zod';

const hydratePlano = (row: any): PlanoAcao => {
  const itens = Array.isArray(row.itens) ? row.itens : [];
  return {
    id: row.id,
    beneficiaria_id: row.beneficiaria_id,
    criado_por: row.criado_por ?? null,
    criado_em: formatDateToISO(row.criado_em),
    atualizado_em: formatDateToISO(row.atualizado_em),
    objetivo_principal: row.objetivo_principal,
    areas_prioritarias: row.areas_prioritarias ?? [],
    observacoes: row.observacoes ?? null,
    primeira_avaliacao_em: formatDateToISO(row.primeira_avaliacao_em),
    primeira_avaliacao_nota: row.primeira_avaliacao_nota ?? null,
    segunda_avaliacao_em: formatDateToISO(row.segunda_avaliacao_em),
    segunda_avaliacao_nota: row.segunda_avaliacao_nota ?? null,
    assinatura_beneficiaria: row.assinatura_beneficiaria ?? null,
    assinatura_responsavel: row.assinatura_responsavel ?? null,
    itens: itens.map((item: any) => ({
      id: item.id,
      titulo: item.titulo,
      responsavel: item.responsavel ?? null,
      prazo: formatDateToISO(item.prazo ?? null),
      status: item.status,
      suporte_oferecido: item.suporte_oferecido ?? null,
      criado_em: formatDateToISO(item.criado_em ?? null),
      atualizado_em: formatDateToISO(item.atualizado_em ?? null)
    }))
  };
};

const buildBaseQuery = (filters: { beneficiariaId?: number; planoId?: number } = {}) => {
  const params: any[] = [];
  const whereParts: string[] = [];

  if (filters.beneficiariaId) {
    params.push(filters.beneficiariaId);
    whereParts.push(`pa.beneficiaria_id = $${params.length}`);
  }

  if (filters.planoId) {
    params.push(filters.planoId);
    whereParts.push(`pa.id = $${params.length}`);
  }

  const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  const sql = `
    SELECT pa.*, COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', i.id,
          'titulo', i.titulo,
          'responsavel', i.responsavel,
          'prazo', i.prazo,
          'status', i.status,
          'suporte_oferecido', i.suporte_oferecido,
          'criado_em', i.criado_em,
          'atualizado_em', i.atualizado_em
        ) ORDER BY i.criado_em
      ) FILTER (WHERE i.id IS NOT NULL), '[]'::json
    ) AS itens
    FROM planos_acao pa
    LEFT JOIN plano_acao_itens i ON i.plano_id = pa.id
    ${where}
    GROUP BY pa.id
    ORDER BY pa.criado_em DESC`;

  return { sql, params };
};

export const planoAcaoController = {
  async listar(req: TypedRequest, res: TypedResponse<PlanoAcaoResponse>): Promise<TypedResponse<PlanoAcaoResponse>> {
    try {
      const beneficiariaId = req.query?.beneficiaria_id ? Number(req.query.beneficiaria_id) : undefined;
      const { sql, params } = buildBaseQuery({ beneficiariaId });
      const result = await pool.query(sql, params);
      return res.json({ data: result.rows.map(hydratePlano) });
    } catch (error) {
      logger.error('Erro ao listar planos de ação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async obterPorId(req: TypedRequest, res: TypedResponse<PlanoAcaoResponse>): Promise<TypedResponse<PlanoAcaoResponse>> {
    try {
      const { id } = req.params;
      const { sql, params } = buildBaseQuery({ planoId: Number(id) });
      const result = await pool.query(sql, params);

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      return res.json({ data: hydratePlano(result.rows[0]) });
    } catch (error) {
      logger.error('Erro ao obter plano de ação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async criar(req: TypedRequest, res: TypedResponse<PlanoAcaoResponse>): Promise<TypedResponse<PlanoAcaoResponse>> {
    try {
      const payload = await validatePlanoAcao(req.body);
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const { itens, ...planData } = payload;
        if (!Array.isArray(itens) || itens.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Informe ao menos uma ação planejada' });
        }

        const creatorId = (req as any)?.user?.id;
        if (planData.criado_por === undefined && creatorId) {
          planData.criado_por = Number(creatorId);
        }

        if (planData.areas_prioritarias === undefined) {
          planData.areas_prioritarias = [];
        }

        const campos = Object.keys(planData);
        const valores = Object.values(planData);
        const placeholders = campos.map((_, idx) => `$${idx + 1}`);

        const planoResult = await client.query(
          `INSERT INTO planos_acao (${campos.join(', ')})
           VALUES (${placeholders.join(', ')})
           RETURNING *`,
          valores
        );

        const plano = planoResult.rows[0];

        for (const item of itens) {
          await client.query(
            `INSERT INTO plano_acao_itens (plano_id, titulo, responsavel, prazo, status, suporte_oferecido)
             VALUES ($1,$2,$3,$4,$5,$6)` ,
            [
              plano.id,
              item.titulo,
              item.responsavel ?? null,
              item.prazo ?? null,
              item.status ?? 'pendente',
              item.suporte_oferecido ?? null
            ]
          );
        }

        await client.query('COMMIT');

        const { sql, params } = buildBaseQuery({ planoId: plano.id });
        const full = await pool.query(sql, params);
        if (!full.rows.length) {
          logger.warn('Plano de ação criado sem retorno agregado', { planoId: plano.id });
          return res.status(201).json({ data: hydratePlano(plano) });
        }
        return res.status(201).json({ data: hydratePlano(full.rows[0]) });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Dados inválidos', detalhes: error.errors });
      }
      logger.error('Erro ao criar plano de ação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async atualizar(req: TypedRequest, res: TypedResponse<PlanoAcaoResponse>): Promise<TypedResponse<PlanoAcaoResponse>> {
    try {
      const { id } = req.params;
      const payload = await validatePlanoAcao(req.body, true);
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const { itens, ...planData } = payload;
        const campos = Object.keys(planData).filter((key) => planData[key as keyof typeof planData] !== undefined);

        if (campos.length) {
          const setClause = campos.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
          const valores = campos.map((field) => planData[field as keyof typeof planData]);
          const updateResult = await client.query(
            `UPDATE planos_acao
               SET ${setClause}, atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $${campos.length + 1}
             RETURNING *`,
            [...valores, Number(id)]
          );

          if (!updateResult.rowCount) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Plano não encontrado' });
          }
        } else {
          const exists = await client.query('SELECT id FROM planos_acao WHERE id = $1', [Number(id)]);
          if (!exists.rowCount) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Plano não encontrado' });
          }
        }

        if (Array.isArray(itens)) {
          if (itens.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Informe ao menos uma ação planejada' });
          }
          await client.query('DELETE FROM plano_acao_itens WHERE plano_id = $1', [Number(id)]);
          for (const item of itens) {
            await client.query(
              `INSERT INTO plano_acao_itens (plano_id, titulo, responsavel, prazo, status, suporte_oferecido)
               VALUES ($1,$2,$3,$4,$5,$6)` ,
              [
                Number(id),
                item.titulo,
                item.responsavel ?? null,
                item.prazo ?? null,
                item.status ?? 'pendente',
                item.suporte_oferecido ?? null
              ]
            );
          }
        }

        await client.query('COMMIT');

        const { sql, params } = buildBaseQuery({ planoId: Number(id) });
        const full = await pool.query(sql, params);
        if (!full.rows.length) {
          return res.status(404).json({ error: 'Plano não encontrado' });
        }
        return res.json({ data: hydratePlano(full.rows[0]) });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Dados inválidos', detalhes: error.errors });
      }
      logger.error('Erro ao atualizar plano de ação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};
