const express = require('express');
const { Pool } = require('pg');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { formatArrayDates, formatObjectDates } = require('../utils/dateFormatter');
const { authenticateToken, requireGestor } = require('../middleware/auth');

const router = express.Router();

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '15002031',
});

// Listar beneficiárias
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('=== LISTAGEM DE BENEFICIÁRIAS INICIADA ===');
    console.log('Query params:', req.query);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status;
    const bairro = req.query.bairro;
    const offset = (page - 1) * limit;

    let whereConditions = ['ativo = true'];
    let params = [];
    let paramCount = 0;

    // Filtro de busca por nome, CPF ou email
    if (search) {
      paramCount++;
      whereConditions.push(`(nome_completo ILIKE $${paramCount} OR cpf ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    // Filtro por status
    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    // Filtro por bairro
    if (bairro) {
      paramCount++;
      whereConditions.push(`bairro ILIKE $${paramCount}`);
      params.push(`%${bairro}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Log da query para debug
    console.log('Query conditions:', whereClause);
    console.log('Query params:', params);

    const query = `
      SELECT * FROM beneficiarias 
      WHERE ${whereClause} 
      ORDER BY nome_completo 
      LIMIT $${paramCount + 1} 
      OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    console.log('Final query:', query);
    console.log('Final params:', params);

    const result = await pool.query(query, params);

    // Log dos resultados
    console.log('Query results:', result.rows.length);

    // Query para contar total
    const countQuery = `SELECT COUNT(*) FROM beneficiarias WHERE ${whereClause}`;
    const countParams = params.slice(0, -2); // Remove limit e offset
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    console.log('Total count:', total);

    console.log(`Beneficiarias request from ${req.ip}: page=${page}, limit=${limit}, search=${search || "no"}`);

    // Formatar datas das beneficiárias
    const beneficiariasFormatadas = formatArrayDates(result.rows, ['data_nascimento', 'data_cadastro', 'data_atualizacao']);

    res.json(successResponse(
      beneficiariasFormatadas,
      "Beneficiárias carregadas com sucesso",
      {
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    ));

  } catch (error) {
    console.error("Beneficiarias error:", error);
    res.status(500).json(errorResponse("Erro ao buscar beneficiárias"));
  }
});

// Rota para formulário de nova beneficiária
router.get('/novo', authenticateToken, requireGestor, async (req, res) => {
  try {
    // Retornar template de beneficiária
    const template = {
      nome_completo: '',
      cpf: '',
      rg: '',
      data_nascimento: null,
      email: '',
      contato1: '',
      contato2: '',
      endereco: '',
      bairro: '',
      cep: '',
      cidade: 'São Paulo',
      estado: 'SP',
      escolaridade: '',
      profissao: '',
      renda_familiar: null,
      composicao_familiar: '',
      programa_servico: '',
      observacoes: '',
      necessidades_especiais: '',
      medicamentos: '',
      alergias: '',
      contato_emergencia: '',
      data_inicio_instituto: null
    };

    res.json(successResponse(template, "Template de nova beneficiária"));
  } catch (error) {
    console.error("Get template error:", error);
    res.status(500).json(errorResponse("Erro ao carregar template"));
  }
});

// Obter beneficiária específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('=== DETALHES DE BENEFICIÁRIA INICIADO ===');
    const { id } = req.params;
    console.log('ID requisitado:', id);

    const result = await pool.query(`
      SELECT 
        id,
        nome_completo,
        cpf,
        rg,
        data_nascimento,
        email,
        contato1,
        contato2,
        endereco,
        bairro,
        cep,
        cidade,
        estado,
        escolaridade,
        profissao,
        renda_familiar,
        composicao_familiar,
        programa_servico,
        observacoes,
        necessidades_especiais,
        medicamentos,
        alergias,
        contato_emergencia,
        data_inicio_instituto,
        data_cadastro,
        data_atualizacao,
        ativo,
        status
      FROM beneficiarias 
      WHERE id = $1 AND ativo = true`,
      [id]
    );

    if (result.rows.length === 0) {
      console.log('Beneficiária não encontrada com ID:', id);
      return res.status(404).json(errorResponse("Beneficiária não encontrada"));
    }

    const beneficiariaFormatada = formatObjectDates(result.rows[0], ['data_nascimento', 'data_cadastro', 'data_atualizacao', 'data_inicio_instituto']);
    console.log('Dados formatados:', beneficiariaFormatada);

    res.json(successResponse(beneficiariaFormatada, "Beneficiária carregada com sucesso"));

  } catch (error) {
    console.error("Get beneficiaria error:", error);
    res.status(500).json(errorResponse("Erro ao buscar beneficiária"));
  }
});

// Criar beneficiária
router.post('/', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { 
      nome_completo, cpf, rg, data_nascimento, email, contato1, contato2,
      endereco, bairro, cep, cidade, estado, escolaridade, profissao, renda_familiar,
      composicao_familiar, programa_servico, observacoes, necessidades_especiais,
      medicamentos, alergias, contato_emergencia, data_inicio_instituto
    } = req.body;

    if (!nome_completo) {
      return res.status(400).json(errorResponse("Nome completo é obrigatório"));
    }

    // Verificar se CPF já existe (se fornecido)
    if (cpf) {
      const cpfCheck = await pool.query("SELECT id FROM beneficiarias WHERE cpf = $1 AND ativo = true", [cpf]);
      if (cpfCheck.rows.length > 0) {
        return res.status(400).json(errorResponse("CPF já cadastrado"));
      }
    }

    const insertQuery = `
      INSERT INTO beneficiarias (
        nome_completo, cpf, rg, data_nascimento, email, contato1, contato2,
        endereco, bairro, cep, cidade, estado, escolaridade, profissao, renda_familiar,
        composicao_familiar, programa_servico, observacoes, necessidades_especiais,
        medicamentos, alergias, contato_emergencia, data_inicio_instituto
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      nome_completo, cpf || null, rg || null, data_nascimento || null,
      email || null, contato1 || null, contato2 || null,
      endereco || null, bairro || null, cep || null,
      cidade || 'São Paulo', estado || 'SP',
      escolaridade || null, profissao || null, renda_familiar || null,
      composicao_familiar || null, programa_servico || null, observacoes || null,
      necessidades_especiais || null, medicamentos || null, alergias || null,
      contato_emergencia || null, data_inicio_instituto || null
    ]);

    console.log(`Nova beneficiária criada: ${nome_completo} por ${req.user.email}`);

    const beneficiariaFormatada = formatObjectDates(result.rows[0], ['data_nascimento', 'data_cadastro']);

    res.status(201).json(successResponse(beneficiariaFormatada, "Beneficiária criada com sucesso"));

  } catch (error) {
    console.error("Create beneficiaria error:", error);
    if (error.code === '23505') {
      res.status(400).json(errorResponse("CPF já cadastrado"));
    } else {
      res.status(500).json(errorResponse("Erro ao criar beneficiária"));
    }
  }
});

