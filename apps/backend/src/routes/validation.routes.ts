import { Router } from 'express';
import { ValidationController } from '../controllers/ValidationController';
import { catchAsync } from '../middleware/errorHandler';
import { BeneficiariasService } from '../services/beneficiarias.service';
import { pool } from '../config/database';
import { redis } from '../lib/redis';

const router = Router();
const beneficiariasService = new BeneficiariasService(pool, redis);
const validationController = new ValidationController(beneficiariasService);

router.post('/cpf', catchAsync((req, res, _next) => validationController.validateCpf(req, res)));
router.post('/email', catchAsync((req, res, _next) => validationController.validateEmail(req, res)));
router.post('/telefone', catchAsync((req, res, _next) => validationController.validateTelefone(req, res)));
router.get('/beneficiarias', catchAsync((req, res, _next) => validationController.searchBeneficiarias(req, res)));

export default router;
