import { db as client } from '../config/database';

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
  const [totalBeneficiarias, activeBeneficiarias, totalAnamneses, totalDeclaracoes] = await Promise.all([
    client.query('SELECT COUNT(*)::int AS total FROM beneficiarias'),
    client.query("SELECT COUNT(*)::int AS total FROM beneficiarias WHERE status = 'ativa'"),
    client.query('SELECT COUNT(*)::int AS total FROM anamneses_social'),
    client.query('SELECT COUNT(*)::int AS total FROM declaracoes_comparecimento')
  ]);

  return {
    totalBeneficiarias: Number(totalBeneficiarias[0]?.total || 0),
    activeBeneficiarias: Number(activeBeneficiarias[0]?.total || 0),
    totalAnamneses: Number(totalAnamneses[0]?.total || 0),
    totalDeclaracoes: Number(totalDeclaracoes[0]?.total || 0)
  };
};

const query = client.query.bind(client);

export const db = {
  query,
  insert,
  update,
  findById,
  getBeneficiarias,
  getStats
};

export default db;
