const express = require('express');
const { Pool } = require('pg');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { formatArrayDates, formatObjectDates } = require('../utils/dateFormatter');
const { authenticateToken } = require('../middleware/auth');
const { registrarEvento } = require('../utils/auditoria');

const router = express.Router();

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias_user',
  password: process.env.POSTGRES_PASSWORD || 'movemarias_password_2025',
});

// Adicionar beneficiária à lista de espera
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { oficina_id, observacoes } = req.body;

    if (!oficina_id) {
      return res.status(400).json(errorResponse("Campo obrigatório: oficina_id"));
    }

    // Verificar se a oficina existe e aceita lista de espera
    const oficinaCheck = await pool.query(
      `SELECT id, vagas_total, vagas_ocupadas, tem_lista_espera, lista_espera_limite 
       FROM oficinas WHERE id = $1 AND ativo = true`,
      [oficina_id]
    );

    if (oficinaCheck.rows.length === 0) {
      return res.status(400).json(errorResponse("Oficina não encontrada"));
    }

    const oficina = oficinaCheck.rows[0];

    if (!oficina.tem_lista_espera) {
      return res.status(400).json(errorResponse("Esta oficina não aceita lista de espera"));
    }

    // Verificar se já está inscrita na oficina
    const inscricaoCheck = await pool.query(
      "SELECT id FROM participacoes WHERE oficina_id = $1 AND beneficiaria_id = $2 AND ativo = true",
      [oficina_id, req.user.id]
    );

    if (inscricaoCheck.rows.length > 0) {
      return res.status(400).json(errorResponse("Você já está inscrita nesta oficina"));
    }

    // Verificar se já está na lista de espera
    const listaEsperaCheck = await pool.query(
      "SELECT id FROM lista_espera_oficinas WHERE oficina_id = $1 AND beneficiaria_id = $2 AND ativo = true",
      [oficina_id, req.user.id]
    );

    if (listaEsperaCheck.rows.length > 0) {
      return res.status(400).json(errorResponse("Você já está na lista de espera desta oficina"));
    }

    // Verificar limite da lista de espera
    const countListaEspera = await pool.query(
      "SELECT COUNT(*) FROM lista_espera_oficinas WHERE oficina_id = $1 AND ativo = true",
      [oficina_id]
    );

    if (parseInt(countListaEspera.rows[0].count) >= oficina.lista_espera_limite) {
      return res.status(400).json(errorResponse("Lista de espera já está cheia"));
    }

    // Adicionar à lista de espera
    const result = await pool.query(
      `INSERT INTO lista_espera_oficinas (
        oficina_id, beneficiaria_id, posicao, observacoes,
        meta_dados
      ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        oficina_id,
        req.user.id,
        parseInt(countListaEspera.rows[0].count) + 1,
        observacoes,
        {
          ip: req.ip,
          user_agent: req.headers['user-agent'],
          data_inscricao: new Date().toISOString()
        }
      ]
    );

    // Registrar na auditoria
    await registrarEvento(
      'LISTA_ESPERA',
      `Adicionada à lista de espera - Oficina ID: ${oficina_id}`,
      req.user.id,
      'lista_espera_oficinas',
      {
        oficina_id,
        posicao: result.rows[0].posicao
      },
      req.ip
    );

    res.json(successResponse(result.rows[0], "Adicionada à lista de espera com sucesso"));

  } catch (error) {
    console.error("Add lista espera error:", error);
    res.status(500).json(errorResponse("Erro ao adicionar à lista de espera"));
  }
});

// Listar beneficiárias na lista de espera
router.get('/oficina/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT l.*, b.nome_completo as beneficiaria_nome
       FROM lista_espera_oficinas l
       JOIN beneficiarias b ON l.beneficiaria_id = b.id
       WHERE l.oficina_id = $1 AND l.ativo = true
       ORDER BY l.posicao`,
      [id]
    );

    const listaEsperaFormatada = formatArrayDates(result.rows, ['data_inscricao', 'data_criacao', 'data_atualizacao']);

    res.json(successResponse(listaEsperaFormatada, "Lista de espera carregada com sucesso"));

  } catch (error) {
    console.error("Get lista espera error:", error);
    res.status(500).json(errorResponse("Erro ao buscar lista de espera"));
  }
});

// Remover da lista de espera
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const result = await pool.query(
      `UPDATE lista_espera_oficinas 
       SET ativo = false,
           status = 'desistencia',
           meta_dados = meta_dados || $1::jsonb
       WHERE id = $2 AND beneficiaria_id = $3 AND ativo = true
       RETURNING *`,
      [{
        motivo_saida: motivo || "Desistência voluntária",
        data_saida: new Date().toISOString()
      }, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Registro não encontrado ou você não tem permissão"));
    }

    // Reordenar posições
    await pool.query(
      `UPDATE lista_espera_oficinas 
       SET posicao = posicao - 1 
       WHERE oficina_id = $1 
       AND posicao > $2 
       AND ativo = true`,
      [result.rows[0].oficina_id, result.rows[0].posicao]
    );

    // Registrar na auditoria
    await registrarEvento(
      'LISTA_ESPERA',
      `Removida da lista de espera - ID: ${id}`,
      req.user.id,
      'lista_espera_oficinas',
      {
        lista_espera_id: id,
        motivo
      },
      req.ip
    );

    res.json(successResponse(null, "Removida da lista de espera com sucesso"));

  } catch (error) {
    console.error("Remove lista espera error:", error);
    res.status(500).json(errorResponse("Erro ao remover da lista de espera"));
  }
});

// Chamar próxima da lista de espera
router.post('/chamar-proxima/:oficina_id', authenticateToken, async (req, res) => {
  try {
    const { oficina_id } = req.params;

    // Buscar próxima pessoa na lista
    const proximaResult = await pool.query(
      `SELECT l.*, b.nome_completo, b.email
       FROM lista_espera_oficinas l
       JOIN beneficiarias b ON l.beneficiaria_id = b.id
       WHERE l.oficina_id = $1 AND l.ativo = true AND l.status = 'aguardando'
       ORDER BY l.posicao
       LIMIT 1`,
      [oficina_id]
    );

    if (proximaResult.rows.length === 0) {
      return res.status(404).json(errorResponse("Não há mais pessoas na lista de espera"));
    }

    const proxima = proximaResult.rows[0];

    // Atualizar status
    await pool.query(
      `UPDATE lista_espera_oficinas 
       SET status = 'chamada',
           meta_dados = meta_dados || $1::jsonb
       WHERE id = $2`,
      [{
        data_chamada: new Date().toISOString(),
        chamada_por: req.user.email
      }, proxima.id]
    );

    // Registrar na auditoria
    await registrarEvento(
      'LISTA_ESPERA',
      `Chamada da lista de espera - Beneficiária: ${proxima.nome_completo}`,
      req.user.id,
      'lista_espera_oficinas',
      {
        lista_espera_id: proxima.id,
        beneficiaria_id: proxima.beneficiaria_id
      },
      req.ip
    );

    res.json(successResponse({
      beneficiaria: {
        id: proxima.beneficiaria_id,
        nome: proxima.nome_completo,
        email: proxima.email
      }
    }, "Próxima pessoa da lista de espera chamada com sucesso"));

  } catch (error) {
    console.error("Chamar proxima error:", error);
    res.status(500).json(errorResponse("Erro ao chamar próxima pessoa da lista de espera"));
  }
});

module.exports = router;
