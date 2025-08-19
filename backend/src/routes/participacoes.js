const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  listarParticipacoes,
  criarParticipacao,
  atualizarParticipacao,
  excluirParticipacao,
  registrarPresenca,
  emitirCertificado
} = require('../controllers/participacao.controller');
const {
  createParticipacaoSchema,
  updateParticipacaoSchema,
  registrarPresencaSchema
} = require('../validators/participacao.validator');

// Todas as rotas exigem autenticação
router.use(authenticateToken);

// Listar participações com filtros
router.get('/', listarParticipacoes);

// Criar nova participação
router.post('/', validateRequest(createParticipacaoSchema), criarParticipacao);

// Atualizar participação
router.patch('/:id', validateRequest(updateParticipacaoSchema), atualizarParticipacao);

// Excluir participação
router.delete('/:id', excluirParticipacao);

// Registrar presença
router.post('/:id/presenca', validateRequest(registrarPresencaSchema), registrarPresenca);

// Emitir certificado
router.post('/:id/certificado', emitirCertificado);

module.exports = router;
