import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';

interface QueryFilters {
  beneficiariaId?: number;
  projetoId?: number;
  statusMatricula?: string;
  limit: number;
  offset: number;
}

export interface MatriculaListItem {
  id: number;
  beneficiaria_id: number;
  projeto_id: number;
  data_matricula: string;
  [key: string]: any;
}

export interface BeneficiariaRecord {
  id: number;
}

export interface ProjetoRecord {
  id: number;
  status: string;
}

export interface MatriculaRecord {
  id: number;
  beneficiaria_id: number;
  projeto_id: number;
  status_matricula: string;
  [key: string]: any;
}

type QueryExecutor = Pool | PoolClient;

export interface CreateMatriculaRepositoryInput {
  beneficiaria_id: number;
  projeto_id: number;
  data_matricula: string;
  data_inicio_prevista?: string | null;
  data_conclusao_prevista?: string | null;
  situacao_social_familiar?: string | null;
  escolaridade_atual?: string | null;
  experiencia_profissional?: string | null;
  motivacao_participacao: string;
  expectativas: string;
  disponibilidade_horarios: string;
  possui_dependentes: boolean;
  necessita_auxilio_transporte: boolean;
  necessita_auxilio_alimentacao: boolean;
  necessita_cuidado_criancas: boolean;
  atende_criterios_idade: boolean;
  atende_criterios_renda: boolean;
  atende_criterios_genero: boolean;
  atende_criterios_territorio: boolean;
  atende_criterios_vulnerabilidade: boolean;
  observacoes_elegibilidade?: string | null;
  termo_compromisso_assinado: boolean;
  frequencia_minima_aceita: boolean;
  regras_convivencia_aceitas: boolean;
  participacao_atividades_aceita: boolean;
  avaliacao_periodica_aceita: boolean;
  como_conheceu_projeto?: string | null;
  pessoas_referencias?: string | null;
  condicoes_especiais?: string | null;
  medicamentos_uso_continuo?: string | null;
  alergias_restricoes?: string | null;
  profissional_matricula?: string | null;
  observacoes_profissional?: string | null;
  status_matricula: 'pendente' | 'aprovada' | 'reprovada' | 'lista_espera';
  motivo_status?: string | null;
}

export class MatriculasRepository {
  constructor(private readonly db: Pool = pool) {}

  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? this.db;
  }

  async listMatriculas(filters: QueryFilters): Promise<MatriculaListItem[]> {
    const { beneficiariaId, projetoId, statusMatricula, limit, offset } = filters;

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
      params.push(beneficiariaId);
      query += ` AND mp.beneficiaria_id = $${++paramCount}`;
    }

    if (projetoId) {
      params.push(projetoId);
      query += ` AND mp.projeto_id = $${++paramCount}`;
    }

    if (statusMatricula) {
      params.push(statusMatricula);
      query += ` AND mp.status_matricula = $${++paramCount}`;
    }

    query += ' ORDER BY mp.data_matricula DESC';

    params.push(limit, offset);
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;

    const executor = this.getExecutor();
    const result = await executor.query<MatriculaListItem>(query, params);
    return result.rows;
  }

  async findBeneficiariaById(id: number, client?: PoolClient): Promise<BeneficiariaRecord | null> {
    const executor = this.getExecutor(client);
    const result = await executor.query<BeneficiariaRecord>(
      'SELECT id FROM beneficiarias WHERE id = $1',
      [id]
    );

    return result.rows[0] ?? null;
  }

  async findProjetoById(id: number, client?: PoolClient): Promise<ProjetoRecord | null> {
    const executor = this.getExecutor(client);
    const result = await executor.query<ProjetoRecord>(
      'SELECT id, status FROM projetos WHERE id = $1',
      [id]
    );

    return result.rows[0] ?? null;
  }

  async findMatriculaByBeneficiariaAndProjeto(
    beneficiariaId: number,
    projetoId: number,
    client?: PoolClient
  ): Promise<MatriculaRecord | null> {
    const executor = this.getExecutor(client);
    const result = await executor.query<MatriculaRecord>(
      'SELECT * FROM matriculas_projetos WHERE beneficiaria_id = $1 AND projeto_id = $2',
      [beneficiariaId, projetoId]
    );

    return result.rows[0] ?? null;
  }

  async createMatricula(data: CreateMatriculaRepositoryInput, client?: PoolClient): Promise<MatriculaRecord> {
    const executor = this.getExecutor(client);

    const query = `
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
      data.data_matricula,
      data.data_inicio_prevista,
      data.data_conclusao_prevista,
      data.situacao_social_familiar,
      data.escolaridade_atual,
      data.experiencia_profissional,
      data.motivacao_participacao,
      data.expectativas,
      data.disponibilidade_horarios,
      data.possui_dependentes,
      data.necessita_auxilio_transporte,
      data.necessita_auxilio_alimentacao,
      data.necessita_cuidado_criancas,
      data.atende_criterios_idade,
      data.atende_criterios_renda,
      data.atende_criterios_genero,
      data.atende_criterios_territorio,
      data.atende_criterios_vulnerabilidade,
      data.observacoes_elegibilidade,
      data.termo_compromisso_assinado,
      data.frequencia_minima_aceita,
      data.regras_convivencia_aceitas,
      data.participacao_atividades_aceita,
      data.avaliacao_periodica_aceita,
      data.como_conheceu_projeto,
      data.pessoas_referencias,
      data.condicoes_especiais,
      data.medicamentos_uso_continuo,
      data.alergias_restricoes,
      data.profissional_matricula,
      data.observacoes_profissional,
      data.status_matricula,
      data.motivo_status
    ];

    const result = await executor.query<MatriculaRecord>(query, values);
    if (!result.rows[0]) {
      throw new Error('Falha ao criar matrícula');
    }

    return result.rows[0];
  }

  async createParticipacao(
    projetoId: number,
    beneficiariaId: number,
    client?: PoolClient
  ): Promise<void> {
    const executor = this.getExecutor(client);
    await executor.query(
      `
        INSERT INTO participacoes (projeto_id, beneficiaria_id, status, data_inscricao)
        VALUES ($1, $2, 'inscrita', NOW())
        ON CONFLICT (projeto_id, beneficiaria_id) DO NOTHING
      `,
      [projetoId, beneficiariaId]
    );
  }

  async marcarMatriculaComoAprovada(id: number, client?: PoolClient): Promise<void> {
    const executor = this.getExecutor(client);
    await executor.query(
      `
        UPDATE matriculas_projetos
        SET data_aprovacao = NOW()
        WHERE id = $1
      `,
      [id]
    );
  }
}
