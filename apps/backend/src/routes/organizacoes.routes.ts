import { Router } from 'express';
import { pool } from '../config/database';
import { authenticateToken, authorize, AuthenticatedRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { validateRequest } from '../middleware/validationMiddleware';
import {
  createOrganizacaoRequestSchema,
  deleteOrganizacaoRequestSchema,
  getOrganizacaoRequestSchema,
  organizacaoPayloadSchema,
  updateOrganizacaoRequestSchema
} from '../validation/schemas/organizacoes.schema';

const router = Router();

// GET /organizacoes
router.get('/', authenticateToken, authorize('organizacoes.ler'), async (_req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at
       FROM organizacoes
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
    );
    res.json(successResponse(result.rows));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar organizações'));
  }
});

// GET /organizacoes/:id
router.get(
  '/:id',
  authenticateToken,
  authorize('organizacoes.ler'),
  validateRequest(getOrganizacaoRequestSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params as any;
      const result = await pool.query(
        `SELECT id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at
         FROM organizacoes
         WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );
      if (result.rowCount === 0) { res.status(404).json(errorResponse('Organização não encontrada')); return; }
      res.json(successResponse(result.rows[0]));
    } catch (error) {
      res.status(500).json(errorResponse('Erro ao obter organização'));
    }
  }
);

// POST /organizacoes
router.post(
  '/',
  authenticateToken,
  authorize('organizacoes.criar'),
  validateRequest(createOrganizacaoRequestSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { nome, cnpj, email, telefone, endereco, ativo } = organizacaoPayloadSchema.parse(req.body);
      const result = await pool.query(
        `INSERT INTO organizacoes (nome, cnpj, email, telefone, endereco, ativo)
         VALUES ($1,$2,$3,$4,$5,COALESCE($6,true))
         RETURNING id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at`,
        [nome, cnpj || null, email || null, telefone || null, endereco || null, ativo]
      );
      res.status(201).json(successResponse(result.rows[0]));
    } catch (error) {
      res.status(500).json(errorResponse('Erro ao criar organização'));
    }
  }
);

// PUT /organizacoes/:id
router.put(
  '/:id',
  authenticateToken,
  authorize('organizacoes.editar'),
  validateRequest(updateOrganizacaoRequestSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params as any;
      const fields = organizacaoPayloadSchema.partial().parse(req.body ?? {});
      const result = await pool.query(
        `UPDATE organizacoes SET
           nome = COALESCE($2, nome),
           cnpj = COALESCE($3, cnpj),
           email = COALESCE($4, email),
           telefone = COALESCE($5, telefone),
           endereco = COALESCE($6, endereco),
           ativo = COALESCE($7, ativo),
           updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id, nome, cnpj, email, telefone, endereco, ativo, created_at, updated_at`,
        [id, fields.nome ?? null, fields.cnpj ?? null, fields.email ?? null, fields.telefone ?? null, fields.endereco ?? null, fields.ativo]
      );
      if (result.rowCount === 0) { res.status(404).json(errorResponse('Organização não encontrada')); return; }
      res.json(successResponse(result.rows[0]));
    } catch (error) {
      res.status(500).json(errorResponse('Erro ao atualizar organização'));
    }
  }
);

// DELETE /organizacoes/:id (soft delete)
router.delete(
  '/:id',
  authenticateToken,
  authorize('organizacoes.excluir'),
  validateRequest(deleteOrganizacaoRequestSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params as any;
      const result = await pool.query(
        `UPDATE organizacoes SET deleted_at = NOW(), ativo = false WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );
      if (result.rowCount === 0) { res.status(404).json(errorResponse('Organização não encontrada')); return; }
      res.status(204).end();
    } catch (error) {
      res.status(500).json(errorResponse('Erro ao excluir organização'));
    }
  }
);

export default router;

