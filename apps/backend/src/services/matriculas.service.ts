import { Pool } from 'pg';
import pool from '../config/database';
import { cacheService as defaultCacheService } from './cache.service';

const INACTIVE_PROJECT_STATUSES = new Set(['cancelado', 'concluido']);
const PROJECT_INACTIVE_ERROR_MESSAGE =
  'Projetos cancelados ou concluídos não aceitam novas matrículas';

const normalizeStatus = (status: unknown): string =>
  typeof status === 'string' ? status.toLowerCase() : '';

export class MatriculasServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'MatriculasServiceError';
  }
}

export interface MatriculaData {
  beneficiaria_id: number;
  projeto_id: number;
  data_matricula?: string;
  data_inicio_prevista?: string;
  data_conclusao_prevista?: string;
  situacao_social_familiar?: string;
  escolaridade_atual?: string;
  experiencia_profissional?: string;
  motivacao_participacao: string;
  expectativas: string;
  disponibilidade_horarios?: string[];
  possui_dependentes?: boolean;
  necessita_auxilio_transporte?: boolean;
  necessita_auxilio_alimentacao?: boolean;
  necessita_cuidado_criancas?: boolean;
  atende_criterios_idade?: boolean;
  atende_criterios_renda?: boolean;
  atende_criterios_genero?: boolean;
  atende_criterios_territorio?: boolean;
  atende_criterios_vulnerabilidade?: boolean;
  observacoes_elegibilidade?: string;
  termo_compromisso_assinado?: boolean;
  frequencia_minima_aceita?: boolean;
  regras_convivencia_aceitas?: boolean;
  participacao_atividades_aceita?: boolean;
  avaliacao_periodica_aceita?: boolean;
  como_conheceu_projeto?: string;
  pessoas_referencias?: string;
  condicoes_especiais?: string;
  medicamentos_uso_continuo?: string;
  alergias_restricoes?: string;
  profissional_matricula?: string;
  observacoes_profissional?: string;
  status_matricula?: 'pendente' | 'aprovada' | 'reprovada' | 'lista_espera';
  motivo_status?: string;
  data_aprovacao?: string;
}

export interface ListarMatriculasParams {
  beneficiariaId?: number;
  projetoId?: number;
  statusMatricula?: string;
  page: number;
  limit: number;
}

export interface ListarMatriculasResult {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ElegibilidadeResult {
  elegivel: boolean;
  motivos: string[];
  warnings: string[];
  matricula_existente: any | null;
}

interface CacheServiceContract {
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
}

export class MatriculasService {
  constructor(
    private readonly pool: Pool,
    private readonly cacheService: CacheServiceContract
  ) {}

