import { Pool } from 'pg';
import { PostgresBaseRepository } from './postgresBaseRepository';
import { Beneficiaria } from '../models/beneficiaria';
import { NotFoundError } from '../utils/errors';

export class BeneficiariasRepository extends PostgresBaseRepository<Beneficiaria> {
  constructor(pool: Pool) {
    super(pool, 'beneficiarias');
  }

  async findByCPF(cpf: string): Promise<Beneficiaria | null> {
    return this.findByField('cpf', cpf);
  }

  async buscarPorTexto(texto: string): Promise<Beneficiaria[]> {
    const result = await this.query(
      `SELECT * FROM beneficiarias
       WHERE 
         deleted_at IS NULL AND
         (
           nome_completo ILIKE $1 OR
           cpf LIKE $1 OR
           email ILIKE $1 OR
           telefone LIKE $1 OR
           endereco ILIKE $1
         )
       ORDER BY
         CASE 
           WHEN nome_completo ILIKE $1 THEN 1
           WHEN cpf LIKE $1 THEN 2
           ELSE 3
         END,
         nome_completo ASC
       LIMIT 10`,
      [`%${texto}%`]
    );

    return result.rows;
  }

  async listarAtivas(
    page: number = 1,
    limit: number = 10,
    filtros?: {
      status?: 'ativa' | 'inativa' | 'em_acompanhamento';
      medida_protetiva?: boolean;
      tipo_violencia?: string[];
      data_inicio?: Date;
      data_fim?: Date;
    }
  ) {
    let whereConditions = ['deleted_at IS NULL'];
    let params: any[] = [];
    let paramCount = 1;

    if (filtros?.status) {
      whereConditions.push(`status = $${paramCount}`);
      params.push(filtros.status);
      paramCount++;
    }

    if (filtros?.medida_protetiva !== undefined) {
      whereConditions.push(`medida_protetiva = $${paramCount}`);
      params.push(filtros.medida_protetiva);
      paramCount++;
    }

    if (filtros?.tipo_violencia?.length) {
      whereConditions.push(`tipo_violencia && $${paramCount}`);
      params.push(filtros.tipo_violencia);
      paramCount++;
    }

    if (filtros?.data_inicio) {
      whereConditions.push(`created_at >= $${paramCount}`);
      params.push(filtros.data_inicio);
      paramCount++;
    }

    if (filtros?.data_fim) {
      whereConditions.push(`created_at <= $${paramCount}`);
      params.push(filtros.data_fim);
      paramCount++;
    }

    const whereClause = whereConditions.length
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const [total, beneficiarias] = await Promise.all([
      this.query(
        `SELECT COUNT(*) FROM beneficiarias ${whereClause}`,
        params
      ),
      this.query(
        `SELECT * FROM beneficiarias
         ${whereClause}
         ORDER BY nome_completo ASC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...params, limit, (page - 1) * limit]
      )
    ]);

    return {
      data: beneficiarias.rows,
      total: parseInt(total.rows[0].count),
      pages: Math.ceil(parseInt(total.rows[0].count) / limit)
    };
  }

  async softDelete(id: number): Promise<void> {
    const result = await this.query(
      `UPDATE beneficiarias
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError(`Beneficiária não encontrada com ID: ${id}`);
    }
  }

  async restaurar(id: number): Promise<Beneficiaria> {
    const result = await this.query(
      `UPDATE beneficiarias
       SET deleted_at = NULL
       WHERE id = $1 AND deleted_at IS NOT NULL
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError(`Beneficiária não encontrada com ID: ${id}`);
    }

    return result.rows[0];
  }

  async atualizarStatus(
    id: number,
    status: 'ativa' | 'inativa' | 'em_acompanhamento',
    observacao?: string
  ): Promise<Beneficiaria> {
    return this.executeTransaction(async (client) => {
      const result = await client.query(
        `UPDATE beneficiarias
         SET 
           status = $1,
           observacoes = CASE 
             WHEN $2::text IS NOT NULL 
             THEN COALESCE(observacoes, '') || E'\\n' || $2
             ELSE observacoes
           END,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND deleted_at IS NULL
         RETURNING *`,
        [status, observacao, id]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError(`Beneficiária não encontrada com ID: ${id}`);
      }

      await client.query(
        `INSERT INTO historico_status_beneficiaria
         (beneficiaria_id, status_anterior, status_novo, observacao)
         VALUES ($1, 
           (SELECT status FROM beneficiarias WHERE id = $1),
           $2, $3)`,
        [id, status, observacao]
      );

      return result.rows[0];
    });
  }

  async obterEstatisticas() {
    const result = await this.query(`
      SELECT
        COUNT(*) as total_beneficiarias,
        COUNT(*) FILTER (WHERE status = 'ativa') as ativas,
        COUNT(*) FILTER (WHERE status = 'em_acompanhamento') as em_acompanhamento,
        COUNT(*) FILTER (WHERE status = 'inativa') as inativas,
        COUNT(*) FILTER (WHERE medida_protetiva = true) as com_medida_protetiva,
        COUNT(*) FILTER (WHERE acompanhamento_juridico = true) as acompanhamento_juridico,
        COUNT(*) FILTER (WHERE acompanhamento_psicologico = true) as acompanhamento_psicologico,
        ROUND(AVG(num_dependentes) FILTER (WHERE num_dependentes IS NOT NULL), 2) as media_dependentes,
        ROUND(AVG(renda_familiar) FILTER (WHERE renda_familiar IS NOT NULL), 2) as media_renda_familiar
      FROM beneficiarias
      WHERE deleted_at IS NULL
    `);

    const tiposViolencia = await this.query(`
      SELECT 
        unnest(tipo_violencia) as tipo,
        COUNT(*) as quantidade
      FROM beneficiarias
      WHERE deleted_at IS NULL
      GROUP BY tipo
      ORDER BY quantidade DESC
    `);

    return {
      ...result.rows[0],
      tipos_violencia: tiposViolencia.rows
    };
  }
}
