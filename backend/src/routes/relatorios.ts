import express from 'express';
import { Pool } from 'pg';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import * as auth from '../middleware/auth';
const authenticateToken = auth.authenticateToken;
const requireGestor = auth.requireGestor || ((_req: any, _res: any, next: any) => next());
import { formatArrayDates } from '../utils/dateFormatter';

const router = express.Router();

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '15002031',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Relatório geral de beneficiárias
router.get('/beneficiarias', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    let whereClause = 'WHERE b.ativo = true';
    const params: any[] = [];

    if (data_inicio && data_fim) {
      whereClause += ' AND b.data_criacao BETWEEN $1 AND $2';
      params.push(data_inicio, data_fim);
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_beneficiarias,
        COUNT(CASE WHEN b.status = 'ativa' THEN 1 END) as ativas,
        COUNT(CASE WHEN b.status = 'inativa' THEN 1 END) as inativas,
        COUNT(CASE WHEN b.status = 'pendente' THEN 1 END) as pendentes,
        AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, b.data_nascimento)))::INTEGER as media_idade,
        MODE() WITHIN GROUP (ORDER BY b.escolaridade) as escolaridade_predominante,
        COUNT(DISTINCT b.cidade) as total_cidades,
        JSON_AGG(DISTINCT b.cidade) as cidades
      FROM beneficiarias b
      ${whereClause}
    `, params);

    res.json(successResponse(result.rows[0], "Relatório de beneficiárias gerado com sucesso"));
  } catch (error) {
    console.error('Erro ao gerar relatório de beneficiárias:', error);
    res.status(500).json(errorResponse('Erro ao gerar relatório'));
  }
});

// Relatório de oficinas
router.get('/oficinas', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    let whereClause = 'WHERE o.ativo = true';
    const params: any[] = [];

    if (data_inicio && data_fim) {
      whereClause += ' AND o.data_inicio BETWEEN $1 AND $2';
      params.push(data_inicio, data_fim);
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_oficinas,
        COUNT(CASE WHEN o.status = 'concluida' THEN 1 END) as concluidas,
        COUNT(CASE WHEN o.status = 'em_andamento' THEN 1 END) as em_andamento,
        COUNT(CASE WHEN o.status = 'planejada' THEN 1 END) as planejadas,
        COUNT(CASE WHEN o.status = 'cancelada' THEN 1 END) as canceladas,
        AVG(o.vagas_totais) as media_vagas,
        SUM(o.vagas_preenchidas) as total_participantes,
        ROUND(AVG(o.vagas_preenchidas::float / o.vagas_totais * 100), 2) as taxa_ocupacao
      FROM oficinas o
      ${whereClause}
    `, params);

    // Buscar oficinas mais populares
    const oficinasPopulares = await pool.query(`
      SELECT 
        o.nome,
        o.categoria,
        COUNT(p.id) as total_participantes
      FROM oficinas o
      LEFT JOIN participacoes p ON o.id = p.oficina_id AND p.ativo = true
      WHERE o.ativo = true
      GROUP BY o.id
      ORDER BY total_participantes DESC
      LIMIT 5
    `);

    const response = {
      ...result.rows[0],
      oficinas_populares: oficinasPopulares.rows
    };

    res.json(successResponse(response, "Relatório de oficinas gerado com sucesso"));
  } catch (error) {
    console.error('Erro ao gerar relatório de oficinas:', error);
    res.status(500).json(errorResponse('Erro ao gerar relatório'));
  }
});

