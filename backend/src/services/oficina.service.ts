import { Pool } from 'pg';
import Redis from 'ioredis';
import { loggerService } from '../services/logger';
import { cacheService } from './cache.service';
import {
  Oficina,
  CreateOficinaDTO,
  UpdateOficinaDTO,
  OficinaFilters,
  oficinaSchema,
  createOficinaSchema,
  updateOficinaSchema
} from '../validators/oficina.validator';
import { formatArrayDates, formatObjectDates } from '../utils/dateFormatter';

export class OficinaService {
  private pool: Pool;
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
  }

  private async getCacheKey<T>(key: string): Promise<T | null> {
    try {
      return await cacheService.get<T>(`oficinas:${key}`);
    } catch (error) {
      loggerService.warn('Erro ao buscar cache:', { error });
      return null;
    }
  }

  private async setCacheKey(key: string, data: any) {
    try {
      await cacheService.set(`oficinas:${key}`, data, this.CACHE_TTL);
    } catch (error) {
      loggerService.warn('Erro ao definir cache:', { error });
    }
  }

  private async invalidateCache(patterns: string[]) {
    try {
      for (const pattern of patterns) {
        await cacheService.deletePattern(`oficinas:${pattern}`);
      }
    } catch (error) {
      loggerService.warn('Erro ao invalidar cache:', { error });
    }
  }

  async listarOficinas(filters: OficinaFilters) {
    try {
      const { page, limit, projeto_id, status, data_inicio, data_fim, instrutor, local, search } = filters;
      const offset = (page - 1) * limit;

      // Tentar buscar do cache se não houver filtros complexos
      if (!search && !data_inicio && !data_fim && page === 1) {
        const cacheKey = `list:${projeto_id || 'all'}:${status || 'all'}:${limit}`;
        const cachedData = await this.getCacheKey(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      const whereConditions = ['o.ativo = true'];
      const params: any[] = [];
      let paramCount = 0;

      // Aplicar filtros
      if (projeto_id) {
        paramCount++;
        whereConditions.push(`o.projeto_id = $${paramCount}`);
        params.push(projeto_id);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`o.status = $${paramCount}`);
        params.push(status);
      }

      if (data_inicio) {
        paramCount++;
        whereConditions.push(`o.data_inicio >= $${paramCount}`);
        params.push(data_inicio);
      }

      if (data_fim) {
        paramCount++;
        whereConditions.push(`o.data_fim <= $${paramCount}`);
        params.push(data_fim);
      }

      if (instrutor) {
        paramCount++;
        whereConditions.push(`o.instrutor ILIKE $${paramCount}`);
        params.push(`%${instrutor}%`);
      }

      if (local) {
        paramCount++;
        whereConditions.push(`o.local ILIKE $${paramCount}`);
        params.push(`%${local}%`);
      }

      if (search) {
        paramCount++;
        whereConditions.push(`(
          o.nome ILIKE $${paramCount} OR
          o.descricao ILIKE $${paramCount} OR
          o.instrutor ILIKE $${paramCount} OR
          o.local ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT o.*,
          p.nome as projeto_nome,
          u.nome as responsavel_nome,
          COUNT(*) OVER() as total_count
        FROM oficinas o
        LEFT JOIN projetos p ON o.projeto_id = p.id
        LEFT JOIN usuarios u ON o.responsavel_id = u.id
        WHERE ${whereClause}
        ORDER BY o.data_inicio DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      const result = await this.pool.query(query, [...params, limit, offset]);

      const oficinas = formatArrayDates(result.rows, ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);
      const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

      const response = {
        data: oficinas,
        pagination: {
          page: parseInt(String(page)),
          limit: parseInt(String(limit)),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache apenas para consultas sem filtros complexos
      if (!search && !data_inicio && !data_fim && page === 1) {
        const cacheKey = `list:${projeto_id || 'all'}:${status || 'all'}:${limit}`;
        await this.setCacheKey(cacheKey, response);
      }

      return response;
    } catch (error) {
      loggerService.error('Erro ao listar oficinas:', { error });
      throw new Error('Erro ao buscar oficinas');
    }
  }

  async buscarOficina(id: number): Promise<Oficina> {
    try {
      // Tentar buscar do cache
      const cachedOficina = await this.getCacheKey<Oficina>(`detail:${id}`);
      if (cachedOficina) {
        return cachedOficina;
      }

      const query = `
        SELECT o.*,
          p.nome as projeto_nome,
          u.nome as responsavel_nome
        FROM oficinas o
        LEFT JOIN projetos p ON o.projeto_id = p.id
        LEFT JOIN usuarios u ON o.responsavel_id = u.id
        WHERE o.id = $1 AND o.ativo = true
      `;

      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error('Oficina não encontrada');
      }

      const oficina = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);

      // Armazenar no cache
      await this.setCacheKey(`detail:${id}`, oficina);

      return oficina;
    } catch (error) {
      loggerService.error('Erro ao buscar oficina:', { error });
      throw error;
    }
  }

  async criarOficina(data: CreateOficinaDTO, userId: string): Promise<Oficina> {
    try {
      // Validar dados
      const validatedData = createOficinaSchema.parse({ ...data, responsavel_id: userId });

      // Verificar se o projeto existe (se fornecido)
      if (validatedData.projeto_id) {
        const projetoCheck = await this.pool.query(
          "SELECT id FROM projetos WHERE id = $1 AND ativo = true",
          [validatedData.projeto_id]
        );
        if (projetoCheck.rows.length === 0) {
          throw new Error('Projeto não encontrado');
        }
      }

      const query = `
        INSERT INTO oficinas (
          nome, descricao, instrutor, data_inicio, data_fim,
          horario_inicio, horario_fim, local, vagas_total,
          projeto_id, responsavel_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        validatedData.nome,
        validatedData.descricao,
        validatedData.instrutor,
        validatedData.data_inicio,
        validatedData.data_fim,
        validatedData.horario_inicio,
        validatedData.horario_fim,
        validatedData.local,
        validatedData.vagas_total,
        validatedData.projeto_id,
        userId,
        validatedData.status || 'ativa'
      ]);

      const oficina = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);

      // Invalidar cache
      await this.invalidateCache(['list:*']);

      return oficina;
    } catch (error) {
      loggerService.error('Erro ao criar oficina:', { error });
      throw error;
    }
  }

  async atualizarOficina(id: number, data: UpdateOficinaDTO, userId: string, userRole: string): Promise<Oficina> {
    try {
      // Validar dados
      const validatedData = updateOficinaSchema.parse(data);

      // Verificar se a oficina existe e se o usuário tem permissão
      const oficinaCheck = await this.pool.query(
        "SELECT responsavel_id FROM oficinas WHERE id = $1 AND ativo = true",
        [id]
      );

      if (oficinaCheck.rows.length === 0) {
        throw new Error('Oficina não encontrada');
      }

      const isResponsavel = oficinaCheck.rows[0].responsavel_id === parseInt(String(userId));
      const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(userRole);

      if (!isResponsavel && !isAdmin) {
        throw new Error('Sem permissão para editar esta oficina');
      }

      // Verificar se o projeto existe (se fornecido)
      if (validatedData.projeto_id) {
        const projetoCheck = await this.pool.query(
          "SELECT id FROM projetos WHERE id = $1 AND ativo = true",
          [validatedData.projeto_id]
        );
        if (projetoCheck.rows.length === 0) {
          throw new Error('Projeto não encontrado');
        }
      }

      const providedFields = Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([key]) => key);

      const fieldsToUpdate = providedFields.filter(field => validatedData[field as keyof UpdateOficinaDTO] !== undefined);

      if (fieldsToUpdate.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      const setClauses = fieldsToUpdate.map((field, index) => `${field} = $${index + 1}`);
      const queryParams = fieldsToUpdate.map(field => validatedData[field as keyof UpdateOficinaDTO]);

      const query = `
        UPDATE oficinas 
        SET ${setClauses.join(', ')}, data_atualizacao = NOW()
        WHERE id = $${fieldsToUpdate.length + 1} AND ativo = true
        RETURNING *
      `;

      const result = await this.pool.query(query, [...queryParams, id]);
      const oficina = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);

      // Invalidar cache
      await this.invalidateCache(['list:*', `detail:${id}`]);

      return oficina;
    } catch (error) {
      loggerService.error('Erro ao atualizar oficina:', { error });
      throw error;
    }
  }

  async excluirOficina(id: number, userId: string, userRole: string): Promise<void> {
    try {
      // Verificar se a oficina existe e se o usuário tem permissão
      const oficinaCheck = await this.pool.query(
        "SELECT responsavel_id, nome FROM oficinas WHERE id = $1 AND ativo = true",
        [id]
      );

      if (oficinaCheck.rows.length === 0) {
        throw new Error('Oficina não encontrada');
      }

      const isResponsavel = oficinaCheck.rows[0].responsavel_id === parseInt(String(userId));
      const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(userRole);

      if (!isResponsavel && !isAdmin) {
        throw new Error('Sem permissão para excluir esta oficina');
      }

      // Soft delete
      await this.pool.query(
        'UPDATE oficinas SET ativo = false, data_atualizacao = NOW() WHERE id = $1',
        [id]
      );

      // Invalidar cache
      await this.invalidateCache(['list:*', `detail:${id}`]);

    } catch (error) {
      loggerService.error('Erro ao excluir oficina:', { error });
      throw error;
    }
  }

  async listarParticipantes(id: number): Promise<any[]> {
    try {
      // Tentar buscar do cache
      const cachedParticipantes = await this.getCacheKey<any[]>(`participantes:${id}`);
      if (cachedParticipantes) {
        return cachedParticipantes;
      }

      // Primeiro buscar o projeto_id da oficina
      const oficinaResult = await this.pool.query(
        `SELECT projeto_id FROM oficinas WHERE id = $1 AND ativo = true`,
        [id]
      );

      if (oficinaResult.rows.length === 0) {
        throw new Error('Oficina não encontrada');
      }

      const projeto_id = oficinaResult.rows[0].projeto_id;

      // Buscar participantes do projeto
      const query = `
        SELECT 
          b.id, b.nome_completo, b.email, b.telefone,
          p.data_inscricao, p.status as status_participacao
        FROM participacoes p
        JOIN beneficiarias b ON p.beneficiaria_id = b.id
        WHERE p.projeto_id = $1 AND p.ativo = true AND b.ativo = true
        ORDER BY b.nome_completo
      `;

      const result = await this.pool.query(query, [projeto_id]);
      const participantes = formatArrayDates(result.rows, ['data_inscricao']);

      // Armazenar no cache
      await this.setCacheKey(`participantes:${id}`, participantes);

      return participantes;
    } catch (error) {
      loggerService.error('Erro ao listar participantes:', { error });
      throw error;
    }
  }
}