  async listarMatriculas({
    beneficiariaId,
    projetoId,
    statusMatricula,
    page,
    limit
  }: ListarMatriculasParams): Promise<ListarMatriculasResult> {
    let query = `
      SELECT
        mp.*,
        b.nome_completo as beneficiaria_nome,
        b.cpf as beneficiaria_cpf,
        p.nome as projeto_nome,
        p.descricao as projeto_descricao,
        p.data_inicio as projeto_data_inicio,
        p.data_fim as projeto_data_fim
      FROM matriculas_projetos mp
      JOIN beneficiarias b ON mp.beneficiaria_id = b.id
      JOIN projetos p ON mp.projeto_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (beneficiariaId) {
      query += ` AND mp.beneficiaria_id = $${++paramCount}`;
      params.push(beneficiariaId);
    }

    if (projetoId) {
      query += ` AND mp.projeto_id = $${++paramCount}`;
      params.push(projetoId);
    }

    if (statusMatricula) {
      query += ` AND mp.status_matricula = $${++paramCount}`;
      params.push(statusMatricula);
    }

    query += ' ORDER BY mp.data_matricula DESC';

    const offset = (page - 1) * limit;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    await this.cacheService.deletePattern('cache:matriculas:*');

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total: result.rows.length
      }
    };
  }

  async criarMatricula(data: MatriculaData): Promise<any> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const beneficiariaCheck = await client.query(
        'SELECT id FROM beneficiarias WHERE id = $1',
        [data.beneficiaria_id]
      );

      if (beneficiariaCheck.rows.length === 0) {
        throw new MatriculasServiceError(404, 'Beneficiária não encontrada');
      }

      const projetoCheck = await client.query(
        'SELECT id, status FROM projetos WHERE id = $1',
        [data.projeto_id]
      );

      if (projetoCheck.rows.length === 0) {
        throw new MatriculasServiceError(404, 'Projeto não encontrado');
      }

      const projetoStatus = normalizeStatus(projetoCheck.rows[0].status);
      if (INACTIVE_PROJECT_STATUSES.has(projetoStatus)) {
        throw new MatriculasServiceError(400, PROJECT_INACTIVE_ERROR_MESSAGE);
      }

      const matriculaExistente = await client.query(
        `
          SELECT id FROM matriculas_projetos
          WHERE beneficiaria_id = $1 AND projeto_id = $2
        `,
        [data.beneficiaria_id, data.projeto_id]
      );

      if (matriculaExistente.rows.length > 0) {
        throw new MatriculasServiceError(
          409,
          'Beneficiária já possui matrícula neste projeto'
        );
      }

      const insertQuery = `
        INSERT INTO matriculas_projetos (
          beneficiaria_id, projeto_id, data_matricula, data_inicio_prevista,
          data_conclusao_prevista, situacao_social_familiar, escolaridade_atual,
          experiencia_profissional, motivacao_participacao, expectativas,
          disponibilidade_horarios, possui_dependentes, necessita_auxilio_transporte,
          necessita_auxilio_alimentacao, necessita_cuidado_criancas,
          atende_criterios_idade, atende_criterios_renda, atende_criterios_genero,
          atende_criterios_territorio, atende_criterios_vulnerabilidade,
          observacoes_elegibilidade, termo_compromisso_assinado, frequencia_minima_aceita,
          regras_convivencia_aceitas, participacao_atividades_aceita,
          avaliacao_periodica_aceita, como_conheceu_projeto, pessoas_referencias,
          condicoes_especiais, medicamentos_uso_continuo, alergias_restricoes,
          profissional_matricula, observacoes_profissional, status_matricula,
          motivo_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35
        ) RETURNING *
      `;

      const values = [
        data.beneficiaria_id,
        data.projeto_id,
        data.data_matricula || new Date().toISOString().split('T')[0],
        data.data_inicio_prevista,
        data.data_conclusao_prevista,
        data.situacao_social_familiar,
        data.escolaridade_atual,
        data.experiencia_profissional,
        data.motivacao_participacao,
        data.expectativas,
        JSON.stringify(data.disponibilidade_horarios || []),
        data.possui_dependentes || false,
        data.necessita_auxilio_transporte || false,
        data.necessita_auxilio_alimentacao || false,
        data.necessita_cuidado_criancas || false,
        data.atende_criterios_idade !== false,
        data.atende_criterios_renda !== false,
        data.atende_criterios_genero !== false,
        data.atende_criterios_territorio !== false,
        data.atende_criterios_vulnerabilidade !== false,
        data.observacoes_elegibilidade,
        data.termo_compromisso_assinado || false,
        data.frequencia_minima_aceita || false,
        data.regras_convivencia_aceitas || false,
        data.participacao_atividades_aceita || false,
        data.avaliacao_periodica_aceita || false,
        data.como_conheceu_projeto,
        data.pessoas_referencias,
        data.condicoes_especiais,
        data.medicamentos_uso_continuo,
        data.alergias_restricoes,
        data.profissional_matricula,
        data.observacoes_profissional,
        data.status_matricula || 'pendente',
        data.motivo_status
      ];

      const matriculaResult = await client.query(insertQuery, values);
      const matricula = matriculaResult.rows[0];

      if (data.status_matricula === 'aprovada') {
        await client.query(
          `
            INSERT INTO participacoes (projeto_id, beneficiaria_id, status, data_inscricao)
            VALUES ($1, $2, 'inscrita', NOW())
            ON CONFLICT (projeto_id, beneficiaria_id) DO NOTHING
          `,
          [data.projeto_id, data.beneficiaria_id]
        );

        await client.query(
          `
            UPDATE matriculas_projetos
            SET data_aprovacao = NOW()
            WHERE id = $1
          `,
          [matricula.id]
        );
      }

      await client.query('COMMIT');

      await this.cacheService.delete(`cache:beneficiaria:${data.beneficiaria_id}`);
      await this.cacheService.delete(`cache:projeto:${data.projeto_id}`);
      await this.cacheService.deletePattern('cache:matriculas:*');

      return matricula;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors to preserve original error context
        console.error('Erro ao executar ROLLBACK:', rollbackError);
      }

      if (error instanceof MatriculasServiceError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new MatriculasServiceError(
          409,
          'Beneficiária já possui matrícula neste projeto'
        );
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async obterMatricula(id: string): Promise<any> {
    const query = `
      SELECT
        mp.*,
        b.nome_completo as beneficiaria_nome,
        b.cpf as beneficiaria_cpf,
        b.email as beneficiaria_email,
        p.nome as projeto_nome,
        p.descricao as projeto_descricao,
        p.data_inicio as projeto_data_inicio,
        p.data_fim as projeto_data_fim,
        p.responsavel_nome as projeto_responsavel
      FROM matriculas_projetos mp
      JOIN beneficiarias b ON mp.beneficiaria_id = b.id
      JOIN projetos p ON mp.projeto_id = p.id
      WHERE mp.id = $1
    `;

    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new MatriculasServiceError(404, 'Matrícula não encontrada');
    }

    return result.rows[0];
  }

  async atualizarMatricula(id: string, data: Partial<MatriculaData>): Promise<any> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const matriculaCheck = await client.query(
        'SELECT * FROM matriculas_projetos WHERE id = $1',
        [id]
      );

      if (matriculaCheck.rows.length === 0) {
        throw new MatriculasServiceError(404, 'Matrícula não encontrada');
      }

      const matriculaAtual = matriculaCheck.rows[0];
      const updateData: Partial<MatriculaData> = { ...data };

      if (
        updateData.status_matricula === 'aprovada' &&
        matriculaAtual.status_matricula !== 'aprovada'
      ) {
        await client.query(
          `
            INSERT INTO participacoes (projeto_id, beneficiaria_id, status, data_inscricao)
            VALUES ($1, $2, 'inscrita', NOW())
            ON CONFLICT (projeto_id, beneficiaria_id) DO NOTHING
          `,
          [matriculaAtual.projeto_id, matriculaAtual.beneficiaria_id]
        );

        updateData.data_aprovacao = new Date().toISOString();
      }

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      Object.keys(updateData).forEach((key) => {
        const value = (updateData as any)[key];
        if (key !== 'id' && value !== undefined) {
          updateFields.push(`${key} = $${++paramCount}`);
          if (key === 'disponibilidade_horarios' && Array.isArray(value)) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      });

      if (updateFields.length === 0) {
        throw new MatriculasServiceError(400, 'Nenhum campo para atualizar');
      }

      updateFields.push(`updated_at = $${++paramCount}`);
      values.push(new Date().toISOString());

      values.push(id);
      const updateQuery = `
        UPDATE matriculas_projetos
        SET ${updateFields.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);

      await client.query('COMMIT');

      await this.cacheService.delete(`cache:beneficiaria:${matriculaAtual.beneficiaria_id}`);
      await this.cacheService.delete(`cache:projeto:${matriculaAtual.projeto_id}`);
      await this.cacheService.deletePattern('cache:matriculas:*');

      return result.rows[0];
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Erro ao executar ROLLBACK:', rollbackError);
      }

