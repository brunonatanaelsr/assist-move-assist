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

// Criar tabela de anamneses se não existir
const createAnamneseTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS anamneses_social (
      id SERIAL PRIMARY KEY,
      beneficiaria_id INTEGER REFERENCES beneficiarias(id) ON DELETE CASCADE,
      composicao_familiar TEXT,
      situacao_habitacional TEXT,
      tipo_moradia TEXT,
      condicoes_moradia TEXT,
      renda_familiar_total DECIMAL(10,2),
      fonte_renda TEXT,
      beneficios_sociais TEXT[],
      gastos_principais TEXT,
      condicao_saude_geral TEXT,
      problemas_saude TEXT,
      uso_medicamentos BOOLEAN DEFAULT false,
      medicamentos_uso TEXT,
      acompanhamento_medico BOOLEAN DEFAULT false,
      nivel_escolaridade TEXT,
      desejo_capacitacao TEXT,
      areas_interesse TEXT[],
      rede_apoio TEXT,
      participacao_comunitaria TEXT,
      violencias_enfrentadas TEXT,
      expectativas_programa TEXT,
      objetivos_pessoais TEXT,
      disponibilidade_participacao TEXT,
      observacoes TEXT,
      responsavel_preenchimento TEXT,
      ativo BOOLEAN DEFAULT true,
      data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_anamneses_social_beneficiaria ON anamneses_social(beneficiaria_id);
  `;
  
  try {
    await pool.query(query);
    console.log('Tabela anamneses_social criada/verificada com sucesso');
  } catch (error) {
    console.error('Erro ao criar tabela anamneses_social:', error);
  }
};

// Inicializar tabela
createAnamneseTable();

// Salvar anamnese social
router.post('/anamnese', authenticateToken, async (req, res) => {
  try {
    const {
      beneficiaria_id,
      composicao_familiar,
      situacao_habitacional,
      tipo_moradia,
      condicoes_moradia,
      renda_familiar_total,
      fonte_renda,
      beneficios_sociais,
      gastos_principais,
      condicao_saude_geral,
      problemas_saude,
      uso_medicamentos,
      medicamentos_uso,
      acompanhamento_medico,
      nivel_escolaridade,
      desejo_capacitacao,
      areas_interesse,
      rede_apoio,
      participacao_comunitaria,
      violencias_enfrentadas,
      expectativas_programa,
      objetivos_pessoais,
      disponibilidade_participacao,
      observacoes
    } = req.body;

    if (!beneficiaria_id) {
      return res.status(400).json(errorResponse("ID da beneficiária é obrigatório"));
    }

    // Verificar se beneficiária existe
    const beneficiariaCheck = await pool.query(
      "SELECT id FROM beneficiarias WHERE id = $1 AND ativo = true",
      [beneficiaria_id]
    );

    if (beneficiariaCheck.rows.length === 0) {
      return res.status(404).json(errorResponse("Beneficiária não encontrada"));
    }

    const insertQuery = `
      INSERT INTO anamneses_social (
        beneficiaria_id, composicao_familiar, situacao_habitacional, tipo_moradia,
        condicoes_moradia, renda_familiar_total, fonte_renda, beneficios_sociais,
        gastos_principais, condicao_saude_geral, problemas_saude, uso_medicamentos,
        medicamentos_uso, acompanhamento_medico, nivel_escolaridade, desejo_capacitacao,
        areas_interesse, rede_apoio, participacao_comunitaria, violencias_enfrentadas,
        expectativas_programa, objetivos_pessoais, disponibilidade_participacao,
        observacoes, responsavel_preenchimento
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25
      ) RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      beneficiaria_id,
      composicao_familiar || null,
      situacao_habitacional || null,
      tipo_moradia || null,
      condicoes_moradia || null,
      renda_familiar_total || null,
      fonte_renda || null,
      beneficios_sociais || [],
      gastos_principais || null,
      condicao_saude_geral || null,
      problemas_saude || null,
      uso_medicamentos || false,
      medicamentos_uso || null,
      acompanhamento_medico || false,
      nivel_escolaridade || null,
      desejo_capacitacao || null,
      areas_interesse || [],
      rede_apoio || null,
      participacao_comunitaria || null,
      violencias_enfrentadas || null,
      expectativas_programa || null,
      objetivos_pessoais || null,
      disponibilidade_participacao || null,
      observacoes || null,
      req.user.email || 'Sistema'
    ]);

    console.log(`Anamnese social criada para beneficiária ${beneficiaria_id} por ${req.user.email}`);

    const anamneseFormatada = formatObjectDates(result.rows[0], ['data_criacao', 'data_atualizacao']);

    res.status(201).json(successResponse(anamneseFormatada, "Anamnese social salva com sucesso"));

  } catch (error) {
    console.error("Create anamnese error:", error);
    res.status(500).json(errorResponse("Erro ao salvar anamnese social"));
  }
});

// Obter anamnese social por beneficiária
router.get('/anamnese/:beneficiaria_id', authenticateToken, async (req, res) => {
  try {
    const { beneficiaria_id } = req.params;

    const result = await pool.query(
      `SELECT a.*, b.nome_completo as beneficiaria_nome
       FROM anamneses_social a
       JOIN beneficiarias b ON a.beneficiaria_id = b.id
       WHERE a.beneficiaria_id = $1 AND a.ativo = true
       ORDER BY a.data_criacao DESC
       LIMIT 1`,
      [beneficiaria_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Anamnese não encontrada"));
    }

    const anamneseFormatada = formatObjectDates(result.rows[0], ['data_criacao', 'data_atualizacao']);

    res.json(successResponse(anamneseFormatada, "Anamnese carregada com sucesso"));

  } catch (error) {
    console.error("Get anamnese error:", error);
    res.status(500).json(errorResponse("Erro ao buscar anamnese"));
  }
});

// Listar todas as anamneses
router.get('/anamnese', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT a.*, b.nome_completo as beneficiaria_nome
       FROM anamneses_social a
       JOIN beneficiarias b ON a.beneficiaria_id = b.id
       WHERE a.ativo = true
       ORDER BY a.data_criacao DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM anamneses_social WHERE ativo = true"
    );

    const total = parseInt(countResult.rows[0].count);
    const anamnesesFormatadas = formatArrayDates(result.rows, ['data_criacao', 'data_atualizacao']);

    res.json(successResponse(
      anamnesesFormatadas,
      "Anamneses carregadas com sucesso",
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
    console.error("List anamneses error:", error);
    res.status(500).json(errorResponse("Erro ao listar anamneses"));
  }
});

module.exports = router;
