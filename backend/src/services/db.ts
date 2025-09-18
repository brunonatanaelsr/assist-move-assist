import { db as client } from '../config/database';

type QueryParam =
  | string
  | number
  | boolean
  | Date
  | Buffer
  | Array<unknown>
  | Record<string, unknown>
  | null;

interface BeneficiariaFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

const insert = async (table: string, data: Record<string, any>) => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
  const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  const result = await client.query(query, values);
  return result[0];
};

const update = async (table: string, id: string | number, data: Record<string, any>) => {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    return findById(table, id);
  }
  const values = Object.values(data);
  const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
  const query = `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
  const result = await client.query(query, [...values, id]);
  return result[0];
};

const findById = async (table: string, id: string | number) => {
  const result = await client.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return result[0] || null;
};

const getBeneficiarias = async (filters: BeneficiariaFilters) => {
  let query = 'SELECT * FROM beneficiarias WHERE 1=1';
  const params: any[] = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    query += ` AND (nome_completo ILIKE $${params.length} OR cpf ILIKE $${params.length})`;
  }

  if (filters.status) {
    params.push(filters.status);
    query += ` AND status = $${params.length}`;
  }

  query += ' ORDER BY created_at DESC';

  if (filters.limit !== undefined) {
    params.push(filters.limit);
    query += ` LIMIT $${params.length}`;
  }

  if (filters.offset !== undefined) {
    params.push(filters.offset);
    query += ` OFFSET $${params.length}`;
  }

  return client.query(query, params);
};

const getStats = async () => {
  const [totalBeneficiarias, activeBeneficiarias, totalFormularios, totalAtendimentos] = await Promise.all([
    client.query('SELECT COUNT(*)::int AS total FROM beneficiarias WHERE deleted_at IS NULL'),
    client.query("SELECT COUNT(*)::int AS total FROM beneficiarias WHERE status = 'ativa' AND deleted_at IS NULL"),
    client.query('SELECT COUNT(*)::int AS total FROM formularios'),
    client.query('SELECT COUNT(*)::int AS total FROM historico_atendimentos')
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

const query = async <T = any>(text: string, params?: QueryParam[]): Promise<T[]> => {
  return client.query(text, params) as Promise<T[]>;
};

const one = async <T = any>(text: string, params?: QueryParam[]): Promise<T> => {
  const rows = await query<T>(text, params);
  if (!rows || rows.length === 0) {
    throw new Error('Query retornou nenhum resultado');
  }
  const [first] = rows;
  if (first === undefined) {
    throw new Error('Query retornou nenhum resultado');
  }
  return first;
};

const oneOrNone = async <T = any>(text: string, params?: QueryParam[]): Promise<T | null> => {
  const rows = await query<T>(text, params);
  const [first] = rows;
  return first ?? null;
};

const manyOrNone = async <T = any>(text: string, params?: QueryParam[]): Promise<T[]> => {
  const rows = await query<T>(text, params);
  return rows ?? [];
};

const none = async (text: string, params?: QueryParam[]): Promise<void> => {
  await query(text, params);
};

export const db = {
  query,
  one,
  oneOrNone,
  none,
  manyOrNone,
  insert,
  update,
  findById,
  getBeneficiarias,
  getStats
};

export default db;
