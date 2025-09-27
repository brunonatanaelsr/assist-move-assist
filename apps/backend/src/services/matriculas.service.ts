import { PoolClient } from 'pg';
import { cacheService } from './cache.service';
import { MatriculasRepository, CreateMatriculaRepositoryInput, MatriculaRecord } from '../repositories/matriculas.repository';
import { AppError } from '../utils';
import { transaction } from '../config/database';

const INACTIVE_PROJECT_STATUSES = new Set(['cancelado', 'concluido']);
const PROJECT_INACTIVE_ERROR_MESSAGE = 'Projetos cancelados ou concluídos não aceitam novas matrículas';

type TransactionRunner = <T>(callback: (client: PoolClient) => Promise<T>) => Promise<T>;

export interface ListarMatriculasParams {
  beneficiariaId?: number;
  projetoId?: number;
  statusMatricula?: string;
  page?: number;
  limit?: number;
}

export interface MatriculaData {
  beneficiaria_id: number;
  projeto_id: number;
  data_matricula?: string;
  data_inicio_prevista?: string | null;
  data_conclusao_prevista?: string | null;
  situacao_social_familiar?: string | null;
  escolaridade_atual?: string | null;
  experiencia_profissional?: string | null;
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
  observacoes_elegibilidade?: string | null;
  termo_compromisso_assinado?: boolean;
  frequencia_minima_aceita?: boolean;
  regras_convivencia_aceitas?: boolean;
  participacao_atividades_aceita?: boolean;
  avaliacao_periodica_aceita?: boolean;
  como_conheceu_projeto?: string | null;
  pessoas_referencias?: string | null;
  condicoes_especiais?: string | null;
  medicamentos_uso_continuo?: string | null;
  alergias_restricoes?: string | null;
  profissional_matricula?: string | null;
  observacoes_profissional?: string | null;
  status_matricula?: 'pendente' | 'aprovada' | 'reprovada' | 'lista_espera';
  motivo_status?: string | null;
}

export interface ElegibilidadeResult {
  elegivel: boolean;
  motivos: string[];
  warnings: string[];
  matricula_existente?: MatriculaRecord | null;
}

export class MatriculasService {
  constructor(
    private readonly repository: MatriculasRepository = new MatriculasRepository(),
    private readonly cache = cacheService,
    private readonly runInTransaction: TransactionRunner = transaction
  ) {}

  async listarMatriculas(params: ListarMatriculasParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;

    const data = await this.repository.listMatriculas({
      beneficiariaId: params.beneficiariaId,
      projetoId: params.projetoId,
      statusMatricula: params.statusMatricula,
      limit,
      offset
    });

    await this.cache.deletePattern('cache:matriculas:*');

    return {
      data,
      pagination: {
        page,
        limit,
        total: data.length
      }
    };
  }

  async criarMatricula(data: MatriculaData): Promise<MatriculaRecord> {
    const sanitizedData = this.prepareMatriculaData(data);

    const matricula = await this.runInTransaction(async (client) => {
      const beneficiaria = await this.repository.findBeneficiariaById(sanitizedData.beneficiaria_id, client);
      if (!beneficiaria) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      const projeto = await this.repository.findProjetoById(sanitizedData.projeto_id, client);
      if (!projeto) {
        throw new AppError('Projeto não encontrado', 404);
      }

      if (this.isProjetoInativo(projeto.status)) {
        throw new AppError(PROJECT_INACTIVE_ERROR_MESSAGE, 400);
      }

      const matriculaExistente = await this.repository.findMatriculaByBeneficiariaAndProjeto(
        sanitizedData.beneficiaria_id,
        sanitizedData.projeto_id,
        client
      );

      if (matriculaExistente) {
        throw new AppError('Beneficiária já possui matrícula neste projeto', 409);
      }

      const created = await this.repository.createMatricula(sanitizedData, client);

      if (created.status_matricula === 'aprovada') {
        await this.repository.createParticipacao(created.projeto_id, created.beneficiaria_id, client);
        await this.repository.marcarMatriculaComoAprovada(created.id, client);
      }

      return created;
    });

    await Promise.all([
      this.cache.delete(`cache:beneficiaria:${matricula.beneficiaria_id}`),
      this.cache.delete(`cache:projeto:${matricula.projeto_id}`),
      this.cache.deletePattern('cache:matriculas:*')
    ]);

    return matricula;
  }

