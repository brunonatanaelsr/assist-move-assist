const express = require('express');
const router = express.Router();
const { authenticateToken, requireProfissional } = require('../middleware/auth');
const beneficiariaService = require('../services/beneficiaria.service');
const { AppError } = require('../middleware/errorHandler');

// Middleware para verificar ID válido
const validateId = (req, res, next) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    throw new AppError('ID inválido', 400);
  }
  next();
};

// GET /beneficiarias - Listar beneficiárias
router.get('/', authenticateToken, async (req, res) => {
  const { search, status, page, limit } = req.query;
  const result = await beneficiariaService.listar({ search, status, page, limit });
  res.json(result);
});

// GET /beneficiarias/:id - Buscar beneficiária por ID
router.get('/:id', authenticateToken, validateId, async (req, res) => {
  const beneficiaria = await beneficiariaService.buscarPorId(req.params.id);
  res.json({ beneficiaria });
});

// POST /beneficiarias - Criar nova beneficiária
router.post('/', authenticateToken, requireProfissional, async (req, res) => {
  const beneficiaria = await beneficiariaService.criar(req.body, req.user.id);
  res.status(201).json({
    message: 'Beneficiária cadastrada com sucesso',
    beneficiaria
  });
});

// PUT /beneficiarias/:id - Atualizar beneficiária
router.put('/:id', authenticateToken, requireProfissional, validateId, async (req, res) => {
  const beneficiaria = await beneficiariaService.atualizar(req.params.id, req.body, req.user.id);
  res.json({
    message: 'Beneficiária atualizada com sucesso',
    beneficiaria
  });
});

// DELETE /beneficiarias/:id - Excluir beneficiária (soft delete)
router.delete('/:id', authenticateToken, requireProfissional, validateId, async (req, res) => {
  await beneficiariaService.excluir(req.params.id, req.user.id);
  res.json({
    message: 'Beneficiária removida com sucesso'
  });
});

// GET /beneficiarias/:id/anamneses - Buscar anamneses da beneficiária
router.get('/:id/anamneses', authenticateToken, validateId, async (req, res) => {
  const anamneses = await beneficiariaService.buscarAnamneses(req.params.id);
  res.json({ anamneses });
});

// GET /beneficiarias/:id/declaracoes - Buscar declarações da beneficiária
router.get('/:id/declaracoes', authenticateToken, validateId, async (req, res) => {
  const declaracoes = await beneficiariaService.buscarDeclaracoes(req.params.id);
  res.json({ declaracoes });
});

// GET /beneficiarias/:id/historico - Buscar histórico completo da beneficiária
router.get('/:id/historico', authenticateToken, validateId, async (req, res) => {
  const historico = await beneficiariaService.buscarHistoricoCompleto(req.params.id);
  res.json(historico);
});

module.exports = router;
