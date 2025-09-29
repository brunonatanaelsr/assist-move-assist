import { Pool, PoolClient } from 'pg';
import { PostgresBaseRepository } from './postgresBaseRepository';
import {
  Beneficiaria,
  BeneficiariaDetalhada,
  BeneficiariaFamiliar,
  BeneficiariaDependente,
  BeneficiariaInfoSocioeconomica,
  BeneficiariaHistoricoAtendimento
} from '../models/beneficiaria';
import {
  BeneficiariaAtividadeLista,
  BeneficiariaResumoDetalhado
} from '../types/beneficiarias';
import { NotFoundError, AppError } from '../utils';

export class BeneficiariasRepository extends PostgresBaseRepository<Beneficiaria> {
  constructor(pool: Pool) {
    super(pool, 'beneficiarias');
  }

  private buildFotoUrl(filename?: string | null): string | null {
    if (!filename) {
      return null;
    }
    return `/api/upload/files/${encodeURIComponent(filename)}`;
  }

  private decorateBeneficiaria(beneficiaria: Beneficiaria): Beneficiaria {
    const fotoUrl = this.buildFotoUrl(beneficiaria.foto_filename);
    return {
      ...beneficiaria,
      foto_url: fotoUrl ?? undefined
    };
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

  private async fetchInfoSocioeconomica(
    client: Pool | PoolClient,
    beneficiariaId: number
  ): Promise<BeneficiariaInfoSocioeconomica | null> {
    const result = await this.runQuery(
      client,
      `SELECT renda_familiar, quantidade_moradores, tipo_moradia, escolaridade, profissao,
              situacao_trabalho, beneficios_sociais, created_at, updated_at
         FROM beneficiaria_info_socioeconomica
        WHERE beneficiaria_id = $1`,
      [beneficiariaId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      renda_familiar: row.renda_familiar !== null ? Number(row.renda_familiar) : null,
      quantidade_moradores: row.quantidade_moradores !== null ? Number(row.quantidade_moradores) : null,
      tipo_moradia: row.tipo_moradia ?? null,
      escolaridade: row.escolaridade ?? null,
      profissao: row.profissao ?? null,
      situacao_trabalho: row.situacao_trabalho ?? null,
      beneficios_sociais: row.beneficios_sociais ?? null,
      created_at: row.created_at ?? undefined,
      updated_at: row.updated_at ?? undefined
    };
  }

  private async fetchDependentes(
    client: Pool | PoolClient,
    beneficiariaId: number
  ): Promise<BeneficiariaDependente[]> {
    const result = await this.runQuery(
      client,
      `SELECT id, nome_completo, data_nascimento, parentesco, cpf, created_at, updated_at
         FROM beneficiaria_dependentes
        WHERE beneficiaria_id = $1
        ORDER BY data_nascimento DESC NULLS LAST, created_at DESC`,
      [beneficiariaId]
    );

    return result.rows.map(row => ({
      id: row.id,
      nome_completo: row.nome_completo,
      data_nascimento: row.data_nascimento,
      parentesco: row.parentesco,
      cpf: row.cpf ?? null,
      created_at: row.created_at ?? undefined,
      updated_at: row.updated_at ?? undefined
    }));
  }

  private async fetchHistoricoAtendimentos(
    client: Pool | PoolClient,
    beneficiariaId: number
  ): Promise<BeneficiariaHistoricoAtendimento[]> {
    const result = await this.runQuery(
      client,
      `SELECT id, tipo_atendimento, data_atendimento, descricao, encaminhamentos, usuario_id, created_at, updated_at
         FROM historico_atendimentos
        WHERE beneficiaria_id = $1
        ORDER BY data_atendimento DESC, created_at DESC
        LIMIT 100`,
      [beneficiariaId]
    );

    return result.rows.map(row => ({
      id: row.id,
      data: row.data_atendimento,
      tipo: row.tipo_atendimento,
      descricao: row.descricao,
      encaminhamentos: row.encaminhamentos ?? null,
      profissional_id: row.usuario_id ?? null,
      created_at: row.created_at ?? undefined,
      updated_at: row.updated_at ?? undefined
    }));
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
    const [familiares, vulnerabilidades, infoSocio, dependentes, historico] = await Promise.all([
      this.fetchFamiliares(client, beneficiaria.id),
      this.fetchVulnerabilidades(client, beneficiaria.id),
      this.fetchInfoSocioeconomica(client, beneficiaria.id),
      this.fetchDependentes(client, beneficiaria.id),
      this.fetchHistoricoAtendimentos(client, beneficiaria.id)
    ]);

    const decorated = this.decorateBeneficiaria(beneficiaria);

    return {
      ...decorated,
      familiares,
      vulnerabilidades,
      info_socioeconomica: infoSocio,
      dependentes,
      historico_atendimentos: historico
    };
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

      const beneficiaria = this.decorateBeneficiaria(insert.rows[0] as Beneficiaria);
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

      const decorated = this.decorateBeneficiaria(refreshed.rows[0] as Beneficiaria);
      return this.attachRelations(client, decorated);
    });
  }

