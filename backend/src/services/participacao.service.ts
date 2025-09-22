import { Pool } from 'pg';
import type Redis from 'ioredis';
import { loggerService } from '../services/logger';
import { AppError, ValidationError } from '../utils';
import {
  Participacao,
  CreateParticipacaoDTO,
  UpdateParticipacaoDTO,
  ParticipacaoFilters,
  participacaoSchema,
  createParticipacaoSchema,
  updateParticipacaoSchema
} from '../validators/participacao.validator';

export class ParticipacaoService {
  private pool: Pool;
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
  }

  private async getCacheKey(key: string) {
    try {
      const data = await this.redis.get(`participacoes:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      loggerService.warn('Cache read failed', { key: `participacoes:${key}`, error: (error as any)?.message });
      return null;
    }
  }

  private async setCacheKey(key: string, data: any) {
    try {
      await this.redis.setex(`participacoes:${key}`, this.CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      loggerService.warn('Cache set failed', { key: `participacoes:${key}`, error: (error as any)?.message });
    }
  }

  private async invalidateCache(patterns: string[]) {
    try {
      const keysToDelete = new Set<string>();
      const redisWithScan = this.redis as unknown as {
        scan: (
          cursor: string,
          matchToken: 'MATCH',
          pattern: string,
          countToken: 'COUNT',
          count: number
        ) => Promise<[string, string[]]>;
      };

      for (const pattern of patterns) {
        let cursor = '0';
        const matchPattern = `participacoes:${pattern}`;

        do {
          const [nextCursor, foundKeys] = await redisWithScan.scan(cursor, 'MATCH', matchPattern, 'COUNT', 50);
          cursor = nextCursor;
          foundKeys.forEach((key: string) => keysToDelete.add(key));
        } while (cursor !== '0');
      }

      if (keysToDelete.size > 0) {
        await this.redis.del(...Array.from(keysToDelete));
      }
    } catch (error) {
      loggerService.warn('Cache invalidate failed', { patterns, error: (error as any)?.message });
    }
  }

  async listarParticipacoes(filters: ParticipacaoFilters) {
    try {
      const { 
        page, 
        limit, 
        beneficiaria_id, 
        projeto_id, 
        oficina_id, 
        status,
        data_inicio,
        data_fim,
        search 
      } = filters;
      
      const offset = (page - 1) * limit;

      // Tentar buscar do cache se não houver filtros complexos
      if (!search && !data_inicio && !data_fim && page === 1) {
        const cacheKey = `list:${beneficiaria_id || 'all'}:${projeto_id || 'all'}:${status || 'all'}:${limit}`;
        const cachedData = await this.getCacheKey(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      const whereConditions = ['p.ativo = true'];
      const params: any[] = [];
      let paramCount = 0;

      if (beneficiaria_id) {
        paramCount++;
        whereConditions.push(`p.beneficiaria_id = $${paramCount}`);
        params.push(beneficiaria_id);
      }

      if (projeto_id) {
        paramCount++;
        whereConditions.push(`p.projeto_id = $${paramCount}`);
        params.push(projeto_id);
      }

      if (oficina_id) {
        paramCount++;
        whereConditions.push(`p.projeto_id IN (SELECT projeto_id FROM oficinas WHERE id = $${paramCount})`);
        params.push(oficina_id);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`p.status = $${paramCount}`);
        params.push(status);
      }

      if (data_inicio) {
        paramCount++;
        whereConditions.push(`p.data_inscricao >= $${paramCount}`);
        params.push(data_inicio);
      }

      if (data_fim) {
        paramCount++;
        whereConditions.push(`p.data_inscricao <= $${paramCount}`);
        params.push(data_fim);
      }

      if (search) {
        paramCount++;
        whereConditions.push(`(
          b.nome_completo ILIKE $${paramCount} OR
          pr.nome ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          p.*,
          pr.nome as projeto_nome, 
          pr.data_inicio as projeto_data_inicio,
          pr.data_fim_prevista as projeto_data_fim_prevista,
          pr.data_fim_real as projeto_data_fim_real,
          b.nome_completo as beneficiaria_nome,
          COUNT(*) OVER() as total_count
        FROM participacoes p
        LEFT JOIN projetos pr ON p.projeto_id = pr.id
        LEFT JOIN beneficiarias b ON p.beneficiaria_id = b.id
        WHERE ${whereClause}
        ORDER BY p.data_inscricao DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      const result = await this.pool.query(query, [...params, limit, offset]);

      const participacoes = result.rows;
      const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

      const response = {
        data: participacoes,
        pagination: {
          page: parseInt(String(page)),
          limit: parseInt(String(limit)),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache apenas para consultas sem filtros complexos
      if (!search && !data_inicio && !data_fim && page === 1) {
        const cacheKey = `list:${beneficiaria_id || 'all'}:${projeto_id || 'all'}:${status || 'all'}:${limit}`;
        await this.setCacheKey(cacheKey, response);
      }

      return response;
    } catch (error) {
      loggerService.error('Erro ao listar participações', { error });
      throw new AppError('Erro ao buscar participações', 500);
    }
  }

  async criarParticipacao(data: CreateParticipacaoDTO): Promise<Participacao> {
    try {
      // Validar dados
      const validatedData = createParticipacaoSchema.parse(data);

      // Verificar se beneficiária existe
      const beneficiariaCheck = await this.pool.query(
        "SELECT id FROM beneficiarias WHERE id = $1 AND ativo = true",
        [validatedData.beneficiaria_id]
      );

      if (beneficiariaCheck.rows.length === 0) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      // Verificar se projeto existe
      const projetoCheck = await this.pool.query(
        "SELECT id FROM projetos WHERE id = $1 AND ativo = true",
        [validatedData.projeto_id]
      );

      if (projetoCheck.rows.length === 0) {
        throw new AppError('Projeto não encontrado', 404);
      }

      // Verificar se já existe participação ativa
      const participacaoCheck = await this.pool.query(
        "SELECT id FROM participacoes WHERE beneficiaria_id = $1 AND projeto_id = $2 AND ativo = true",
        [validatedData.beneficiaria_id, validatedData.projeto_id]
      );

      if (participacaoCheck.rows.length > 0) {
        throw new AppError('Beneficiária já está inscrita neste projeto', 409);
      }

      const result = await this.pool.query(`
        INSERT INTO participacoes (
          beneficiaria_id,
          projeto_id,
          status,
          observacoes
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        validatedData.beneficiaria_id,
        validatedData.projeto_id,
        validatedData.status || 'inscrita',
        validatedData.observacoes
      ]);

      const participacao = result.rows[0];

      // Invalidar cache
      await this.invalidateCache(['list:*', `beneficiaria:${validatedData.beneficiaria_id}*`]);

      return participacao;
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        throw new ValidationError('Dados inválidos para criar participação');
      }
      loggerService.error('Erro ao criar participação', { error });
      throw error instanceof AppError ? error : new AppError('Erro ao criar participação', 500);
    }
  }

  async atualizarParticipacao(id: number, data: UpdateParticipacaoDTO): Promise<Participacao> {
    try {
      // Validar dados
      const validatedData = updateParticipacaoSchema.parse(data);

      // Verificar se participação existe
      const participacaoCheck = await this.pool.query(
        "SELECT id, beneficiaria_id FROM participacoes WHERE id = $1 AND ativo = true",
        [id]
      );

      if (participacaoCheck.rows.length === 0) {
        throw new AppError('Participação não encontrada', 404);
      }

      const fieldsToUpdate = Object.entries(validatedData)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => key);

      if (fieldsToUpdate.length === 0) {
        throw new ValidationError('Nenhum dado informado para atualizar participação');
      }

      const setClauses = fieldsToUpdate.map((field, index) => `${field} = $${index + 1}`);
      const queryParams = fieldsToUpdate.map(field => validatedData[field as keyof UpdateParticipacaoDTO]);

      const query = `
        UPDATE participacoes 
        SET ${setClauses.join(', ')}, data_atualizacao = NOW()
        WHERE id = $${fieldsToUpdate.length + 1} AND ativo = true
        RETURNING *
      `;

      const result = await this.pool.query(query, [...queryParams, id]);
      const participacao = result.rows[0];

      // Invalidar cache
      await this.invalidateCache([
        'list:*',
        `beneficiaria:${participacaoCheck.rows[0].beneficiaria_id}*`
      ]);

      return participacao;
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        throw new ValidationError('Dados inválidos para atualizar participação');
      }
      loggerService.error('Erro ao atualizar participação', { error });
      throw error instanceof AppError ? error : new AppError('Erro ao atualizar participação', 500);
    }
  }

  async excluirParticipacao(id: number): Promise<void> {
    try {
      // Verificar se participação existe
      const participacaoCheck = await this.pool.query(
        "SELECT id, beneficiaria_id FROM participacoes WHERE id = $1 AND ativo = true",
        [id]
      );

      if (participacaoCheck.rows.length === 0) {
        throw new AppError('Participação não encontrada', 404);
      }

      // Soft delete
      await this.pool.query(
        'UPDATE participacoes SET ativo = false, data_atualizacao = NOW() WHERE id = $1',
        [id]
      );

      // Invalidar cache
      await this.invalidateCache([
        'list:*',
        `beneficiaria:${participacaoCheck.rows[0].beneficiaria_id}*`
      ]);

    } catch (error) {
      loggerService.error('Erro ao excluir participação', { error });
      throw error instanceof AppError ? error : new AppError('Erro ao excluir participação', 500);
    }
  }

  async registrarPresenca(id: number, presenca: number): Promise<Participacao> {
    try {
      if (presenca < 0 || presenca > 100) {
        throw new ValidationError('Percentual de presença deve estar entre 0 e 100');
      }

      // Verificar se participação existe
      const participacaoCheck = await this.pool.query(
        "SELECT id, beneficiaria_id FROM participacoes WHERE id = $1 AND ativo = true",
        [id]
      );

      if (participacaoCheck.rows.length === 0) {
        throw new AppError('Participação não encontrada', 404);
      }

      const result = await this.pool.query(`
        UPDATE participacoes 
        SET presenca_percentual = $1, data_atualizacao = NOW()
        WHERE id = $2 AND ativo = true
        RETURNING *
      `, [presenca, id]);

      const participacao = result.rows[0];

      // Invalidar cache
      await this.invalidateCache([
        'list:*',
        `beneficiaria:${participacaoCheck.rows[0].beneficiaria_id}*`
      ]);

      return participacao;
    } catch (error) {
      loggerService.error('Erro ao registrar presença', { error });
      throw error instanceof AppError ? error : new AppError('Erro ao registrar presença', 500);
    }
  }

  async emitirCertificado(id: number): Promise<Participacao> {
    try {
      // Verificar se participação existe e tem presença mínima
      const participacaoCheck = await this.pool.query(
        "SELECT id, beneficiaria_id, presenca_percentual FROM participacoes WHERE id = $1 AND ativo = true",
        [id]
      );

      if (participacaoCheck.rows.length === 0) {
        throw new AppError('Participação não encontrada', 404);
      }

      if (participacaoCheck.rows[0].presenca_percentual < 75) {
        throw new ValidationError('Presença mínima de 75% é necessária para emitir certificado');
      }

      const result = await this.pool.query(`
        UPDATE participacoes 
        SET 
          certificado_emitido = true,
          status = 'concluida',
          data_conclusao = NOW(),
          data_atualizacao = NOW()
        WHERE id = $1 AND ativo = true
        RETURNING *
      `, [id]);

      const participacao = result.rows[0];

      // Invalidar cache
      await this.invalidateCache([
        'list:*',
        `beneficiaria:${participacaoCheck.rows[0].beneficiaria_id}*`
      ]);

      return participacao;
    } catch (error) {
      loggerService.error('Erro ao emitir certificado', { error });
      throw error instanceof AppError ? error : new AppError('Erro ao emitir certificado', 500);
    }
  }
}
