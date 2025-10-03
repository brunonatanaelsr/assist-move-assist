import { pool, query, transaction, executeQuery } from '../config/database';
import { logger } from '../services/logger';
import { NotFoundError } from '../utils/errors';

export interface BaseEntity {
  id: number;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class BaseRepository<T extends BaseEntity> {
  constructor(
    protected tableName: string,
    protected softDelete: boolean = true
  ) {}

  // Método para criar uma nova entidade
  async create(data: Partial<T>): Promise<T> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const sql = `
      INSERT INTO ${this.tableName} 
      (${fields.join(', ')}) 
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    try {
      const result = await query<T>(sql, values);
      if (!result[0]) {
        throw new Error('Falha ao criar registro');
      }
      return result[0];
    } catch (error) {
      logger.error(`Erro ao criar registro em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Método para buscar por ID
  async findById(id: number): Promise<T | null> {
    const whereClause = this.softDelete ? 'AND deleted_at IS NULL' : '';
    
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE id = $1 ${whereClause}
    `;

    try {
      const result = await query<T>(sql, [id]);
      return result[0] || null;
    } catch (error) {
      logger.error(`Erro ao buscar registro por ID em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Método para buscar todos os registros com paginação
  async findAll(params: PaginationParams = {}): Promise<PaginatedResult<T>> {
    const {
      page = 1,
      limit = 10,
      orderBy = 'id',
      orderDirection = 'ASC'
    } = params;

    const offset = (page - 1) * limit;
    const whereClause = this.softDelete ? 'WHERE deleted_at IS NULL' : '';

    const countSql = `
      SELECT COUNT(*) as total 
      FROM ${this.tableName}
      ${whereClause}
    `;

    const sql = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $1 OFFSET $2
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        query<{total: number}>(countSql),
        query<T>(sql, [limit, offset])
      ]);

      if (!countResult[0]) {
        throw new Error('Falha ao obter contagem total');
      }

      const total = parseInt(countResult[0].total.toString());
      const totalPages = Math.ceil(total / limit);

      return {
        data: dataResult,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error(`Erro ao buscar registros em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Método para atualizar uma entidade
  async update(id: number, data: Partial<T>): Promise<T | null> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(', ');

    const whereClause = this.softDelete ? 'AND deleted_at IS NULL' : '';

    const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 ${whereClause}
      RETURNING *
    `;

    try {
      const result = await query<T>(sql, [id, ...values]);
      return result[0] || null;
    } catch (error) {
      logger.error(`Erro ao atualizar registro em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Método para deletar uma entidade (soft delete ou hard delete)
  async delete(id: number): Promise<boolean> {
    let sql: string;
    
    if (this.softDelete) {
      sql = `
        UPDATE ${this.tableName}
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
      `;
    } else {
      sql = `
        DELETE FROM ${this.tableName}
        WHERE id = $1
      `;
    }

    try {
      const result = await executeQuery(sql, [id]);
      const affectedRows = result.rowCount ?? 0;

      if (affectedRows === 0) {
        throw new NotFoundError(`Registro com ID ${id} não encontrado em ${this.tableName}`);
      }

      return affectedRows > 0;
    } catch (error) {
      logger.error(`Erro ao deletar registro em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Método para restaurar um registro deletado (apenas para soft delete)
  async restore(id: number): Promise<T | null> {
    if (!this.softDelete) {
      throw new Error('Restore só está disponível para tabelas com soft delete');
    }

    const sql = `
      UPDATE ${this.tableName}
      SET deleted_at = NULL, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NOT NULL
      RETURNING *
    `;

    try {
      const result = await query<T>(sql, [id]);
      return result[0] || null;
    } catch (error) {
      logger.error(`Erro ao restaurar registro em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Método para executar uma transação personalizada
  async executeTransaction<R>(callback: (client: any) => Promise<R>): Promise<R> {
    return transaction(callback);
  }
}
