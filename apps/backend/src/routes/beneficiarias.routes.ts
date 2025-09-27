import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, requireProfissional, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validationMiddleware';
import { beneficiariaSchema } from '../validators/beneficiaria.validator';
import { catchAsync } from '../middleware/errorHandler';
import {
  listarBeneficiarias,
  obterBeneficiaria,
  obterResumoBeneficiaria,
  obterAtividadesBeneficiaria,
  criarBeneficiaria,
  atualizarBeneficiaria,
  removerBeneficiaria
} from '../controllers/beneficiarias.controller';

const router = Router();

const createBeneficiariaValidation = z.object({
  body: beneficiariaSchema,
  query: z.any().optional(),
  params: z.any().optional(),
});

const updateBeneficiariaValidation = z.object({
  body: beneficiariaSchema.partial(),
  query: z.any().optional(),
  params: z.any().optional(),
});

router.get(
  '/',
  authenticateToken,
  authorize('beneficiarias.ler'),
  catchAsync(listarBeneficiarias)
);

router.get(
  '/:id',
  authenticateToken,
  authorize('beneficiarias.ler'),
  catchAsync(obterBeneficiaria)
);

router.get(
  '/:id/resumo',
  authenticateToken,
  catchAsync(obterResumoBeneficiaria)
);

router.get(
  '/:id/atividades',
  authenticateToken,
  catchAsync(obterAtividadesBeneficiaria)
);

router.post(
  '/',
  authenticateToken,
  requireProfissional,
  authorize('beneficiarias.criar'),
  validateRequest(createBeneficiariaValidation),
  catchAsync(criarBeneficiaria)
);

router.put(
  '/:id',
  authenticateToken,
  requireProfissional,
  authorize('beneficiarias.editar'),
  validateRequest(updateBeneficiariaValidation),
  catchAsync(atualizarBeneficiaria)
);

router.delete(
  '/:id',
  authenticateToken,
  requireProfissional,
  authorize('beneficiarias.excluir'),
  catchAsync(removerBeneficiaria)
);

export default router;
