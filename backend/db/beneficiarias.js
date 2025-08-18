const pool = require('./index');

const beneficiariasDB = {
  async findAll({ page = 1, limit = 10, search = '', status = '' }) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM beneficiarias WHERE 1=1';
    const values = [];

    if (search) {
      query += ' AND (nome_completo ILIKE $1 OR cpf ILIKE $1 OR email ILIKE $1)';
      values.push(`%${search}%`);
    }

    if (status) {
      query += ` AND status = $${values.length + 1}`;
      values.push(status);
    }

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    
    const countQuery = 'SELECT COUNT(*) FROM beneficiarias';
    const { rows: [{ count }] } = await pool.query(countQuery);
    
    return {
      data: rows,
      pagination: {
        total: parseInt(count),
        pages: Math.ceil(count / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    };
  },

  async findById(id) {
    const query = 'SELECT * FROM beneficiarias WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  async create(beneficiaria) {
    const {
      nome_completo, cpf, telefone, endereco, email,
      data_nascimento
    } = beneficiaria;

    const query = `
      INSERT INTO beneficiarias (
        nome_completo, cpf, telefone, endereco, email,
        data_nascimento, status, data_criacao, data_atualizacao
      ) VALUES ($1, $2, $3, $4, $5, $6, 'ativo', NOW(), NOW())
      RETURNING *
    `;

    const values = [
      nome_completo, cpf, telefone, endereco, email,
      data_nascimento
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async update(id, beneficiaria) {
    const {
      nome_completo, cpf, telefone, endereco, email,
      data_nascimento, status
    } = beneficiaria;

    const query = `
      UPDATE beneficiarias SET
        nome_completo = COALESCE($1, nome_completo),
        cpf = COALESCE($2, cpf),
        telefone = COALESCE($3, telefone),
        endereco = COALESCE($4, endereco),
        email = COALESCE($5, email),
        data_nascimento = COALESCE($6, data_nascimento),
        status = COALESCE($7, status),
        data_atualizacao = NOW()
      WHERE id = $8
      RETURNING *
    `;

    const values = [
      nome_completo, cpf, telefone, endereco, email,
      data_nascimento, status, id
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async delete(id) {
    const query = 'DELETE FROM beneficiarias WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }
};

module.exports = beneficiariasDB;
