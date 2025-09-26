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
import { catchAsync } from '../middleware/errorHandler';

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(authenticateToken);

// Listar participações com filtros
router.get('/', catchAsync(listarParticipacoes));

// Criar nova participação
router.post('/', validateRequest(createParticipacaoSchema), catchAsync(criarParticipacao));

// Atualizar participação
router.patch('/:id', validateRequest(updateParticipacaoSchema), catchAsync(atualizarParticipacao));

// Excluir participação
router.delete('/:id', catchAsync(excluirParticipacao));

// Registrar presença
router.post('/:id/presenca', catchAsync(registrarPresenca));

// Emitir certificado
router.post('/:id/certificado', catchAsync(emitirCertificado));

export default router;
