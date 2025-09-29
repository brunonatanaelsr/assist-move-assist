import { Pool } from 'pg';
import type { RedisClient } from '../lib/redis';
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

type OficinaColumnMap = {
  nome: string | null;
  descricao: string | null;
  instrutor: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  local: string | null;
  vagas_total: string | null;
  projeto_id: string | null;
  responsavel_id: string | null;
  status: string | null;
  ativo: string | null;
  data_criacao: string | null;
  data_atualizacao: string | null;
};

export interface OficinaListItem extends Record<string, unknown> {
  id: number;
  nome: string | null;
  descricao: string | null;
  instrutor: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  local: string | null;
  vagas_total: number | null;
  projeto_id: number | null;
  responsavel_id: number | string | null;
  status: string | null;
  ativo: boolean | null;
  data_criacao: string | null;
  data_atualizacao: string | null;
  projeto_nome?: string | null;
  responsavel_nome?: string | null;
  total_count?: string | number | null;
}

export interface OficinasPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListarOficinasResponse {
  data: OficinaListItem[];
  pagination: OficinasPagination;
}

export class OficinaService {
  private pool: Pool;
  private redis: RedisClient;
  private readonly CACHE_TTL = 300; // 5 minutos
  private columnMapPromise: Promise<OficinaColumnMap> | null = null;

  constructor(pool: Pool, redis: RedisClient) {
    this.pool = pool;
    this.redis = redis;
  }

  private async getColumnMap(): Promise<OficinaColumnMap> {
    if (!this.columnMapPromise) {
      this.columnMapPromise = this.loadColumnMap();
    }
    return this.columnMapPromise;
  }

