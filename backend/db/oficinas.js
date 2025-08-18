const pool = require('./index');

const oficinasDB = {
  async findAll({ page = 1, limit = 10, status = '' }) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM oficinas WHERE 1=1';
    const values = [];

    if (status) {
      query += ' AND status = $1';
      values.push(status);
    }

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    
    const countQuery = 'SELECT COUNT(*) FROM oficinas';
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
    const query = 'SELECT * FROM oficinas WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  async create(oficina) {
    const {
      titulo, descricao, data_inicio, data_fim,
      horario_inicio, horario_fim, local, capacidade_max,
      instrutor, categoria
    } = oficina;

    const query = `
      INSERT INTO oficinas (
        titulo, descricao, data_inicio, data_fim,
        horario_inicio, horario_fim, local, capacidade_max,
        instrutor, categoria, status, data_criacao, data_atualizacao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ativo', NOW(), NOW())
      RETURNING *
    `;

    const values = [
      titulo, descricao, data_inicio, data_fim,
      horario_inicio, horario_fim, local, capacidade_max,
      instrutor, categoria
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async update(id, oficina) {
    const {
      titulo, descricao, data_inicio, data_fim,
      horario_inicio, horario_fim, local, capacidade_max,
      instrutor, categoria, status
    } = oficina;

    const query = `
      UPDATE oficinas SET
        titulo = COALESCE($1, titulo),
        descricao = COALESCE($2, descricao),
        data_inicio = COALESCE($3, data_inicio),
        data_fim = COALESCE($4, data_fim),
        horario_inicio = COALESCE($5, horario_inicio),
        horario_fim = COALESCE($6, horario_fim),
        local = COALESCE($7, local),
        capacidade_max = COALESCE($8, capacidade_max),
        instrutor = COALESCE($9, instrutor),
        categoria = COALESCE($10, categoria),
        status = COALESCE($11, status),
        data_atualizacao = NOW()
      WHERE id = $12
      RETURNING *
    `;

    const values = [
      titulo, descricao, data_inicio, data_fim,
      horario_inicio, horario_fim, local, capacidade_max,
      instrutor, categoria, status, id
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async delete(id) {
    const query = 'DELETE FROM oficinas WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  async findParticipantes(oficinaId) {
    const query = `
      SELECT b.* FROM beneficiarias b
      INNER JOIN participacoes p ON p.beneficiaria_id = b.id
      WHERE p.oficina_id = $1
    `;
    const { rows } = await pool.query(query, [oficinaId]);
    return rows;
  },

  async addParticipante(oficinaId, beneficiariaId) {
    const query = `
      INSERT INTO participacoes (
        oficina_id, beneficiaria_id, status,
        data_inscricao, data_atualizacao
      ) VALUES ($1, $2, 'inscrita', NOW(), NOW())
      RETURNING *
    `;
    const { rows } = await pool.query(query, [oficinaId, beneficiariaId]);
    return rows[0];
  }
};

module.exports = oficinasDB;
