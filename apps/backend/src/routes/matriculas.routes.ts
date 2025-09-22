import express from 'express';
import {
  listarMatriculas,
  criarMatricula,
  obterMatricula,
  atualizarMatricula,
  verificarElegibilidade
} from '../controllers/matriculas-fixed.controller';
import { authenticateToken } from '../middleware/auth';
import {
  validateRequest,
  validateQuery,
  validateParams,
  createMatriculaSchema,
  updateMatriculaSchema,
  verificarElegibilidadeSchema,
  listarMatriculasQuerySchema,
  idParamSchema
} from '../validators/matriculas.validator';

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(authenticateToken);

// Verificar elegibilidade para projeto (DEVE vir antes de /:id)
router.post('/verificar-elegibilidade', 
  validateRequest(verificarElegibilidadeSchema), 
  verificarElegibilidade
);

// Listar matrículas
router.get('/', 
  validateQuery(listarMatriculasQuerySchema), 
  listarMatriculas
);

// Criar nova matrícula
router.post('/', 
  validateRequest(createMatriculaSchema), 
  criarMatricula
);

// Obter matrícula específica
router.get('/:id', 
  validateParams(idParamSchema), 
  obterMatricula
);

// Atualizar matrícula
router.patch('/:id', 
  validateParams(idParamSchema),
  validateRequest(updateMatriculaSchema), 
  atualizarMatricula
);

export default router;