  async verificarElegibilidade(beneficiariaId: number, projetoId: number): Promise<ElegibilidadeResult> {
    const beneficiaria = await this.repository.findBeneficiariaById(beneficiariaId);
    if (!beneficiaria) {
      throw new AppError('Beneficiária não encontrada', 404);
    }

    const projeto = await this.repository.findProjetoById(projetoId);
    if (!projeto) {
      throw new AppError('Projeto não encontrado', 404);
    }

    const matriculaExistente = await this.repository.findMatriculaByBeneficiariaAndProjeto(
      beneficiariaId,
      projetoId
    );

    const resultado: ElegibilidadeResult = {
      elegivel: true,
      motivos: [],
      warnings: [],
      matricula_existente: matriculaExistente ?? null
    };

    if (this.isProjetoInativo(projeto.status)) {
      resultado.elegivel = false;
      resultado.motivos.push(PROJECT_INACTIVE_ERROR_MESSAGE);
    }

    if (matriculaExistente) {
      resultado.elegivel = false;
      resultado.motivos.push('Beneficiária já possui matrícula neste projeto');
    }

    return resultado;
  }

  private prepareMatriculaData(data: MatriculaData): CreateMatriculaRepositoryInput {
    const hoje = new Date().toISOString().split('T')[0];
    const dataMatricula = data.data_matricula ?? hoje;

    return {
      beneficiaria_id: data.beneficiaria_id,
      projeto_id: data.projeto_id,
      data_matricula: dataMatricula as string,
      data_inicio_prevista: data.data_inicio_prevista ?? null,
      data_conclusao_prevista: data.data_conclusao_prevista ?? null,
      situacao_social_familiar: data.situacao_social_familiar ?? null,
      escolaridade_atual: data.escolaridade_atual ?? null,
      experiencia_profissional: data.experiencia_profissional ?? null,
      motivacao_participacao: data.motivacao_participacao,
      expectativas: data.expectativas,
      disponibilidade_horarios: JSON.stringify(data.disponibilidade_horarios ?? []),
      possui_dependentes: data.possui_dependentes ?? false,
      necessita_auxilio_transporte: data.necessita_auxilio_transporte ?? false,
      necessita_auxilio_alimentacao: data.necessita_auxilio_alimentacao ?? false,
      necessita_cuidado_criancas: data.necessita_cuidado_criancas ?? false,
      atende_criterios_idade: data.atende_criterios_idade !== false,
      atende_criterios_renda: data.atende_criterios_renda !== false,
      atende_criterios_genero: data.atende_criterios_genero !== false,
      atende_criterios_territorio: data.atende_criterios_territorio !== false,
      atende_criterios_vulnerabilidade: data.atende_criterios_vulnerabilidade !== false,
      observacoes_elegibilidade: data.observacoes_elegibilidade ?? null,
      termo_compromisso_assinado: data.termo_compromisso_assinado ?? false,
      frequencia_minima_aceita: data.frequencia_minima_aceita ?? false,
      regras_convivencia_aceitas: data.regras_convivencia_aceitas ?? false,
      participacao_atividades_aceita: data.participacao_atividades_aceita ?? false,
      avaliacao_periodica_aceita: data.avaliacao_periodica_aceita ?? false,
      como_conheceu_projeto: data.como_conheceu_projeto ?? null,
      pessoas_referencias: data.pessoas_referencias ?? null,
      condicoes_especiais: data.condicoes_especiais ?? null,
      medicamentos_uso_continuo: data.medicamentos_uso_continuo ?? null,
      alergias_restricoes: data.alergias_restricoes ?? null,
      profissional_matricula: data.profissional_matricula ?? null,
      observacoes_profissional: data.observacoes_profissional ?? null,
      status_matricula: data.status_matricula ?? 'pendente',
      motivo_status: data.motivo_status ?? null
    };
  }

  private isProjetoInativo(status: string): boolean {
    return INACTIVE_PROJECT_STATUSES.has((status || '').toLowerCase());
  }
}

export const matriculasService = new MatriculasService();
export { PROJECT_INACTIVE_ERROR_MESSAGE };