// Relatório de projetos
router.get('/projetos', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    let whereClause = 'WHERE p.ativo = true';
    const params: any[] = [];

    if (data_inicio && data_fim) {
      whereClause += ' AND p.data_inicio BETWEEN $1 AND $2';
      params.push(data_inicio, data_fim);
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_projetos,
        COUNT(CASE WHEN p.status = 'concluido' THEN 1 END) as concluidos,
        COUNT(CASE WHEN p.status = 'em_andamento' THEN 1 END) as em_andamento,
        COUNT(CASE WHEN p.status = 'planejamento' THEN 1 END) as em_planejamento,
        SUM(p.orcamento) as orcamento_total,
        AVG(p.orcamento) as orcamento_medio,
        COUNT(DISTINCT o.id) as total_oficinas_vinculadas,
        COUNT(DISTINCT b.id) as total_beneficiarias_impactadas
      FROM projetos p
      LEFT JOIN oficinas o ON p.id = o.projeto_id AND o.ativo = true
      LEFT JOIN participacoes pa ON o.id = pa.oficina_id AND pa.ativo = true
      LEFT JOIN beneficiarias b ON pa.beneficiaria_id = b.id AND b.ativo = true
      ${whereClause}
      GROUP BY p.id
    `, params);

    res.json(successResponse(result.rows[0], "Relatório de projetos gerado com sucesso"));
  } catch (error) {
    console.error('Erro ao gerar relatório de projetos:', error);
    res.status(500).json(errorResponse('Erro ao gerar relatório'));
  }
});

// Relatório de participação
router.get('/participacao', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    let whereClause = 'WHERE p.ativo = true';
    const params: any[] = [];

    if (data_inicio && data_fim) {
      whereClause += ' AND p.data_criacao BETWEEN $1 AND $2';
      params.push(data_inicio, data_fim);
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_participacoes,
        COUNT(DISTINCT p.beneficiaria_id) as total_beneficiarias_unicas,
        COUNT(DISTINCT p.oficina_id) as total_oficinas_com_participantes,
        ROUND(AVG(p.frequencia), 2) as media_frequencia,
        COUNT(CASE WHEN p.status = 'concluida' THEN 1 END) as participacoes_concluidas,
        COUNT(CASE WHEN p.status = 'em_andamento' THEN 1 END) as participacoes_em_andamento,
        COUNT(CASE WHEN p.status = 'desistente' THEN 1 END) as participacoes_desistentes
      FROM participacoes p
      ${whereClause}
    `, params);

    // Calcular taxa de retenção
    const retencao = {
      taxa_retencao: (result.rows[0].participacoes_concluidas / 
        (result.rows[0].participacoes_concluidas + result.rows[0].participacoes_desistentes) * 100).toFixed(2)
    };

    res.json(successResponse(
      { ...result.rows[0], ...retencao },
      "Relatório de participação gerado com sucesso"
    ));
  } catch (error) {
    console.error('Erro ao gerar relatório de participação:', error);
    res.status(500).json(errorResponse('Erro ao gerar relatório'));
  }
});

// Relatório consolidado
router.get('/consolidado', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { periodo = 'mensal' } = req.query;
    
    let intervalQuery;
    if (periodo === 'semanal') {
      intervalQuery = "date_trunc('week', data_criacao)";
    } else if (periodo === 'mensal') {
      intervalQuery = "date_trunc('month', data_criacao)";
    } else {
      intervalQuery = "date_trunc('year', data_criacao)";
    }

    // Beneficiárias por período
    const beneficiariasResult = await pool.query(`
      SELECT 
        ${intervalQuery} as periodo,
        COUNT(*) as novas_beneficiarias
      FROM beneficiarias
      WHERE ativo = true
      GROUP BY periodo
      ORDER BY periodo DESC
      LIMIT 12
    `);

    // Oficinas por período
    const oficinasResult = await pool.query(`
      SELECT 
        ${intervalQuery} as periodo,
        COUNT(*) as novas_oficinas,
        SUM(vagas_preenchidas) as participantes
      FROM oficinas
      WHERE ativo = true
      GROUP BY periodo
      ORDER BY periodo DESC
      LIMIT 12
    `);

    // KPIs gerais
    const kpisResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM beneficiarias WHERE ativo = true) as total_beneficiarias,
        (SELECT COUNT(*) FROM oficinas WHERE ativo = true) as total_oficinas,
        (SELECT COUNT(*) FROM projetos WHERE ativo = true) as total_projetos,
        (SELECT SUM(vagas_preenchidas) FROM oficinas WHERE ativo = true) as total_participacoes
    `);

    const response = {
      kpis: kpisResult.rows[0],
      beneficiarias_por_periodo: formatArrayDates(beneficiariasResult.rows, ['periodo']),
      oficinas_por_periodo: formatArrayDates(oficinasResult.rows, ['periodo'])
    };

    res.json(successResponse(response, "Relatório consolidado gerado com sucesso"));
  } catch (error) {
    console.error('Erro ao gerar relatório consolidado:', error);
    res.status(500).json(errorResponse('Erro ao gerar relatório'));
  }
});

export default router;
