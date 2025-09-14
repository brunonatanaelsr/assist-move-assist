import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { renderFormPdf, renderAnamnesePdf, renderFichaEvolucaoPdf, renderTermosPdf, renderVisaoHolisticaPdf } from '../services/formsExport.service';

const router = Router();

// ANAMNESE SOCIAL
router.post('/anamnese', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiaria_id, dados } = req.body || {};
    const createdBy = Number(req.user!.id);
    const result = await pool.query(
      `INSERT INTO anamnese_social (beneficiaria_id, dados, created_by)
       VALUES ($1,$2::jsonb,$3) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), createdBy]
    );
    res.status(201).json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar anamnese'));
    return;
  }
});

router.get('/anamnese/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM anamnese_social WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Anamnese não encontrada')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter anamnese'));
    return;
  }
});
router.get('/anamnese/:id/pdf', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT id, beneficiaria_id, dados, created_at FROM anamnese_social WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Anamnese não encontrada')); return; }
    const pdf = await renderAnamnesePdf(result.rows[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="anamnese_${id}.pdf"`);
    res.send(pdf);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao exportar anamnese'));
    return;
  }
});

router.put('/anamnese/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const { dados } = req.body || {};
    const result = await pool.query('UPDATE anamnese_social SET dados = COALESCE($2::jsonb, dados) WHERE id = $1 RETURNING *', [id, JSON.stringify(dados || null)]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Anamnese não encontrada')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar anamnese'));
    return;
  }
});

// FICHA DE EVOLUÇÃO
router.post('/ficha-evolucao', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiaria_id, dados } = req.body || {};
    const createdBy = Number(req.user!.id);
    const result = await pool.query(
      `INSERT INTO ficha_evolucao (beneficiaria_id, dados, created_by)
       VALUES ($1,$2::jsonb,$3) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), createdBy]
    );
    res.status(201).json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar ficha de evolução'));
    return;
  }
});

router.get('/ficha-evolucao/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM ficha_evolucao WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Ficha não encontrada')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter ficha'));
    return;
  }
});
router.get('/ficha-evolucao/:id/pdf', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT id, beneficiaria_id, dados, created_at FROM ficha_evolucao WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Ficha não encontrada')); return; }
    const pdf = await renderFichaEvolucaoPdf(result.rows[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ficha_evolucao_${id}.pdf"`);
    res.send(pdf);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao exportar ficha'));
    return;
  }
});

router.get('/ficha-evolucao/beneficiaria/:beneficiariaId', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { beneficiariaId } = req.params as any;
    const result = await pool.query('SELECT * FROM ficha_evolucao WHERE beneficiaria_id = $1 ORDER BY created_at DESC', [beneficiariaId]);
    res.json(successResponse(result.rows));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar fichas'));
    return;
  }
});

router.put('/ficha-evolucao/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const { dados } = req.body || {};
    const result = await pool.query('UPDATE ficha_evolucao SET dados = COALESCE($2::jsonb, dados) WHERE id = $1 RETURNING *', [id, JSON.stringify(dados || null)]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Ficha não encontrada')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar ficha'));
    return;
  }
});

// TERMOS DE CONSENTIMENTO
router.post('/termos-consentimento', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiaria_id, dados } = req.body || {};
    const createdBy = Number(req.user!.id);
    const result = await pool.query(
      `INSERT INTO termos_consentimento (beneficiaria_id, dados, created_by)
       VALUES ($1,$2::jsonb,$3) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), createdBy]
    );
    res.status(201).json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar termo'));
    return;
  }
});

router.get('/termos-consentimento/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM termos_consentimento WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Termo não encontrado')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter termo'));
    return;
  }
});
router.get('/termos-consentimento/:id/pdf', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT id, beneficiaria_id, dados, created_at FROM termos_consentimento WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Termo não encontrado')); return; }
    const pdf = await renderTermosPdf(result.rows[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="termo_${id}.pdf"`);
    res.send(pdf);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao exportar termo'));
    return;
  }
});

router.put('/termos-consentimento/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const { dados } = req.body || {};
    const result = await pool.query('UPDATE termos_consentimento SET dados = COALESCE($2::jsonb, dados) WHERE id = $1 RETURNING *', [id, JSON.stringify(dados || null)]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Termo não encontrado')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar termo'));
    return;
  }
});