      if (error instanceof MatriculasServiceError) {
        throw error;
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async verificarElegibilidade(
    beneficiariaId: number,
    projetoId: number
  ): Promise<ElegibilidadeResult> {
    if (!beneficiariaId || !projetoId) {
      throw new MatriculasServiceError(
        400,
        'beneficiaria_id e projeto_id são obrigatórios'
      );
    }

    const beneficiaria = await this.pool.query(
      'SELECT * FROM beneficiarias WHERE id = $1',
      [beneficiariaId]
    );

    if (beneficiaria.rows.length === 0) {
      throw new MatriculasServiceError(404, 'Beneficiária não encontrada');
    }

    const projeto = await this.pool.query(
      'SELECT * FROM projetos WHERE id = $1',
      [projetoId]
    );

    if (projeto.rows.length === 0) {
      throw new MatriculasServiceError(404, 'Projeto não encontrado');
    }

    const matriculaExistente = await this.pool.query(
      'SELECT id, status_matricula FROM matriculas_projetos WHERE beneficiaria_id = $1 AND projeto_id = $2',
      [beneficiariaId, projetoId]
    );

    const resultado: ElegibilidadeResult = {
      elegivel: true,
      motivos: [],
      warnings: [],
      matricula_existente:
        matriculaExistente.rows.length > 0 ? matriculaExistente.rows[0] : null
    };

    if (INACTIVE_PROJECT_STATUSES.has(normalizeStatus(projeto.rows[0].status))) {
      resultado.elegivel = false;
      resultado.motivos.push(PROJECT_INACTIVE_ERROR_MESSAGE);
    }

    if (matriculaExistente.rows.length > 0) {
      resultado.elegivel = false;
      resultado.motivos.push('Beneficiária já possui matrícula neste projeto');
    }

    return resultado;
  }
}

export const matriculasService = new MatriculasService(pool, defaultCacheService);
