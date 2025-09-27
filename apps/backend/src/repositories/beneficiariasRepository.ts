import { Pool, PoolClient } from 'pg';
import { PostgresBaseRepository } from './postgresBaseRepository';
import { Beneficiaria, BeneficiariaDetalhada, BeneficiariaFamiliar } from '../models/beneficiaria';
import { NotFoundError, AppError } from '../utils';

export class BeneficiariasRepository extends PostgresBaseRepository<Beneficiaria> {
  constructor(pool: Pool) {
    super(pool, 'beneficiarias');
  }

  private async withTransaction<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await handler(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async runQuery(client: Pool | PoolClient, text: string, params?: any[]) {
    return client.query(text, params);
  }

  private async fetchFamiliares(client: Pool | PoolClient, beneficiariaId: number): Promise<BeneficiariaFamiliar[]> {
    const result = await this.runQuery(
      client,
      `SELECT id, nome, parentesco, data_nascimento, trabalha, renda_mensal, observacoes
         FROM beneficiaria_familiares
        WHERE beneficiaria_id = $1
        ORDER BY created_at ASC`,
      [beneficiariaId]
    );

    return result.rows.map(row => ({
      id: row.id,
      nome: row.nome,
      parentesco: row.parentesco ?? undefined,
      data_nascimento: row.data_nascimento ?? undefined,
      trabalha: row.trabalha ?? undefined,
      renda_mensal: row.renda_mensal !== null ? Number(row.renda_mensal) : undefined,
      observacoes: row.observacoes ?? undefined
    }));
  }

  private async fetchVulnerabilidades(client: Pool | PoolClient, beneficiariaId: number): Promise<string[]> {
    const result = await this.runQuery(
      client,
      `SELECT v.slug
         FROM beneficiaria_vulnerabilidades bv
         JOIN vulnerabilidades v ON v.id = bv.vulnerabilidade_id
        WHERE bv.beneficiaria_id = $1
        ORDER BY v.slug`,
      [beneficiariaId]
    );

    return result.rows.map(row => row.slug as string);
  }

  private async saveFamiliares(
    client: PoolClient,
    beneficiariaId: number,
    familiares?: BeneficiariaFamiliar[]
  ) {
    if (familiares === undefined) return;

    await this.runQuery(client, 'DELETE FROM beneficiaria_familiares WHERE beneficiaria_id = $1', [beneficiariaId]);

    if (!familiares.length) return;

    for (const familiar of familiares) {
      await this.runQuery(
        client,
        `INSERT INTO beneficiaria_familiares (
           beneficiaria_id, nome, parentesco, data_nascimento, trabalha, renda_mensal, observacoes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)` ,
        [
          beneficiariaId,
          familiar.nome.trim(),
          familiar.parentesco ?? null,
          familiar.data_nascimento ? new Date(familiar.data_nascimento) : null,
          familiar.trabalha ?? null,
          familiar.renda_mensal ?? null,
          familiar.observacoes ?? null
        ]
      );
    }
  }

  private async saveVulnerabilidades(
    client: PoolClient,
    beneficiariaId: number,
    vulnerabilidades?: string[]
  ) {
    if (vulnerabilidades === undefined) return;

    await this.runQuery(
      client,
      'DELETE FROM beneficiaria_vulnerabilidades WHERE beneficiaria_id = $1',
      [beneficiariaId]
    );

    if (!vulnerabilidades.length) return;

    await this.runQuery(
      client,
      `INSERT INTO beneficiaria_vulnerabilidades (beneficiaria_id, vulnerabilidade_id)
         SELECT $1, v.id
           FROM vulnerabilidades v
          WHERE v.slug = ANY($2::text[])`,
      [beneficiariaId, vulnerabilidades]
    );
  }

  private async attachRelations(
    client: Pool | PoolClient,
    beneficiaria: Beneficiaria
  ): Promise<BeneficiariaDetalhada> {
    const [familiares, vulnerabilidades] = await Promise.all([
      this.fetchFamiliares(client, beneficiaria.id),
      this.fetchVulnerabilidades(client, beneficiaria.id)
    ]);

    return { ...beneficiaria, familiares, vulnerabilidades };
  }

  // Compatibilidade com testes legados
  async criar(data: Partial<Beneficiaria>): Promise<Beneficiaria> {
    return this.create(data as any);
  }

  async createWithRelations(
    data: Partial<Beneficiaria>,
    familiares?: BeneficiariaFamiliar[],
    vulnerabilidades?: string[]
  ): Promise<BeneficiariaDetalhada> {
    return this.withTransaction(async (client) => {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = fields.map((_, index) => `$${index + 1}`);

      const insert = await this.runQuery(
        client,
        `INSERT INTO beneficiarias (${fields.join(', ')})
         VALUES (${placeholders.join(', ')})
         RETURNING *`,
        values
      );

      const beneficiaria = insert.rows[0] as Beneficiaria;
      await this.saveFamiliares(client, beneficiaria.id, familiares ?? []);
      await this.saveVulnerabilidades(client, beneficiaria.id, vulnerabilidades ?? []);

      return this.attachRelations(client, beneficiaria);
    });
  }

  async updateWithRelations(
    id: number,
    data: Partial<Beneficiaria>,
    familiares?: BeneficiariaFamiliar[],
    vulnerabilidades?: string[]
  ): Promise<BeneficiariaDetalhada> {
    return this.withTransaction(async (client) => {
      if (Object.keys(data).length > 0) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

        const updateResult = await this.runQuery(
          client,
          `UPDATE beneficiarias
             SET ${setClause}, updated_at = CURRENT_TIMESTAMP
           WHERE id = $${fields.length + 1} AND deleted_at IS NULL
           RETURNING *`,
          [...values, id]
        );

        if (updateResult.rowCount === 0) {
          throw new NotFoundError(`Beneficiária não encontrada com ID: ${id}`);
        }
      }

      await this.saveFamiliares(client, id, familiares);
      await this.saveVulnerabilidades(client, id, vulnerabilidades);

      const refreshed = await this.runQuery(
        client,
        'SELECT * FROM beneficiarias WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (refreshed.rowCount === 0) {
        throw new NotFoundError(`Beneficiária não encontrada com ID: ${id}`);
      }

      return this.attachRelations(client, refreshed.rows[0] as Beneficiaria);
    });
  }