  async findWithRelations(id: number): Promise<BeneficiariaDetalhada | null> {
    const beneficiaria = await this.findById(id);
    if (!beneficiaria) {
      return null;
    }
    return this.attachRelations(this.pool, this.decorateBeneficiaria(beneficiaria));
  }

  async buscarPorId(id: number): Promise<Beneficiaria> {
    const found = await this.findById(id);
    if (!found) {
      throw new AppError('Beneficiária não encontrada', 404);
    }
    return this.decorateBeneficiaria(found);
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
    const found = await this.findByField('cpf', cpf);
    return found ? this.decorateBeneficiaria(found) : null;
  }

  async buscarPorTexto(texto: string, limit: number = 10): Promise<Beneficiaria[]> {
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
       LIMIT $2`,
      [`%${texto}%`, limit]
    );

    return result.rows;
  }

  async listarAtivas(
    page: number = 1,
    limit: number = 10,
    filtros?: {
      status?: 'ativa' | 'inativa' | 'em_acompanhamento' | 'pendente' | 'desistente';
      medida_protetiva?: boolean;
      tipo_violencia?: string[];
      data_inicio?: Date;
      data_fim?: Date;
      search?: string;
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

    const searchTerm = filtros?.search?.trim();
    if (searchTerm) {
      const likeParam = `%${searchTerm}%`;
      whereConditions.push(`(
        nome_completo ILIKE $${paramCount}
        OR cpf::text ILIKE $${paramCount}
        OR email ILIKE $${paramCount}
      )`);
      params.push(likeParam);
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

    const totalCount = parseInt(total.rows[0].count, 10);

    const data = beneficiarias.rows.map((row) =>
      this.decorateBeneficiaria(row as Beneficiaria)
    );

    return {
      data,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
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

    return this.decorateBeneficiaria(result.rows[0] as Beneficiaria);
  }

  async arquivar(id: number): Promise<Beneficiaria> {
    const result = await this.query(
      `UPDATE beneficiarias
         SET status = 'inativa',
             arquivada_em = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError(`Beneficiária não encontrada com ID: ${id}`);
    }

