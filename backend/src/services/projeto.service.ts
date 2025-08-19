import { Pool } from 'pg';
import Redis from 'ioredis';
import {
  Projeto,
  CreateProjetoDTO,
  UpdateProjetoDTO,
  ProjetoFilters,
  projetoSchema,
  createProjetoSchema,
  updateProjetoSchema
} from '../validators/projeto.validator';

export class ProjetoService {
  private pool: Pool;
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
  }

  private async getCacheKey(key: string) {
    try {
      const data = await this.redis.get(`projetos:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Erro ao buscar cache:', error);
      return null;
    }
  }

  private async setCacheKey(key: string, data: any) {
    try {
      await this.redis.setex(`projetos:${key}`, this.CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao definir cache:', error);
    }
  }

  private async invalidateCache(patterns: string[]) {
    try {
      const keys = await Promise.all(
        patterns.map(pattern => this.redis.keys(`projetos:${pattern}`))
      );
      const allKeys = keys.flat();
      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
      }
    } catch (error) {
      console.error('Erro ao invalidar cache:', error);
    }
  }

  async listarProjetos(filters: ProjetoFilters) {
    try {
      const { page = 1, limit = 50, status, search } = filters;
      const offset = (page - 1) * limit;

      // Tentar buscar do cache se não houver filtros complexos
      if (!search && page === 1) {
        const cacheKey = `list:${status || 'all'}:${limit}`;
        const cachedData = await this.getCacheKey(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      let whereConditions = ['p.ativo = true'];
      let params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        whereConditions.push(`p.status = $${paramCount}`);
        params.push(status);
      }

      if (search) {
        paramCount++;
        whereConditions.push(`(
          p.nome ILIKE $${paramCount} OR
          p.descricao ILIKE $${paramCount} OR
          p.local_execucao ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          p.*,
          u.nome as responsavel_nome,
          COUNT(o.id) as total_oficinas,
          COUNT(*) OVER() as total_count
        FROM projetos p
        LEFT JOIN usuarios u ON p.responsavel_id = u.id
        LEFT JOIN oficinas o ON p.id = o.projeto_id AND o.ativo = true
        WHERE ${whereClause}
        GROUP BY p.id, u.nome
        ORDER BY p.data_criacao DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      const result = await this.pool.query(query, [...params, limit, offset]);

      const projetos = result.rows;
      const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

      const response = {
        data: projetos,
        pagination: {
          page: parseInt(String(page)),
          limit: parseInt(String(limit)),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache apenas para consultas sem filtros complexos
      if (!search && page === 1) {
        const cacheKey = `list:${status || 'all'}:${limit}`;
        await this.setCacheKey(cacheKey, response);
      }

      return response;
    } catch (error) {
      console.error('Erro ao listar projetos:', error);
      throw new Error('Erro ao buscar projetos');
    }
  }

  async buscarProjeto(id: number): Promise<Projeto> {
    try {
      // Tentar buscar do cache
      const cacheKey = `id:${id}`;
      const cachedData = await this.getCacheKey(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const result = await this.pool.query(
        `SELECT p.*, u.nome as responsavel_nome 
         FROM projetos p
         LEFT JOIN usuarios u ON p.responsavel_id = u.id
         WHERE p.id = $1 AND p.ativo = true`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Projeto não encontrado');
      }

      const projeto = result.rows[0];

      // Salvar no cache
      await this.setCacheKey(cacheKey, projeto);

      return projeto;
    } catch (error) {
      console.error('Erro ao buscar projeto:', error);
      throw error;
    }
  }

  async criarProjeto(data: CreateProjetoDTO): Promise<Projeto> {
    try {
      // Validar dados
      const validatedData = createProjetoSchema.parse(data);

      const result = await this.pool.query(
        `INSERT INTO projetos (
          nome,
          descricao,
          data_inicio,
          data_fim_prevista,
          status,
          responsavel_id,
          orcamento,
          local_execucao,
          ativo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        RETURNING *`,
        [
          validatedData.nome,
          validatedData.descricao,
          validatedData.data_inicio,
          validatedData.data_fim_prevista,
          validatedData.status || 'planejamento',
          validatedData.responsavel_id,
          validatedData.orcamento,
          validatedData.local_execucao
        ]
      );

      const projeto = result.rows[0];

      // Invalidar cache
      await this.invalidateCache(['list:*']);

      return projeto;
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      throw error;
    }
  }

  async atualizarProjeto(id: number, data: UpdateProjetoDTO): Promise<Projeto> {
    try {
      // Validar dados
      const validatedData = updateProjetoSchema.parse(data);

      // Verificar se projeto existe
      const projetoCheck = await this.pool.query(
        "SELECT id FROM projetos WHERE id = $1 AND ativo = true",
        [id]
      );

      if (projetoCheck.rows.length === 0) {
        throw new Error('Projeto não encontrado');
      }

      const fieldsToUpdate = Object.entries(validatedData)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => key);

      const setClauses = fieldsToUpdate.map((field, index) => `${field} = $${index + 1}`);
      const queryParams = fieldsToUpdate.map(field => validatedData[field as keyof UpdateProjetoDTO]);

      const query = `
        UPDATE projetos 
        SET ${setClauses.join(', ')}, data_atualizacao = NOW()
        WHERE id = $${fieldsToUpdate.length + 1} AND ativo = true
        RETURNING *
      `;

      const result = await this.pool.query(query, [...queryParams, id]);
      const projeto = result.rows[0];

      // Invalidar cache
      await this.invalidateCache(['list:*', `id:${id}`]);

      return projeto;
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error);
      throw error;
    }
  }

  async excluirProjeto(id: number): Promise<void> {
    try {
      // Verificar se projeto existe e não tem dependências
      const projetoCheck = await this.pool.query(
        `SELECT p.id, COUNT(o.id) as total_oficinas
         FROM projetos p
         LEFT JOIN oficinas o ON p.id = o.projeto_id AND o.ativo = true
         WHERE p.id = $1 AND p.ativo = true
         GROUP BY p.id`,
        [id]
      );

      if (projetoCheck.rows.length === 0) {
        throw new Error('Projeto não encontrado');
      }

      if (projetoCheck.rows[0].total_oficinas > 0) {
        throw new Error('Não é possível excluir projeto com oficinas ativas');
      }

      // Soft delete
      await this.pool.query(
        'UPDATE projetos SET ativo = false, data_atualizacao = NOW() WHERE id = $1',
        [id]
      );

      // Invalidar cache
      await this.invalidateCache(['list:*', `id:${id}`]);

    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      throw error;
    }
  }
}
