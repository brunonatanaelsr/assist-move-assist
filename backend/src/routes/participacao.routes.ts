import express from 'express';
import {
  listarParticipacoes,
  criarParticipacao,
  atualizarParticipacao,
  excluirParticipacao,
  registrarPresenca,
  emitirCertificado
} from '../controllers/participacao.controller';
import { validateRequest } from '../middleware/validateRequest';
import {
  createParticipacaoSchema,
  updateParticipacaoSchema
} from '../validators/participacao.validator';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

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
router.post('/:id/presenca', registrarPresenca);

// Emitir certificado
router.post('/:id/certificado', emitirCertificado);

export default router;