  private async loadColumnMap(): Promise<OficinaColumnMap> {
    try {
      const result = await this.pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        ['oficinas']
      );

      const columns = new Set(result.rows.map((row) => row.column_name));
      const resolve = (...candidates: string[]): string | null => {
        for (const candidate of candidates) {
          if (candidate && columns.has(candidate)) {
            return candidate;
          }
        }
        return null;
      };

      const columnMap: OficinaColumnMap = {
        nome: resolve('nome', 'titulo'),
        descricao: resolve('descricao', 'descricao_detalhada'),
        instrutor: resolve('instrutor', 'responsavel_nome'),
        data_inicio: resolve('data_inicio', 'data', 'data_oficina'),
        data_fim: resolve('data_fim', 'data_termino', 'data_encerramento'),
        horario_inicio: resolve('horario_inicio', 'hora_inicio'),
        horario_fim: resolve('horario_fim', 'hora_fim'),
        local: resolve('local', 'localizacao'),
        vagas_total: resolve('vagas_total', 'capacidade_maxima', 'vagas'),
        projeto_id: resolve('projeto_id'),
        responsavel_id: resolve('responsavel_id', 'usuario_id'),
        status: resolve('status', 'situacao'),
        ativo: resolve('ativo', 'is_active'),
        data_criacao: resolve('data_criacao', 'created_at'),
        data_atualizacao: resolve('data_atualizacao', 'updated_at')
      };

      if (!columnMap.nome) {
        loggerService.error('Tabela de oficinas não possui coluna para nome/titulo');
      }

      if (!columnMap.data_inicio) {
        loggerService.error('Tabela de oficinas não possui coluna de data de início');
      }

      return columnMap;
    } catch (error) {
      loggerService.error('Erro ao inspecionar colunas da tabela oficinas:', { error });
      throw error;
    }
  }

  private buildSelectAlias(column: string | null, alias: string, type: 'text' | 'integer' | 'boolean' | 'date' | 'timestamp', options?: { default?: string }): string {
    if (column) {
      if (options?.default) {
        return `COALESCE(o.${column}, ${options.default}) AS ${alias}`;
      }
      return `o.${column} AS ${alias}`;
    }

    const casts: Record<typeof type, string> = {
      text: 'TEXT',
      integer: 'INT',
      boolean: 'BOOLEAN',
      date: 'DATE',
      timestamp: 'TIMESTAMP'
    } as const;

    const defaultValue = options?.default ? options.default : `NULL::${casts[type]}`;
    return `${defaultValue} AS ${alias}`;
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

  async listarOficinas(filters: OficinaFilters): Promise<ListarOficinasResponse> {
    try {
      const { page, limit, projeto_id, status, data_inicio, data_fim, instrutor, local, search } = filters;
      const offset = (page - 1) * limit;

      // Tentar buscar do cache se não houver filtros complexos
      if (!search && !data_inicio && !data_fim && page === 1) {
        const cacheKey = `list:${projeto_id || 'all'}:${status || 'all'}:${limit}`;
        const cachedData = await this.getCacheKey<ListarOficinasResponse>(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      const columnMap = await this.getColumnMap();

      const selectFields: string[] = [
        'o.id',
        this.buildSelectAlias(columnMap.nome, 'nome', 'text'),
        this.buildSelectAlias(columnMap.descricao, 'descricao', 'text'),
        this.buildSelectAlias(columnMap.instrutor, 'instrutor', 'text'),
        this.buildSelectAlias(columnMap.data_inicio, 'data_inicio', 'date'),
        this.buildSelectAlias(columnMap.data_fim ?? columnMap.data_inicio, 'data_fim', 'date'),
        this.buildSelectAlias(columnMap.horario_inicio, 'horario_inicio', 'text'),
        this.buildSelectAlias(columnMap.horario_fim, 'horario_fim', 'text'),
        this.buildSelectAlias(columnMap.local, 'local', 'text'),
        this.buildSelectAlias(columnMap.vagas_total, 'vagas_total', 'integer'),
        this.buildSelectAlias(columnMap.projeto_id, 'projeto_id', 'integer'),
        this.buildSelectAlias(columnMap.responsavel_id, 'responsavel_id', 'integer'),
        this.buildSelectAlias(columnMap.status, 'status', 'text', { default: `'ativa'::text` }),
        this.buildSelectAlias(columnMap.ativo, 'ativo', 'boolean', { default: 'TRUE' }),
        this.buildSelectAlias(columnMap.data_criacao, 'data_criacao', 'timestamp'),
        this.buildSelectAlias(columnMap.data_atualizacao ?? columnMap.data_criacao, 'data_atualizacao', 'timestamp')
      ];

      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (columnMap.ativo) {
        whereConditions.push(`o.${columnMap.ativo} = true`);
      }

      if (projeto_id && columnMap.projeto_id) {
        paramCount++;
        whereConditions.push(`o.${columnMap.projeto_id} = $${paramCount}`);
        params.push(projeto_id);
      }

      if (status && columnMap.status) {
        paramCount++;
        whereConditions.push(`o.${columnMap.status} = $${paramCount}`);
        params.push(status);
      }

      if (data_inicio) {
        const dateColumn = columnMap.data_inicio || columnMap.data_fim;
        if (dateColumn) {
          paramCount++;
          whereConditions.push(`o.${dateColumn} >= $${paramCount}`);
          params.push(data_inicio);
        }
      }

      if (data_fim) {
        const endColumn = columnMap.data_fim || columnMap.data_inicio;
        if (endColumn) {
          paramCount++;
          whereConditions.push(`o.${endColumn} <= $${paramCount}`);
          params.push(data_fim);
        }
      }

      if (instrutor && columnMap.instrutor) {
        paramCount++;
        whereConditions.push(`o.${columnMap.instrutor} ILIKE $${paramCount}`);
        params.push(`%${instrutor}%`);
      }

      if (local && columnMap.local) {
        paramCount++;
        whereConditions.push(`o.${columnMap.local} ILIKE $${paramCount}`);
        params.push(`%${local}%`);
      }

      const searchableColumns = [columnMap.nome, columnMap.descricao, columnMap.instrutor, columnMap.local].filter(Boolean) as string[];
      if (search && searchableColumns.length > 0) {
        paramCount++;
        const placeholder = `$${paramCount}`;
        whereConditions.push(`(${searchableColumns.map((col) => `o.${col} ILIKE ${placeholder}`).join(' OR ')})`);
        params.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';

      const orderColumn = columnMap.data_inicio || columnMap.data_criacao || 'id';

      const query = `
        SELECT ${selectFields.join(', ')},
          p.nome as projeto_nome,
          u.nome as responsavel_nome,
          COUNT(*) OVER() as total_count
        FROM oficinas o
        LEFT JOIN projetos p ON ${columnMap.projeto_id ? `o.${columnMap.projeto_id}` : 'o.projeto_id'} = p.id
        LEFT JOIN usuarios u ON ${columnMap.responsavel_id ? `o.${columnMap.responsavel_id}` : 'o.responsavel_id'} = u.id
        WHERE ${whereClause}
        ORDER BY o.${orderColumn} DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      const result = await this.pool.query(query, [...params, limit, offset]);

      const rawRows = result.rows as OficinaListItem[];
      const oficinas = formatArrayDates<OficinaListItem>(rawRows, ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);
      const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

      const response: ListarOficinasResponse = {
        data: oficinas,
        pagination: {
          page: parseInt(String(page)),
          limit: parseInt(String(limit)),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

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

      const columnMap = await this.getColumnMap();

      const selectFields: string[] = [
        'o.id',
        this.buildSelectAlias(columnMap.nome, 'nome', 'text'),
        this.buildSelectAlias(columnMap.descricao, 'descricao', 'text'),
        this.buildSelectAlias(columnMap.instrutor, 'instrutor', 'text'),
        this.buildSelectAlias(columnMap.data_inicio, 'data_inicio', 'date'),
        this.buildSelectAlias(columnMap.data_fim ?? columnMap.data_inicio, 'data_fim', 'date'),
        this.buildSelectAlias(columnMap.horario_inicio, 'horario_inicio', 'text'),
        this.buildSelectAlias(columnMap.horario_fim, 'horario_fim', 'text'),
        this.buildSelectAlias(columnMap.local, 'local', 'text'),
        this.buildSelectAlias(columnMap.vagas_total, 'vagas_total', 'integer'),
        this.buildSelectAlias(columnMap.projeto_id, 'projeto_id', 'integer'),
        this.buildSelectAlias(columnMap.responsavel_id, 'responsavel_id', 'integer'),
        this.buildSelectAlias(columnMap.status, 'status', 'text', { default: `'ativa'::text` }),
        this.buildSelectAlias(columnMap.ativo, 'ativo', 'boolean', { default: 'TRUE' }),
        this.buildSelectAlias(columnMap.data_criacao, 'data_criacao', 'timestamp'),
        this.buildSelectAlias(columnMap.data_atualizacao ?? columnMap.data_criacao, 'data_atualizacao', 'timestamp')
      ];

      const whereParts = [`o.id = $1`];
      if (columnMap.ativo) {
        whereParts.push(`o.${columnMap.ativo} = true`);
      }

      const query = `
        SELECT ${selectFields.join(', ')},
          p.nome as projeto_nome,
          u.nome as responsavel_nome
        FROM oficinas o
        LEFT JOIN projetos p ON ${columnMap.projeto_id ? `o.${columnMap.projeto_id}` : 'o.projeto_id'} = p.id
        LEFT JOIN usuarios u ON ${columnMap.responsavel_id ? `o.${columnMap.responsavel_id}` : 'o.responsavel_id'} = u.id
        WHERE ${whereParts.join(' AND ')}
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

      const columnMap = await this.getColumnMap();

      const requiredColumns: Array<[string | null, string]> = [
        [columnMap.nome, 'nome'],
        [columnMap.data_inicio, 'data_inicio'],
        [columnMap.horario_inicio, 'horario_inicio'],
        [columnMap.horario_fim, 'horario_fim'],
        [columnMap.vagas_total, 'vagas_total']
      ];
      const missing = requiredColumns.filter(([column]) => !column).map(([, field]) => field);
      if (missing.length > 0) {
        loggerService.error('Estrutura de tabela de oficinas incompatível para criação', { missing });
        throw new Error('Estrutura de oficinas inválida para criação');
      }

      const columnMapping: Array<{ key: keyof CreateOficinaDTO | 'responsavel_id' | 'status'; column: string | null; value: any }> = [
        { key: 'nome', column: columnMap.nome, value: validatedData.nome },
        { key: 'descricao', column: columnMap.descricao, value: validatedData.descricao ?? null },
        { key: 'instrutor', column: columnMap.instrutor, value: validatedData.instrutor ?? null },
        { key: 'data_inicio', column: columnMap.data_inicio, value: validatedData.data_inicio },
        { key: 'data_fim', column: columnMap.data_fim, value: validatedData.data_fim ?? null },
        { key: 'horario_inicio', column: columnMap.horario_inicio, value: validatedData.horario_inicio },
        { key: 'horario_fim', column: columnMap.horario_fim, value: validatedData.horario_fim },
        { key: 'local', column: columnMap.local, value: validatedData.local ?? null },
        { key: 'vagas_total', column: columnMap.vagas_total, value: validatedData.vagas_total },
        { key: 'projeto_id', column: columnMap.projeto_id, value: validatedData.projeto_id ?? null },
        { key: 'responsavel_id', column: columnMap.responsavel_id, value: userId },
        { key: 'status', column: columnMap.status, value: validatedData.status || 'ativa' }
      ];

      const columns: string[] = [];
      const placeholders: string[] = [];
      const values: any[] = [];
      let index = 1;

      for (const entry of columnMapping) {
        if (!entry.column) continue;
        if (entry.value === undefined) continue;
        columns.push(entry.column);
        placeholders.push(`$${index++}`);
        values.push(entry.value);
      }

      const query = `
        INSERT INTO oficinas (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING id
      `;

      const result = await this.pool.query(query, values);
      const createdIdRaw = result.rows[0]?.id;
      const createdId = Number(createdIdRaw);

      if (!createdId || Number.isNaN(createdId)) {
        loggerService.error('Não foi possível recuperar o ID da oficina recém-criada', { createdIdRaw });
        throw new Error('Falha ao criar oficina');
      }

      // Invalidar cache
      await this.invalidateCache(['list:*']);

      const oficina = await this.buscarOficina(createdId);
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
      const columnMap = await this.getColumnMap();

      const responsavelSelect = columnMap.responsavel_id ? `o.${columnMap.responsavel_id} AS responsavel_id` : 'NULL::text AS responsavel_id';
      const checkConditions = [`o.id = $1`];
      if (columnMap.ativo) {
        checkConditions.push(`o.${columnMap.ativo} = true`);
      }

      const oficinaCheck = await this.pool.query(
        `SELECT ${responsavelSelect} FROM oficinas o WHERE ${checkConditions.join(' AND ')}`,
        [id]
      );

      if (oficinaCheck.rows.length === 0) {
        throw new Error('Oficina não encontrada');
      }

      const responsavelDb = oficinaCheck.rows[0]?.responsavel_id;
      const isResponsavel = columnMap.responsavel_id ? String(responsavelDb ?? '') === String(userId) : false;
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

      const providedFields = Object.entries(data).filter(([_, value]) => value !== undefined);

      const columnMapping: Partial<Record<keyof UpdateOficinaDTO, string | null>> = {
        nome: columnMap.nome,
        descricao: columnMap.descricao,
        instrutor: columnMap.instrutor,
        data_inicio: columnMap.data_inicio,
        data_fim: columnMap.data_fim,
        horario_inicio: columnMap.horario_inicio,
        horario_fim: columnMap.horario_fim,
        local: columnMap.local,
        vagas_total: columnMap.vagas_total,
        projeto_id: columnMap.projeto_id,
        responsavel_id: columnMap.responsavel_id,
        status: columnMap.status,
        ativo: columnMap.ativo,
        data_criacao: columnMap.data_criacao,
        data_atualizacao: columnMap.data_atualizacao
      };

      const updates = providedFields
        .map(([key, value]) => {
          const column = columnMapping[key as keyof UpdateOficinaDTO];
          if (!column) return null;
          return { column, value, field: key as keyof UpdateOficinaDTO };
        })
        .filter((entry): entry is { column: string; value: any; field: keyof UpdateOficinaDTO } => entry !== null && validatedData[entry.field] !== undefined);

      if (updates.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      const setClauses = updates.map((entry, index) => `${entry.column} = $${index + 1}`);
      const values = updates.map((entry) => validatedData[entry.field]);

      const timestampClause = columnMap.data_atualizacao ? `, ${columnMap.data_atualizacao} = NOW()` : '';
      const whereClause = [
        `id = $${updates.length + 1}`,
        columnMap.ativo ? `${columnMap.ativo} = true` : null
      ].filter(Boolean).join(' AND ');

      const query = `
        UPDATE oficinas
        SET ${setClauses.join(', ')}${timestampClause}
        WHERE ${whereClause}
        RETURNING id
      `;

      const result = await this.pool.query(query, [...values, id]);
      const updatedId = result.rows[0]?.id ?? id;

      await this.invalidateCache(['list:*', `detail:${id}`]);

      const oficina = await this.buscarOficina(Number(updatedId));
      return oficina;
    } catch (error) {
      loggerService.error('Erro ao atualizar oficina:', { error });
      throw error;
    }
  }

  async excluirOficina(id: number, userId: string, userRole: string): Promise<void> {
    try {
      // Verificar se a oficina existe e se o usuário tem permissão
      const columnMap = await this.getColumnMap();

      const responsavelSelect = columnMap.responsavel_id ? `o.${columnMap.responsavel_id} AS responsavel_id` : 'NULL::text AS responsavel_id';
      const nomeSelect = columnMap.nome ? `o.${columnMap.nome} AS nome` : `'Oficina' AS nome`;
      const checkConditions = [`o.id = $1`];
      if (columnMap.ativo) {
        checkConditions.push(`o.${columnMap.ativo} = true`);
      }

      const oficinaCheck = await this.pool.query(
        `SELECT ${responsavelSelect}, ${nomeSelect} FROM oficinas o WHERE ${checkConditions.join(' AND ')}`,
        [id]
      );

      if (oficinaCheck.rows.length === 0) {
        throw new Error('Oficina não encontrada');
      }

      const responsavelDb = oficinaCheck.rows[0]?.responsavel_id;
      const isResponsavel = columnMap.responsavel_id ? String(responsavelDb ?? '') === String(userId) : false;
      const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(userRole);

      if (!isResponsavel && !isAdmin) {
        throw new Error('Sem permissão para excluir esta oficina');
      }

      if (columnMap.ativo) {
        const timestampClause = columnMap.data_atualizacao ? `, ${columnMap.data_atualizacao} = NOW()` : '';
        await this.pool.query(
          `UPDATE oficinas SET ${columnMap.ativo} = false${timestampClause} WHERE id = $1`,
          [id]
        );
      } else {
        await this.pool.query('DELETE FROM oficinas WHERE id = $1', [id]);
      }

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
      const columnMap = await this.getColumnMap();

      if (!columnMap.projeto_id) {
        loggerService.error('Tabela de oficinas não possui coluna de projeto_id para listar participantes');
        throw new Error('Estrutura de oficinas inválida para participantes');
      }

      const whereParts = [`id = $1`];
      if (columnMap.ativo) {
        whereParts.push(`${columnMap.ativo} = true`);
      }

      const oficinaResult = await this.pool.query(
        `SELECT ${columnMap.projeto_id} AS projeto_id FROM oficinas WHERE ${whereParts.join(' AND ')}`,
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
