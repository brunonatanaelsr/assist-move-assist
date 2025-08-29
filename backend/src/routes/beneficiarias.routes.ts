import { Router, Request, Response, NextFunction } from 'express';
import { BeneficiariasRepository } from '../repositories/BeneficiariasRepository';
import { authenticateToken, requireProfissional } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { catchAsync } from '../middleware/errorHandler';
import { formatObjectDates } from '../utils/dateFormatter';
import { AppError } from '../utils/AppError';
import { loggerService } from '../services/logger';
import { db } from '../services/db';
import { pool } from '../config/database';

// Interface para requisições autenticadas com parâmetros e corpo
type ExtendedRequest = Request;

const router = Router();
const beneficiariasRepository = new BeneficiariasRepository(pool);

// GET / - Listar beneficiárias (paginado)
router.get(
  '/',
  authenticateToken,
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '50', 10);

      const result = await beneficiariasRepository.listarAtivas(page, limit);

      res.json(successResponse(result.data));
      return;
    } catch (error) {
      loggerService.error('List beneficiarias error:', error);
      res.status(500).json(errorResponse('Erro ao listar beneficiárias'));
      return;
    }
  }
);

// GET /:id - Buscar beneficiária por ID
router.get(
  '/:id',
  authenticateToken,
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const beneficiaria = await beneficiariasRepository.findById(Number(id));
      
      if (!beneficiaria) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      // Formatar datas antes de enviar a resposta
      const beneficiariaFormatada = formatObjectDates(beneficiaria, [
        'data_nascimento',
        'data_criacao',
        'data_atualizacao'
      ]);
      
      res.json(successResponse(beneficiariaFormatada));
      return;
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      } else {
        loggerService.error("Get beneficiaria error:", error);
        res.status(500).json(errorResponse("Erro ao buscar beneficiária"));
        return;
      }
    }
  }
);

// POST / - Criar nova beneficiária
router.post(
  '/',
  authenticateToken,
  requireProfissional,
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const {
        nome_completo,
        cpf,
        data_nascimento,
        endereco,
        telefone,
        email,
        estado_civil,
        escolaridade,
        renda_familiar,
        num_dependentes,
        status,
        observacoes
      } = req.body;

      // Validar CPF único
      const existingBeneficiaria = await beneficiariasRepository.findByCPF(cpf);

      if (existingBeneficiaria) {
        throw new AppError('CPF já cadastrado', 400);
      }

      // Preparar dados para inserção
      const beneficiariaData = {
        nome_completo,
        cpf,
        data_nascimento,
        endereco,
        telefone,
        email,
        estado_civil,
        escolaridade,
        renda_familiar,
        num_dependentes,
        status,
        observacoes
      };

      const beneficiaria = await beneficiariasRepository.create(beneficiariaData as any);
      
      loggerService.audit('BENEFICIARIA_CREATED', (req as any).user?.id, {
        beneficiaria_id: beneficiaria.id
      });

      res.status(201).json(successResponse(beneficiaria));
      return;
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      } else {
        loggerService.error("Create beneficiaria error:", error);
        res.status(500).json(errorResponse("Erro ao criar beneficiária"));
        return;
      }
    }
  }
);

// PUT /:id - Atualizar beneficiária
router.put(
  '/:id',
  authenticateToken,
  requireProfissional,
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validar se beneficiária existe
      const existingBeneficiaria = await beneficiariasRepository.findById(Number(id));

      if (!existingBeneficiaria) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      // Validar CPF único se estiver sendo atualizado
      if (updateData.cpf && updateData.cpf !== existingBeneficiaria.cpf) {
        const cpfExists = await beneficiariasRepository.findByCPF(updateData.cpf);
        if (cpfExists && cpfExists.id !== Number(id)) {
          throw new AppError('CPF já cadastrado para outra beneficiária', 400);
        }
      }

      // Adicionar campos de auditoria
      updateData.data_atualizacao = new Date();
      updateData.atualizado_por = (req as any).user?.id;

      const beneficiaria = await beneficiariasRepository.update(Number(id), updateData as any);

      loggerService.audit('BENEFICIARIA_UPDATED', (req as any).user?.id, {
        beneficiaria_id: id,
        changes: updateData
      });

      res.json(successResponse(beneficiaria));
      return;
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      } else {
        loggerService.error("Update beneficiaria error:", error);
        res.status(500).json(errorResponse("Erro ao atualizar beneficiária"));
        return;
      }
    }
  }
);

// DELETE /:id - Excluir beneficiária
router.delete(
  '/:id',
  authenticateToken,
  requireProfissional,
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Validar se beneficiária existe
      const existingBeneficiaria = await beneficiariasRepository.findById(Number(id));

      if (!existingBeneficiaria) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      // Marcar como inativa
      await beneficiariasRepository.softDelete(Number(id));

      loggerService.audit('BENEFICIARIA_DELETED', (req as any).user?.id, {
        beneficiaria_id: id
      });

      res.json(successResponse({ message: 'Beneficiária removida com sucesso' }));
      return;
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      } else {
        loggerService.error("Delete beneficiaria error:", error);
        res.status(500).json(errorResponse("Erro ao remover beneficiária"));
        return;
      }
    }
  }
);

export default router;
