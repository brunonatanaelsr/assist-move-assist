import { Router } from 'express';
import {
  listarProjetos,
  buscarProjeto,
  criarProjeto,
  atualizarProjeto,
  excluirProjeto
} from '../controllers/projeto.controller';
import { validateRequest } from '../middleware/validateRequest';
import {
  createProjetoSchema,
  updateProjetoSchema,
  projetoFilterSchema
} from '../validators/projeto.validator';
import { authenticateToken, requireGestor } from '../middleware/auth';

const router = Router();

// Todas as rotas exigem autenticação
router.use(authenticateToken);

// Listar projetos com filtros
router.get('/', validateRequest(projetoFilterSchema), listarProjetos);

// Buscar projeto por ID
router.get('/:id', buscarProjeto);

// Criar projeto (requer gestor)
router.post('/', requireGestor, validateRequest(createProjetoSchema), criarProjeto);

// Atualizar projeto (requer gestor)
router.put('/:id', requireGestor, validateRequest(updateProjetoSchema), atualizarProjeto);

// Excluir projeto (requer gestor)
router.delete('/:id', requireGestor, excluirProjeto);

export default router;
