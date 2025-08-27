import express from 'express';
import { BeneficiariasController } from '../controllers/BeneficiariasController';
import { auth } from '../middleware/authMiddleware';
import { pool } from '../config/database';
import { validateRequest } from '../middleware/validationMiddleware';
import { beneficiariaSchema } from '../types/beneficiarias';

const router = express.Router();
const beneficiariasController = new BeneficiariasController(pool);

router.use(auth); // Todas as rotas requerem autenticação

// Listar beneficiárias com paginação e filtros
router.get('/', beneficiariasController.listar);

// Buscar uma beneficiária por ID
router.get('/:id', beneficiariasController.buscarPorId);

// Buscar resumo de uma beneficiária
router.get('/:id/resumo', beneficiariasController.buscarResumo);

// Criar nova beneficiária
router.post('/', 
  validateRequest(beneficiariaSchema),
  beneficiariasController.criar
);

// Atualizar beneficiária existente
router.put('/:id', 
  validateRequest(beneficiariaSchema.partial()),
  beneficiariasController.atualizar
);

// Excluir beneficiária (soft delete)
router.delete('/:id', beneficiariasController.excluir);

export { router as beneficiariasRoutes };
