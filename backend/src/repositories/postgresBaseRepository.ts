import { Pool, PoolClient, QueryResult } from 'pg';
import { BaseRepository } from './interfaces/baseRepository';
import { DatabaseError, NotFoundError } from '../utils';

export abstract class PostgresBaseRepository<T> implements BaseRepository<T> {
  constructor(
    protected readonly pool: Pool,
    protected readonly tableName: string,
    protected readonly primaryKey: string = 'id'
  ) {}

  protected async query(text: string, params?: any[]): Promise<QueryResult> {
    try {
      return await this.pool.query(text, params);
    } catch (error) {
      throw new DatabaseError((error as Error).message);
    }
  }

  async findById(id: number): Promise<T | null> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  async findAll(): Promise<T[]> {
    const result = await this.query(`SELECT * FROM ${this.tableName}`);
    return result.rows;
  }

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const result = await this.query(
      `INSERT INTO ${this.tableName} (${columns})
       VALUES (${placeholders})
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async update(
    id: number,
    data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');

    const result = await this.query(
      `UPDATE ${this.tableName}
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE ${this.primaryKey} = $${keys.length + 1}
       RETURNING *`,
      [...values, id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError(`Registro não encontrado no ID: ${id}`);
    }

    return result.rows[0];
  }

  async delete(id: number): Promise<void> {
    const result = await this.query(
      `DELETE FROM ${this.tableName}
       WHERE ${this.primaryKey} = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError(`Registro não encontrado no ID: ${id}`);
    }
  }

  protected async findByField(field: string, value: any): Promise<T | null> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE ${field} = $1`,
      [value]
    );

    return result.rows[0] || null;
  }

  protected async findManyByField(field: string, value: any): Promise<T[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE ${field} = $1`,
      [value]
    );

    return result.rows;
  }

  protected async findWhere(conditions: Record<string, any>): Promise<T[]> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(' AND ');

    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
      values
    );

    return result.rows;
  }

  protected async count(conditions?: Record<string, any>): Promise<number> {
    let query = `SELECT COUNT(*) FROM ${this.tableName}`;
    let values: any[] = [];

    if (conditions) {
      const keys = Object.keys(conditions);
      values = Object.values(conditions);
      const whereClause = keys
        .map((key, i) => `${key} = $${i + 1}`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    const result = await this.query(query, values);
    return parseInt(result.rows[0].count);
  }

  protected async findWithPagination(
    page: number = 1,
    limit: number = 10,
    conditions?: Record<string, any>,
    orderBy?: string,
    orderDirection: 'ASC' | 'DESC' = 'ASC'
  ): Promise<{ data: T[]; total: number; pages: number }> {
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM ${this.tableName}`;
    let countQuery = `SELECT COUNT(*) FROM ${this.tableName}`;
    let values: any[] = [];
    let whereClause = '';

    if (conditions) {
      const keys = Object.keys(conditions);
      values = Object.values(conditions);
      whereClause = ` WHERE ${keys
        .map((key, i) => `${key} = $${i + 1}`)
        .join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    if (orderBy) {
      query += ` ORDER BY ${orderBy} ${orderDirection}`;
    }

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

    const [dataResult, countResult] = await Promise.all([
      this.query(query, [...values, limit, offset]),
      this.query(countQuery, values)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const pages = Math.ceil(total / limit);

    return {
      data: dataResult.rows,
      total,
      pages
    };
  }

  protected async executeTransaction<R>(
    callback: (client: PoolClient) => Promise<R>
  ): Promise<R> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