// VISÃO HOLÍSTICA
router.post('/visao-holistica', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiaria_id, ...dados } = (req.body || {}) as any;
    if (!beneficiaria_id) {
      res.status(400).json(errorResponse('beneficiaria_id é obrigatório'));
      return;
    }

    const createdBy = Number(req.user!.id);
    const result = await pool.query(
      `INSERT INTO visao_holistica (beneficiaria_id, dados, created_by)
       VALUES ($1, $2::jsonb, $3) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), createdBy]
    );
    res.status(201).json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar visão holística'));
    return;
  }
});

// RODA DA VIDA (genérico via tabela formularios)
router.post('/roda-vida', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiaria_id, dados } = req.body || {};
    const createdBy = Number(req.user!.id);
    const result = await pool.query(
      `INSERT INTO formularios (tipo, beneficiaria_id, dados, status, usuario_id)
       VALUES ('roda_vida', $1, $2::jsonb, 'completo', $3) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), createdBy]
    );
    res.status(201).json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar Roda da Vida'));
    return;
  }
});

router.get('/roda-vida/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM formularios WHERE id = $1 AND tipo = $2', [id, 'roda_vida']);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Roda da Vida não encontrada')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter Roda da Vida'));
    return;
  }
});

router.put('/roda-vida/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const { dados } = req.body || {};
    const result = await pool.query(
      'UPDATE formularios SET dados = COALESCE($2::jsonb, dados), updated_at = NOW() WHERE id = $1 AND tipo = $3 RETURNING *',
      [id, JSON.stringify(dados || null), 'roda_vida']
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Roda da Vida não encontrada')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar Roda da Vida'));
    return;
  }
});

