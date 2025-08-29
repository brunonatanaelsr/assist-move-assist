import express from 'express';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import * as auth from '../middleware/auth';
const authenticateToken = auth.authenticateToken;
const requireGestor = auth.requireGestor || ((_req: any, _res: any, next: any) => next());
import { formatArrayDates } from '../utils/dateFormatter';
import { pool } from '../config/database';
import PDFDocument = require('pdfkit');
import ExcelJS = require('exceljs');
import { stringify } from 'csv-stringify/sync';

const router = express.Router();

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

// ========== TEMPLATES DE RELATÓRIO ==========

// GET /relatorios/templates - listar templates
router.get('/templates', authenticateToken, requireGestor, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM report_templates ORDER BY updated_at DESC');
    res.json(successResponse(result.rows));
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    res.status(500).json(errorResponse('Erro ao listar templates'));
  }
});

// POST /relatorios/templates - criar template
router.post('/templates', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { name, description, type = 'DASHBOARD', metrics = [], schedule = {} } = req.body || {};

    if (!name || typeof name !== 'string') {
      return res.status(400).json(errorResponse('Campo "name" é obrigatório'));
    }

    const result = await pool.query(
      `INSERT INTO report_templates (name, description, type, metrics, schedule)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       RETURNING *`,
      [name, description || null, type, JSON.stringify(metrics), JSON.stringify(schedule)]
    );

    res.status(201).json(successResponse(result.rows[0]));
  } catch (error) {
    console.error('Erro ao criar template:', error);
    res.status(500).json(errorResponse('Erro ao criar template'));
  }
});

// PUT /relatorios/templates/:id - atualizar template
router.put('/templates/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { name, description, type, metrics, schedule } = req.body || {};

    const result = await pool.query(
      `UPDATE report_templates 
       SET 
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         type = COALESCE($4, type),
         metrics = COALESCE($5::jsonb, metrics),
         schedule = COALESCE($6::jsonb, schedule),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name || null, description || null, type || null, metrics ? JSON.stringify(metrics) : null, schedule ? JSON.stringify(schedule) : null]
    );

    if (result.rowCount === 0) {
      return res.status(404).json(errorResponse('Template não encontrado'));
    }

    res.json(successResponse(result.rows[0]));
  } catch (error) {
    console.error('Erro ao atualizar template:', error);
    res.status(500).json(errorResponse('Erro ao atualizar template'));
  }
});

// DELETE /relatorios/templates/:id - remover template
router.delete('/templates/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const result = await pool.query('DELETE FROM report_templates WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json(errorResponse('Template não encontrado'));
    }
    res.json(successResponse({ message: 'Template removido' }));
  } catch (error) {
    console.error('Erro ao remover template:', error);
    res.status(500).json(errorResponse('Erro ao remover template'));
  }
});

// POST /relatorios/export/:id - exportar relatório a partir do template
router.post('/export/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { format = 'pdf' } = req.body || {};

    const tpl = await pool.query('SELECT * FROM report_templates WHERE id = $1', [id]);
    if (tpl.rowCount === 0) {
      return res.status(404).json(errorResponse('Template não encontrado'));
    }
    const template = tpl.rows[0];

    // Dados simples de exemplo: KPIs gerais
    const kpis = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM beneficiarias WHERE ativo = true) as total_beneficiarias,
        (SELECT COUNT(*) FROM oficinas WHERE ativo = true) as total_oficinas,
        (SELECT COUNT(*) FROM projetos WHERE ativo = true) as total_projetos
    `);
    const data = kpis.rows[0];

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Relatório');
      sheet.columns = [
        { header: 'Métrica', key: 'metric', width: 30 },
        { header: 'Valor', key: 'value', width: 20 },
      ];
      sheet.addRow({ metric: 'Template', value: template.name });
      sheet.addRow({ metric: 'Beneficiárias', value: data.total_beneficiarias });
      sheet.addRow({ metric: 'Oficinas', value: data.total_oficinas });
      sheet.addRow({ metric: 'Projetos', value: data.total_projetos });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio_${template.name}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (format === 'csv') {
      const records = [
        ['Template', template.name],
        ['Beneficiarias', data.total_beneficiarias],
        ['Oficinas', data.total_oficinas],
        ['Projetos', data.total_projetos],
      ];
      const csv = stringify(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio_${template.name}.csv"`);
      return res.send(csv);
    }

    // PDF (default)
    const doc = new (PDFDocument as any)({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio_${template.name}.pdf"`);
      res.send(pdfBuffer);
    });

    doc.fontSize(18).text(`Relatório: ${template.name}`, { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Descrição: ${template.description || 'N/A'}`);
    doc.text(`Tipo: ${template.type}`);
    doc.moveDown();
    doc.text('KPIs Gerais:');
    doc.text(`- Beneficiárias: ${data.total_beneficiarias}`);
    doc.text(`- Oficinas: ${data.total_oficinas}`);
    doc.text(`- Projetos: ${data.total_projetos}`);
    doc.end();
  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    res.status(500).json(errorResponse('Erro ao exportar relatório'));
  }
});