  async findWithRelations(id: number): Promise<BeneficiariaDetalhada | null> {
    const beneficiaria = await this.findById(id);
    if (!beneficiaria) {
      return null;
    }
    return this.attachRelations(this.pool, beneficiaria);
  }

  async buscarPorId(id: number): Promise<Beneficiaria> {
    const found = await this.findById(id);
    if (!found) {
      throw new AppError('Beneficiária não encontrada', 404);
    }
    return found;
  }

  async listar(
    filtros: any = {},
    paginacao: { page?: number; limit?: number } = {}
  ): Promise<{ items: Beneficiaria[]; total: number; page: number; totalPages: number }> {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? 10;
    const result = await this.listarAtivas(page, limit, filtros);
    return {
      items: result.data,
      total: result.total,
      page,
      totalPages: result.pages
    };
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
    const whereConditions = ['deleted_at IS NULL'];
    const params: any[] = [];
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

  async getResumo(id: number) {
    const info = await this.query(
      'SELECT id, nome_completo, status, created_at, updated_at FROM beneficiarias WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (info.rowCount === 0) {
      throw new AppError('Beneficiária não encontrada', 404);
    }

    const [anamnese, ficha, termos, visao, genericos, atend, parts] = await Promise.all([
      this.query('SELECT COUNT(*)::int AS c FROM anamnese_social WHERE beneficiaria_id = $1', [id]),
      this.query('SELECT COUNT(*)::int AS c FROM ficha_evolucao WHERE beneficiaria_id = $1', [id]),
      this.query('SELECT COUNT(*)::int AS c FROM termos_consentimento WHERE beneficiaria_id = $1', [id]),
      this.query('SELECT COUNT(*)::int AS c FROM visao_holistica WHERE beneficiaria_id = $1', [id]),
      this.query('SELECT COUNT(*)::int AS c FROM formularios WHERE beneficiaria_id = $1', [id]),
      this.query(
        'SELECT COUNT(*)::int AS c, MAX(data_atendimento) AS ultimo FROM historico_atendimentos WHERE beneficiaria_id = $1',
        [id]
      ),
      this.query('SELECT COUNT(*)::int AS c FROM participacoes WHERE beneficiaria_id = $1 AND ativo = true', [id])
    ]);

    return {
      beneficiaria: info.rows[0],
      formularios: {
        total:
          anamnese.rows[0].c +
          ficha.rows[0].c +
          termos.rows[0].c +
          visao.rows[0].c +
          genericos.rows[0].c,
        anamnese: anamnese.rows[0].c,
        ficha_evolucao: ficha.rows[0].c,
        termos: termos.rows[0].c,
        visao_holistica: visao.rows[0].c,
        genericos: genericos.rows[0].c
      },
      atendimentos: {
        total: atend.rows[0].c,
        ultimo_atendimento: atend.rows[0].ultimo
      },
      participacoes: {
        total_ativas: parts.rows[0].c
      }
    };
  }

  async getAtividades(beneficiariaId: number, limit: number, offset: number) {
    const result = await this.query(
      `SELECT * FROM (
           SELECT 'formulario' as type, id, created_at, usuario_id as created_by, null::text as created_by_name
             FROM formularios WHERE beneficiaria_id = $1
           UNION ALL
           SELECT 'anamnese' as type, id, created_at, created_by, null::text as created_by_name
             FROM anamnese_social WHERE beneficiaria_id = $1
           UNION ALL
           SELECT 'ficha_evolucao' as type, id, created_at, created_by, null::text as created_by_name
             FROM ficha_evolucao WHERE beneficiaria_id = $1
           UNION ALL
           SELECT 'termos_consentimento' as type, id, created_at, created_by, null::text as created_by_name
             FROM termos_consentimento WHERE beneficiaria_id = $1
           UNION ALL
           SELECT 'visao_holistica' as type, id, created_at, created_by, null::text as created_by_name
             FROM visao_holistica WHERE beneficiaria_id = $1
         ) acts
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
      [beneficiariaId, limit, offset]
    );

    return result.rows;
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
      // Buscar status anterior com lock
      const prev = await client.query(
        `SELECT status FROM beneficiarias WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [id]
      );
      if (prev.rowCount === 0) {
        throw new NotFoundError(`Beneficiária não encontrada com ID: ${id}`);
      }
      const statusAnterior: string = prev.rows[0].status;

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

      await client.query(
        `INSERT INTO historico_status_beneficiaria
         (beneficiaria_id, status_anterior, status_novo, observacao)
         VALUES ($1, $2, $3, $4)`,
        [id, statusAnterior, status, observacao]
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