// Atualizar beneficiária
router.put('/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nome_completo, cpf, rg, data_nascimento, email, contato1, contato2,
      endereco, bairro, cep, cidade, estado, escolaridade, profissao, renda_familiar,
      composicao_familiar, programa_servico, observacoes, necessidades_especiais,
      medicamentos, alergias, contato_emergencia, data_inicio_instituto
    } = req.body;

    if (!nome_completo) {
      return res.status(400).json(errorResponse("Nome completo é obrigatório"));
    }

    // Verificar se beneficiária existe
    const checkQuery = "SELECT id FROM beneficiarias WHERE id = $1 AND ativo = true";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json(errorResponse("Beneficiária não encontrada"));
    }

    // Verificar se CPF já existe em outro registro
    if (cpf) {
      const cpfCheck = await pool.query(
        "SELECT id FROM beneficiarias WHERE cpf = $1 AND id != $2 AND ativo = true", 
        [cpf, id]
      );
      if (cpfCheck.rows.length > 0) {
        return res.status(400).json(errorResponse("CPF já cadastrado para outra beneficiária"));
      }
    }

    const updateQuery = `
      UPDATE beneficiarias SET 
        nome_completo = $1, cpf = $2, rg = $3, data_nascimento = $4,
        email = $5, contato1 = $6, contato2 = $7,
        endereco = $8, bairro = $9, cep = $10, cidade = $11, estado = $12,
        escolaridade = $13, profissao = $14, renda_familiar = $15,
        composicao_familiar = $16, programa_servico = $17, observacoes = $18,
        necessidades_especiais = $19, medicamentos = $20, alergias = $21,
        contato_emergencia = $22, data_inicio_instituto = $23, data_atualizacao = NOW()
      WHERE id = $24
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      nome_completo, cpf || null, rg || null, data_nascimento || null,
      email || null, contato1 || null, contato2 || null,
      endereco || null, bairro || null, cep || null,
      cidade || 'São Paulo', estado || 'SP',
      escolaridade || null, profissao || null, renda_familiar || null,
      composicao_familiar || null, programa_servico || null, observacoes || null,
      necessidades_especiais || null, medicamentos || null, alergias || null,
      contato_emergencia || null, data_inicio_instituto || null, id
    ]);

    console.log(`Beneficiária atualizada: ${nome_completo} por ${req.user.email}`);

    const beneficiariaFormatada = formatObjectDates(result.rows[0], ['data_nascimento', 'data_cadastro', 'data_atualizacao']);

    res.json(successResponse(beneficiariaFormatada, "Beneficiária atualizada com sucesso"));

  } catch (error) {
    console.error("Update beneficiaria error:", error);
    if (error.code === '23505') {
      res.status(400).json(errorResponse("CPF já cadastrado"));
    } else {
      res.status(500).json(errorResponse("Erro ao atualizar beneficiária"));
    }
  }
});

// Deletar beneficiária (soft delete)
router.delete('/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = "SELECT nome_completo FROM beneficiarias WHERE id = $1 AND ativo = true";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json(errorResponse("Beneficiária não encontrada"));
    }

    const updateQuery = "UPDATE beneficiarias SET ativo = false, data_atualizacao = NOW() WHERE id = $1";
    await pool.query(updateQuery, [id]);

    console.log(`Beneficiária removida: ${checkResult.rows[0].nome_completo} por ${req.user.email}`);

    res.json(successResponse(null, "Beneficiária removida com sucesso"));

  } catch (error) {
    console.error("Delete beneficiaria error:", error);
    res.status(500).json(errorResponse("Erro ao remover beneficiária"));
  }
});

// Obter atividades/participações de uma beneficiária
router.get('/:id/atividades', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        o.id, o.nome, o.data_inicio, o.data_fim,
        p.data_inscricao, p.status_participacao, p.avaliacao
       FROM participacoes p
       JOIN oficinas o ON p.oficina_id = o.id
       WHERE p.beneficiaria_id = $1 AND p.ativo = true AND o.ativo = true
       ORDER BY o.data_inicio DESC`,
      [id]
    );

    const atividadesFormatadas = formatArrayDates(result.rows, ['data_inicio', 'data_fim', 'data_inscricao']);

    res.json(successResponse(atividadesFormatadas, "Atividades carregadas com sucesso"));

  } catch (error) {
    console.error("Get atividades error:", error);
    res.status(500).json(errorResponse("Erro ao buscar atividades"));
  }
});

// Obter estatísticas de bairros
router.get('/stats/bairros', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bairro, COUNT(*) as total
       FROM beneficiarias 
       WHERE ativo = true AND bairro IS NOT NULL AND bairro != ''
       GROUP BY bairro 
       ORDER BY total DESC 
       LIMIT 10`
    );

    res.json(successResponse(result.rows, "Estatísticas de bairros carregadas com sucesso"));

  } catch (error) {
    console.error("Get bairros stats error:", error);
    res.status(500).json(errorResponse("Erro ao buscar estatísticas de bairros"));
  }
});

module.exports = router;