    return this.decorateBeneficiaria(result.rows[0] as Beneficiaria);
  }

  async upsertInfoSocioeconomica(
    beneficiariaId: number,
    info: Partial<BeneficiariaInfoSocioeconomica>
  ): Promise<BeneficiariaInfoSocioeconomica> {
    const result = await this.query(
      `INSERT INTO beneficiaria_info_socioeconomica (
         beneficiaria_id,
         renda_familiar,
         quantidade_moradores,
         tipo_moradia,
         escolaridade,
         profissao,
         situacao_trabalho,
         beneficios_sociais
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (beneficiaria_id) DO UPDATE
         SET renda_familiar = EXCLUDED.renda_familiar,
             quantidade_moradores = EXCLUDED.quantidade_moradores,
             tipo_moradia = EXCLUDED.tipo_moradia,
             escolaridade = EXCLUDED.escolaridade,
             profissao = EXCLUDED.profissao,
             situacao_trabalho = EXCLUDED.situacao_trabalho,
             beneficios_sociais = EXCLUDED.beneficios_sociais,
             updated_at = CURRENT_TIMESTAMP
       RETURNING renda_familiar, quantidade_moradores, tipo_moradia, escolaridade, profissao,
                 situacao_trabalho, beneficios_sociais, created_at, updated_at`,
      [
        beneficiariaId,
        info.renda_familiar ?? null,
        info.quantidade_moradores ?? null,
        info.tipo_moradia ?? null,
        info.escolaridade ?? null,
        info.profissao ?? null,
        info.situacao_trabalho ?? null,
        info.beneficios_sociais ?? null
      ]
    );

    const row = result.rows[0];
    return {
      renda_familiar: row.renda_familiar !== null ? Number(row.renda_familiar) : null,
      quantidade_moradores: row.quantidade_moradores !== null ? Number(row.quantidade_moradores) : null,
      tipo_moradia: row.tipo_moradia ?? null,
      escolaridade: row.escolaridade ?? null,
      profissao: row.profissao ?? null,
      situacao_trabalho: row.situacao_trabalho ?? null,
      beneficios_sociais: row.beneficios_sociais ?? null,
      created_at: row.created_at ?? undefined,
      updated_at: row.updated_at ?? undefined
    };
  }

  async addDependente(
    beneficiariaId: number,
    dependente: Omit<BeneficiariaDependente, 'id' | 'created_at' | 'updated_at'>
  ): Promise<BeneficiariaDependente> {
    const result = await this.query(
      `INSERT INTO beneficiaria_dependentes (
         beneficiaria_id, nome_completo, data_nascimento, parentesco, cpf
       ) VALUES ($1,$2,$3,$4,$5)
       RETURNING id, nome_completo, data_nascimento, parentesco, cpf, created_at, updated_at`,
      [
        beneficiariaId,
        dependente.nome_completo,
        dependente.data_nascimento,
        dependente.parentesco,
        dependente.cpf ?? null
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      nome_completo: row.nome_completo,
      data_nascimento: row.data_nascimento,
      parentesco: row.parentesco,
      cpf: row.cpf ?? null,
      created_at: row.created_at ?? undefined,
      updated_at: row.updated_at ?? undefined
    };
  }

  async removeDependente(beneficiariaId: number, dependenteId: number): Promise<void> {
    const result = await this.query(
      `DELETE FROM beneficiaria_dependentes
        WHERE beneficiaria_id = $1 AND id = $2`,
      [beneficiariaId, dependenteId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Dependente não encontrado para esta beneficiária');
    }
  }

  async addAtendimento(
    beneficiariaId: number,
    atendimento: {
      tipo: string;
      data: Date;
      descricao: string;
      encaminhamentos?: string | null;
      profissional_id?: number | null;
    }
  ): Promise<BeneficiariaHistoricoAtendimento> {
    const result = await this.query(
      `INSERT INTO historico_atendimentos (
         beneficiaria_id, tipo_atendimento, data_atendimento, descricao, encaminhamentos, usuario_id
       ) VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, tipo_atendimento, data_atendimento, descricao, encaminhamentos, usuario_id, created_at, updated_at`,
      [
        beneficiariaId,
        atendimento.tipo,
        atendimento.data,
        atendimento.descricao,
        atendimento.encaminhamentos ?? null,
        atendimento.profissional_id ?? null
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      tipo: row.tipo_atendimento,
      data: row.data_atendimento,
      descricao: row.descricao,
      encaminhamentos: row.encaminhamentos ?? null,
      profissional_id: row.usuario_id ?? null,
      created_at: row.created_at ?? undefined,
      updated_at: row.updated_at ?? undefined
    };
  }

  async updateFoto(
    beneficiariaId: number,
    filename: string
  ): Promise<Beneficiaria> {
    const result = await this.query(
      `UPDATE beneficiarias
         SET foto_filename = $2,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [beneficiariaId, filename]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError(`Beneficiária não encontrada com ID: ${beneficiariaId}`);
    }

    return this.decorateBeneficiaria(result.rows[0] as Beneficiaria);
  }

  async getResumo(id: number): Promise<BeneficiariaResumoDetalhado | null> {
    const info = await this.query(
      `SELECT id, nome_completo, status, created_at, updated_at
         FROM beneficiarias
        WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (info.rowCount === 0) {
      return null;
    }

    const [anamnese, ficha, termos, visao, genericos, atendimentos, participacoes] = await Promise.all([
      this.query('SELECT COUNT(*)::int AS total FROM anamnese_social WHERE beneficiaria_id = $1', [id]),
      this.query('SELECT COUNT(*)::int AS total FROM ficha_evolucao WHERE beneficiaria_id = $1', [id]),
      this.query('SELECT COUNT(*)::int AS total FROM termos_consentimento WHERE beneficiaria_id = $1', [id]),
      this.query('SELECT COUNT(*)::int AS total FROM visao_holistica WHERE beneficiaria_id = $1', [id]),
      this.query('SELECT COUNT(*)::int AS total FROM formularios WHERE beneficiaria_id = $1', [id]),
      this.query(
        'SELECT COUNT(*)::int AS total, MAX(data_atendimento) AS ultimo FROM historico_atendimentos WHERE beneficiaria_id = $1',
        [id]
      ),
      this.query(
        'SELECT COUNT(*)::int AS total FROM participacoes WHERE beneficiaria_id = $1 AND ativo = true',
        [id]
      )
    ]);

    return {
      beneficiaria: info.rows[0],
      formularios: {
        total:
          anamnese.rows[0].total +
          ficha.rows[0].total +
          termos.rows[0].total +
          visao.rows[0].total +
          genericos.rows[0].total,
        anamnese: anamnese.rows[0].total,
        ficha_evolucao: ficha.rows[0].total,
        termos: termos.rows[0].total,
        visao_holistica: visao.rows[0].total,
        genericos: genericos.rows[0].total
      },
      atendimentos: {
        total: atendimentos.rows[0].total,
        ultimo_atendimento: atendimentos.rows[0].ultimo
      },
      participacoes: {
        total_ativas: participacoes.rows[0].total
      }
    };
  }

  async getAtividades(
    beneficiariaId: number,
    page: number,
    limit: number
  ): Promise<BeneficiariaAtividadeLista> {
    const offset = (page - 1) * limit;

    const baseQuery = `
      SELECT * FROM (
        SELECT 'formulario'::text AS type, id, created_at, usuario_id AS created_by, NULL::text AS created_by_name
          FROM formularios WHERE beneficiaria_id = $1
        UNION ALL
        SELECT 'anamnese'::text AS type, id, created_at, created_by, NULL::text AS created_by_name
          FROM anamnese_social WHERE beneficiaria_id = $1
        UNION ALL
        SELECT 'ficha_evolucao'::text AS type, id, created_at, created_by, NULL::text AS created_by_name
          FROM ficha_evolucao WHERE beneficiaria_id = $1
        UNION ALL
        SELECT 'termos_consentimento'::text AS type, id, created_at, created_by, NULL::text AS created_by_name
          FROM termos_consentimento WHERE beneficiaria_id = $1
        UNION ALL
        SELECT 'visao_holistica'::text AS type, id, created_at, created_by, NULL::text AS created_by_name
          FROM visao_holistica WHERE beneficiaria_id = $1
      ) acts
    `;

    const [items, total] = await Promise.all([
      this.query(
        `${baseQuery}
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [beneficiariaId, limit, offset]
      ),
      this.query(`SELECT COUNT(*)::int AS total FROM (${baseQuery}) counted`, [beneficiariaId])
    ]);

    return {
      data: items.rows,
      pagination: {
        page,
        limit,
        total: total.rows[0].total
      }
    };
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
