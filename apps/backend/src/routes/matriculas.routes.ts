import express from 'express';
import {
  listarMatriculas,
  criarMatricula,
  obterMatricula,
  atualizarMatricula,
  verificarElegibilidade
} from '../controllers/matriculas-fixed.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validationMiddleware';
import {
  createMatriculaRequestSchema,
  listarMatriculasRequestSchema,
  matriculaIdRequestSchema,
  updateMatriculaRequestSchema,
  verificarElegibilidadeRequestSchema
} from '../validation/schemas/matriculas.schema';

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(authenticateToken);

// Verificar elegibilidade para projeto (DEVE vir antes de /:id)
router.post(
  '/verificar-elegibilidade',
  validateRequest(verificarElegibilidadeRequestSchema),
  verificarElegibilidade
);

// Listar matrículas
router.get(
  '/',
  validateRequest(listarMatriculasRequestSchema),
  listarMatriculas
);

// Criar nova matrícula
router.post(
  '/',
  validateRequest(createMatriculaRequestSchema),
  criarMatricula
);

// Obter matrícula específica
router.get(
  '/:id',
  validateRequest(matriculaIdRequestSchema),
  obterMatricula
);

// Atualizar matrícula
router.patch(
  '/:id',
  validateRequest(updateMatriculaRequestSchema),
  atualizarMatricula
);

export default router;
