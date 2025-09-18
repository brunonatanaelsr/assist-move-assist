import { db as client } from '../config/database';

type QueryParams = any[] | undefined;

interface BeneficiariaFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

const query = async <T = any>(text: string, params?: QueryParams): Promise<T[]> => {
  const result = await client.query(text, params);
  return (result ?? []) as T[];
};

const one = async <T = any>(text: string, params?: QueryParams): Promise<T> => {
  const rows = await query<T>(text, params);
  if (!rows.length) {
    throw new Error('Query returned no results');
  }
  const [firstRow] = rows;
  if (!firstRow) {
    throw new Error('Query returned no results');
  }
  return firstRow;
};

const manyOrNone = async <T = any>(text: string, params?: QueryParams): Promise<T[]> => {
  const rows = await query<T>(text, params);
  return rows;
};

const none = async (text: string, params?: QueryParams): Promise<void> => {
  await client.query(text, params);
};

const insert = async <T = any>(table: string, data: Record<string, any>): Promise<T> => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
  const statement = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  const result = await query<T>(statement, values);
  const [inserted] = result;
  if (!inserted) {
    throw new Error('Insert returned no results');
  }
  return inserted;
};

const update = async <T = any>(table: string, id: string | number, data: Record<string, any>): Promise<T | null> => {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    return findById<T>(table, id);
  }
  const values = Object.values(data);
  const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
  const statement = `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
  const result = await query<T>(statement, [...values, id]);
  return result[0] ?? null;
};

const findById = async <T = any>(table: string, id: string | number): Promise<T | null> => {
  const result = await query<T>(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return result[0] ?? null;
};

const getBeneficiarias = async (filters: BeneficiariaFilters) => {
  let queryText = 'SELECT * FROM beneficiarias WHERE 1=1';
  const params: any[] = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    queryText += ` AND (nome_completo ILIKE $${params.length} OR cpf ILIKE $${params.length})`;
  }

  if (filters.status) {
    params.push(filters.status);
    queryText += ` AND status = $${params.length}`;
  }

  queryText += ' ORDER BY created_at DESC';

  if (filters.limit !== undefined) {
    params.push(filters.limit);
    queryText += ` LIMIT $${params.length}`;
  }

  if (filters.offset !== undefined) {
    params.push(filters.offset);
    queryText += ` OFFSET $${params.length}`;
  }

  return query(queryText, params);
};

const getStats = async () => {
  const [totalBeneficiarias, activeBeneficiarias, totalFormularios, totalAtendimentos] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM beneficiarias WHERE deleted_at IS NULL'),
    query("SELECT COUNT(*)::int AS total FROM beneficiarias WHERE status = 'ativa' AND deleted_at IS NULL"),
    query('SELECT COUNT(*)::int AS total FROM formularios'),
    query('SELECT COUNT(*)::int AS total FROM historico_atendimentos')
  ]);

  return {
    totalBeneficiarias: Number(totalBeneficiarias[0]?.total || 0),
    activeBeneficiarias: Number(activeBeneficiarias[0]?.total || 0),
    inactiveBeneficiarias: Number(totalBeneficiarias[0]?.total || 0) - Number(activeBeneficiarias[0]?.total || 0),
    totalFormularios: Number(totalFormularios[0]?.total || 0),
    totalAtendimentos: Number(totalAtendimentos[0]?.total || 0),
    engajamento: totalBeneficiarias[0]?.total > 0 ? Math.round((Number(activeBeneficiarias[0]?.total || 0) / Number(totalBeneficiarias[0]?.total || 0)) * 100) : 0
  };
};

export const db = {
  query,
  one,
  none,
  manyOrNone,
  insert,
  update,
  findById,
  getBeneficiarias,
  getStats
};

export default db;
