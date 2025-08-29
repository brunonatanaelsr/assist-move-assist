import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';

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
