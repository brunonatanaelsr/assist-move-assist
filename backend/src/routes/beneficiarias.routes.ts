import { Router, Request, Response, NextFunction } from 'express';
import { BeneficiariasRepository } from '../repositories/BeneficiariasRepository';
import { authenticateToken, PERMISSIONS, requirePermissions, AuthenticatedRequest, requireProfissional } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { catchAsync } from '../middleware/errorHandler';
import { formatObjectDates } from '../utils/dateFormatter';
import { AppError } from '../utils/AppError';
import { loggerService } from '../services/logger';
import { db } from '../services/db';
import { pool } from '../config/database';

// Interface para requisições autenticadas com parâmetros e corpo
interface ExtendedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const router = Router();
const beneficiariasRepository = new BeneficiariasRepository(pool);

// GET /:id - Buscar beneficiária por ID
router.get(
  '/:id',
  authenticateToken,
  requirePermissions([PERMISSIONS.READ_BENEFICIARIA]),
  async (req: ExtendedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const beneficiaria = await beneficiariasRepository.buscarPorId(Number(id));
      
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
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        loggerService.error("Get beneficiaria error:", error);
        res.status(500).json(errorResponse("Erro ao buscar beneficiária"));
      }
    }
  }
);

// POST / - Criar nova beneficiária
router.post(
  '/',
  authenticateToken,
  requireProfissional,
  async (req: ExtendedRequest, res: Response) => {
    try {
      const {
        nome,
        cpf,
        data_nascimento,
        endereco,
        telefone,
        email,
        estado_civil,
        escolaridade,
        profissao,
        renda_familiar,
        num_filhos,
        status,
        observacoes
      } = req.body;

      // Validar CPF único
      const existingBeneficiaria = await beneficiariasRepository.buscarPorCPF(cpf);

      if (existingBeneficiaria) {
        throw new AppError('CPF já cadastrado', 400);
      }

      // Preparar dados para inserção
      const beneficiariaData = {
        nome,
        cpf,
        data_nascimento,
        endereco,
        telefone,
        email,
        estado_civil,
        escolaridade,
        profissao,
        renda_familiar,
        num_filhos,
        status,
        observacoes,
        criado_por: req.user?.id,
        data_criacao: new Date(),
        atualizado_por: req.user?.id,
        data_atualizacao: new Date()
      };

      const beneficiaria = await beneficiariasRepository.criar(beneficiariaData);
      
      loggerService.audit('BENEFICIARIA_CREATED', req.user?.id, {
        beneficiaria_id: beneficiaria.id
      });

      res.status(201).json(successResponse(beneficiaria));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        loggerService.error("Create beneficiaria error:", error);
        res.status(500).json(errorResponse("Erro ao criar beneficiária"));
      }
    }
  }
);

// PUT /:id - Atualizar beneficiária
router.put(
  '/:id',
  authenticateToken,
  requireProfissional,
  async (req: ExtendedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validar se beneficiária existe
      const existingBeneficiaria = await beneficiariasRepository.buscarPorId(Number(id));

      if (!existingBeneficiaria) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      // Validar CPF único se estiver sendo atualizado
      if (updateData.cpf && updateData.cpf !== existingBeneficiaria.cpf) {
        const cpfExists = await beneficiariasRepository.buscarPorCPF(updateData.cpf);
        if (cpfExists && cpfExists.id !== Number(id)) {
          throw new AppError('CPF já cadastrado para outra beneficiária', 400);
        }
      }

      // Adicionar campos de auditoria
      updateData.data_atualizacao = new Date();
      updateData.atualizado_por = req.user?.id;

      const beneficiaria = await beneficiariasRepository.atualizar(Number(id), updateData);

      loggerService.audit('BENEFICIARIA_UPDATED', req.user?.id, {
        beneficiaria_id: id,
        changes: updateData
      });

      res.json(successResponse(beneficiaria));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        loggerService.error("Update beneficiaria error:", error);
        res.status(500).json(errorResponse("Erro ao atualizar beneficiária"));
      }
    }
  }
);

// DELETE /:id - Excluir beneficiária
router.delete(
  '/:id',
  authenticateToken,
  requireProfissional,
  async (req: ExtendedRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Validar se beneficiária existe
      const existingBeneficiaria = await beneficiariasRepository.buscarPorId(Number(id));

      if (!existingBeneficiaria) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      // Marcar como inativa
      await beneficiariasRepository.inativar(Number(id), req.user?.id);

      loggerService.audit('BENEFICIARIA_DELETED', req.user?.id, {
        beneficiaria_id: id
      });

      res.json(successResponse({ message: 'Beneficiária removida com sucesso' }));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        loggerService.error("Delete beneficiaria error:", error);
        res.status(500).json(errorResponse("Erro ao remover beneficiária"));
      }
    }
  }
);

export default router;
