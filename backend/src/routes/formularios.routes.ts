import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';

const router = Router();

// ANAMNESE SOCIAL
router.post('/anamnese', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { beneficiaria_id, dados } = req.body || {};
    const createdBy = Number(req.user!.id);
    const result = await pool.query(
      `INSERT INTO anamnese_social (beneficiaria_id, dados, created_by)
       VALUES ($1,$2::jsonb,$3) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), createdBy]
    );
    res.status(201).json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar anamnese'));
  }
});

router.get('/anamnese/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM anamnese_social WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json(errorResponse('Anamnese não encontrada'));
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter anamnese'));
  }
});

router.put('/anamnese/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as any;
    const { dados } = req.body || {};
    const result = await pool.query('UPDATE anamnese_social SET dados = COALESCE($2::jsonb, dados) WHERE id = $1 RETURNING *', [id, JSON.stringify(dados || null)]);
    if (result.rowCount === 0) return res.status(404).json(errorResponse('Anamnese não encontrada'));
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar anamnese'));
  }
});

// FICHA DE EVOLUÇÃO
router.post('/ficha-evolucao', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { beneficiaria_id, dados } = req.body || {};
    const createdBy = Number(req.user!.id);
    const result = await pool.query(
      `INSERT INTO ficha_evolucao (beneficiaria_id, dados, created_by)
       VALUES ($1,$2::jsonb,$3) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), createdBy]
    );
    res.status(201).json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar ficha de evolução'));
  }
});

router.get('/ficha-evolucao/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM ficha_evolucao WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json(errorResponse('Ficha não encontrada'));
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter ficha'));
  }
});

router.get('/ficha-evolucao/beneficiaria/:beneficiariaId', authenticateToken, async (req, res) => {
  try {
    const { beneficiariaId } = req.params as any;
    const result = await pool.query('SELECT * FROM ficha_evolucao WHERE beneficiaria_id = $1 ORDER BY created_at DESC', [beneficiariaId]);
    res.json(successResponse(result.rows));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar fichas'));
  }
});

router.put('/ficha-evolucao/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as any;
    const { dados } = req.body || {};
    const result = await pool.query('UPDATE ficha_evolucao SET dados = COALESCE($2::jsonb, dados) WHERE id = $1 RETURNING *', [id, JSON.stringify(dados || null)]);
    if (result.rowCount === 0) return res.status(404).json(errorResponse('Ficha não encontrada'));
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar ficha'));
  }
});

// TERMOS DE CONSENTIMENTO
router.post('/termos-consentimento', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { beneficiaria_id, dados } = req.body || {};
    const createdBy = Number(req.user!.id);
    const result = await pool.query(
      `INSERT INTO termos_consentimento (beneficiaria_id, dados, created_by)
       VALUES ($1,$2::jsonb,$3) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), createdBy]
    );
    res.status(201).json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar termo'));
  }
});

router.get('/termos-consentimento/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM termos_consentimento WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json(errorResponse('Termo não encontrado'));
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter termo'));
  }
});

router.put('/termos-consentimento/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as any;
    const { dados } = req.body || {};
    const result = await pool.query('UPDATE termos_consentimento SET dados = COALESCE($2::jsonb, dados) WHERE id = $1 RETURNING *', [id, JSON.stringify(dados || null)]);
    if (result.rowCount === 0) return res.status(404).json(errorResponse('Termo não encontrado'));
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar termo'));
  }
});

// VISÃO HOLÍSTICA
router.post('/visao-holistica', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { beneficiaria_id, ...dados } = (req.body || {}) as any;
    if (!beneficiaria_id) {
      return res.status(400).json(errorResponse('beneficiaria_id é obrigatório'));
    }

    const createdBy = Number(req.user!.id);
    const result = await pool.query(
      `INSERT INTO visao_holistica (beneficiaria_id, dados, created_by)
       VALUES ($1, $2::jsonb, $3) RETURNING *`,
      [beneficiaria_id, JSON.stringify(dados || {}), createdBy]
    );
    res.status(201).json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar visão holística'));
  }
});

router.get('/visao-holistica/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM visao_holistica WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json(errorResponse('Registro não encontrado'));
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter visão holística'));
  }
});

router.get('/visao-holistica/beneficiaria/:beneficiariaId', authenticateToken, async (req, res) => {
  try {
    const { beneficiariaId } = req.params as any;
    const result = await pool.query(
      'SELECT * FROM visao_holistica WHERE beneficiaria_id = $1 ORDER BY created_at DESC',
      [beneficiariaId]
    );
    res.json(successResponse(result.rows));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar visões holísticas'));
  }
});

router.put('/visao-holistica/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as any;
    const { dados } = (req.body || {}) as any;
    // Permitir atualizar passando o objeto completo (sem beneficiaria_id)
    const payload = dados ?? req.body;

    const result = await pool.query(
      'UPDATE visao_holistica SET dados = COALESCE($2::jsonb, dados) WHERE id = $1 RETURNING *',
      [id, JSON.stringify(payload || null)]
    );
    if (result.rowCount === 0) return res.status(404).json(errorResponse('Registro não encontrado'));
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar visão holística'));
  }
});

export default router;