router.get('/visao-holistica/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM visao_holistica WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Registro não encontrado')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter visão holística'));
    return;
  }
});
router.get('/visao-holistica/:id/pdf', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT id, beneficiaria_id, dados, created_at FROM visao_holistica WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Registro não encontrado')); return; }
    const pdf = await renderVisaoHolisticaPdf(result.rows[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="visao_holistica_${id}.pdf"`);
    res.send(pdf);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao exportar visão holística'));
    return;
  }
});

// Série temporal da Ficha de Evolução por beneficiária
router.get('/ficha-evolucao/beneficiaria/:beneficiariaId/series', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiariaId } = req.params as any;
    const result = await pool.query(
      `SELECT to_char(created_at, 'YYYY-MM') as mes, COUNT(*)::int as total
       FROM ficha_evolucao WHERE beneficiaria_id = $1
       GROUP BY 1 ORDER BY 1`,
      [beneficiariaId]
    );
    res.json(successResponse({ data: result.rows }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter série de evolução'));
    return;
  }
});

router.get('/visao-holistica/beneficiaria/:beneficiariaId', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { beneficiariaId } = req.params as any;
    const result = await pool.query(
      'SELECT * FROM visao_holistica WHERE beneficiaria_id = $1 ORDER BY created_at DESC',
      [beneficiariaId]
    );
    res.json(successResponse(result.rows));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar visões holísticas'));
    return;
  }
});

router.put('/visao-holistica/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const { dados } = (req.body || {}) as any;
    // Permitir atualizar passando o objeto completo (sem beneficiaria_id)
    const payload = dados ?? req.body;

    const result = await pool.query(
      'UPDATE visao_holistica SET dados = COALESCE($2::jsonb, dados) WHERE id = $1 RETURNING *',
      [id, JSON.stringify(payload || null)]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Registro não encontrado')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar visão holística'));
    return;
  }
});

export default router;

// ========= GENÉRICOS =========
// Listar formularios (genéricos) com filtros e paginação
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const page = parseInt((req.query.page as string) || '1', 10);
    const tipo = (req.query.tipo as string) || undefined;
    const beneficiaria_id = (req.query.beneficiaria_id as string) || undefined;

    const where: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (tipo) { where.push(`tipo = $${idx++}`); params.push(tipo); }
    if (beneficiaria_id) { where.push(`beneficiaria_id = $${idx++}`); params.push(parseInt(beneficiaria_id)); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    const sql = `SELECT *, COUNT(*) OVER() as total_count FROM formularios ${whereSql} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(limit, offset);
    const result = await pool.query(sql, params);
    const total = parseInt(result.rows[0]?.total_count || '0', 10);
    res.json(successResponse({ data: result.rows, pagination: { page, limit, total } }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar formulários'));
    return;
  }
});

// Agregador: listar todos os formulários (dedicados + genéricos) de uma beneficiária
router.get('/beneficiaria/:beneficiariaId', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { beneficiariaId } = req.params as any;
    const [gen, ana, evo, ter, vis] = await Promise.all([
      pool.query('SELECT id, tipo, beneficiaria_id, dados, status, created_at, usuario_id as created_by FROM formularios WHERE beneficiaria_id = $1', [beneficiariaId]),
      pool.query(`SELECT id, 'anamnese' as tipo, beneficiaria_id, dados, created_at, created_by FROM anamnese_social WHERE beneficiaria_id = $1`, [beneficiariaId]),
      pool.query(`SELECT id, 'ficha_evolucao' as tipo, beneficiaria_id, dados, created_at, created_by FROM ficha_evolucao WHERE beneficiaria_id = $1`, [beneficiariaId]),
      pool.query(`SELECT id, 'termos_consentimento' as tipo, beneficiaria_id, dados, created_at, created_by FROM termos_consentimento WHERE beneficiaria_id = $1`, [beneficiariaId]),
      pool.query(`SELECT id, 'visao_holistica' as tipo, beneficiaria_id, dados, created_at, created_by FROM visao_holistica WHERE beneficiaria_id = $1`, [beneficiariaId])
    ]);
    const data = [...gen.rows, ...ana.rows, ...evo.rows, ...ter.rows, ...vis.rows].sort((a, b) => (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    res.json(successResponse({ data, total: data.length }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar formulários da beneficiária'));
    return;
  }
});

// Criar formulário genérico por tipo
router.post('/:tipo', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { tipo } = req.params as any;
    const { beneficiaria_id, dados, status, observacoes } = (req.body || {}) as any;
    const userId = Number(req.user!.id);
    if (!beneficiaria_id) { res.status(400).json(errorResponse('beneficiaria_id é obrigatório')); return; }
    const created = await pool.query(
      `INSERT INTO formularios (tipo, beneficiaria_id, dados, status, observacoes, usuario_id)
       VALUES ($1,$2,$3::jsonb,COALESCE($4,'completo'),$5,$6) RETURNING *`,
      [tipo, beneficiaria_id, JSON.stringify(dados || {}), status, observacoes || null, userId]
    );
    res.status(201).json(successResponse(created.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar formulário'));
    return;
  }
});

// Obter/Atualizar genérico e Exportar PDF
router.get('/:tipo/:id', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { tipo, id } = req.params as any;
    const result = await pool.query('SELECT * FROM formularios WHERE id = $1 AND tipo = $2', [id, tipo]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Formulário não encontrado')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter formulário'));
    return;
  }
});

router.put('/:tipo/:id', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { tipo, id } = req.params as any;
    const { dados, status, observacoes } = (req.body || {}) as any;
    const result = await pool.query(
      'UPDATE formularios SET dados = COALESCE($2::jsonb, dados), status = COALESCE($3, status), observacoes = COALESCE($4, observacoes), updated_at = NOW() WHERE id = $1 AND tipo = $5 RETURNING *',
      [id, JSON.stringify(dados || null), status || null, observacoes || null, tipo]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Formulário não encontrado')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar formulário'));
    return;
  }
});

router.get('/:tipo/:id/pdf', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { tipo, id } = req.params as any;
    const result = await pool.query('SELECT * FROM formularios WHERE id = $1 AND tipo = $2', [id, tipo]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Formulário não encontrado')); return; }
    const pdf = await renderFormPdf(result.rows[0], { titulo: 'Formulário', subtitulo: `Tipo: ${tipo}` });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="form_${tipo}_${id}.pdf"`);
    res.send(pdf);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao exportar PDF'));
    return;
  }
});

// Excluir formulário genérico por ID
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('DELETE FROM formularios WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Formulário não encontrado')); return; }
    res.json(successResponse({ id }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao excluir formulário'));
    return;
  }
});
