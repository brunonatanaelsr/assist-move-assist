import { Router, Request, Response } from 'express';
// Import com case correto para compatibilidade em Linux (FS case-sensitive)
import { BeneficiariasService } from '../services/beneficiarias.service';
import { authenticateToken, requireProfissional, authorize } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { formatObjectDates } from '../utils/dateFormatter';
import { AppError } from '../utils';
import { loggerService } from '../services/logger';
import { validateRequest } from '../middleware/validationMiddleware';
import { beneficiariaSchema, validateBeneficiaria } from '../validators/beneficiaria.validator';
import { pool } from '../config/database';
import { ZodError } from 'zod';
import { redis } from '../lib/redis';

// Interface para requisições autenticadas com parâmetros e corpo
type ExtendedRequest = Request;

const router = Router();
const beneficiariasService = new BeneficiariasService(pool, redis);

// GET / - Listar beneficiárias (paginado)
router.get(
  '/',
  authenticateToken,
  authorize('beneficiarias.ler'),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
      const allowedStatus = new Set(['ativa', 'inativa', 'pendente', 'desistente', 'em_acompanhamento']);
      const statusFilter = status && allowedStatus.has(status) ? status as "ativa" | "inativa" | "pendente" | "desistente" | "em_acompanhamento" : undefined;

      const filtros = {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      };

      const result = await beneficiariasService.listarAtivas({
        page,
        limit,
        filtros: Object.keys(filtros).length > 0 ? filtros : undefined,
      });

      const items = result.data.map((beneficiaria) =>
        formatObjectDates(
          beneficiaria as unknown as Record<string, unknown>,
          ['data_nascimento', 'created_at', 'updated_at'] as any
        )
      );

      res.json(
        successResponse({
          items,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: result.pages,
          }
        })
      );
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
  authorize('beneficiarias.ler'),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const beneficiaria = await beneficiariasService.getDetalhes(Number(id));

      const beneficiariaFormatada = formatObjectDates(
        beneficiaria as unknown as Record<string, unknown>,
        ['data_nascimento', 'rg_data_emissao', 'created_at', 'updated_at'] as any
      ) as unknown as typeof beneficiaria;

      const familiaresFormatados = beneficiariaFormatada.familiares?.map((familiar) =>
        formatObjectDates(familiar as unknown as Record<string, unknown>, ['data_nascimento'] as any)
      ) ?? [];

      res.json(successResponse({
        ...beneficiariaFormatada,
        familiares: familiaresFormatados
      }));
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

// GET /:id/resumo - Resumo consolidado da beneficiária
router.get(
  '/:id/resumo',
  authenticateToken,
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params as any;

      const resumo = await beneficiariasService.getResumo(Number(id));

      const beneficiariaFormatada = formatObjectDates(
        resumo.beneficiaria as unknown as Record<string, unknown>,
        ['created_at', 'updated_at'] as any
      );

      const atendimentosFormatados = formatObjectDates(
        resumo.atendimentos as unknown as Record<string, unknown>,
        ['ultimo_atendimento'] as any
      );

      res.json(
        successResponse({
          ...resumo,
          beneficiaria: beneficiariaFormatada,
          atendimentos: atendimentosFormatados
        })
      );
      return;
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      }
      loggerService.error('Resumo beneficiaria error:', error);
      res.status(500).json(errorResponse('Erro ao obter resumo da beneficiária'));
      return;
    }
  }
);

// GET /:id/atividades - Lista atividades recentes da beneficiária (formularios + específicos)
router.get(
  '/:id/atividades',
  authenticateToken,
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params as any;
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '20', 10);

      const atividades = await beneficiariasService.getAtividades(Number(id), page, limit);

      const data = atividades.data.map((item) =>
        formatObjectDates(item as unknown as Record<string, unknown>, ['created_at'] as any)
      );

      res.json(
        successResponse({
          data,
          pagination: atividades.pagination
        })
      );
      return;
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      }
      loggerService.error('Erro ao listar atividades da beneficiária:', error);
      res.status(500).json(errorResponse('Erro ao listar atividades'));
      return;
    }
  }
);

// POST / - Criar nova beneficiária
router.post(
  '/',
  authenticateToken,
  requireProfissional,
  authorize('beneficiarias.criar'),
  validateRequest(
    require('zod').z.object({
      body: beneficiariaSchema,
      query: require('zod').z.any().optional(),
      params: require('zod').z.any().optional(),
    })
  ),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const parsed = await validateBeneficiaria(req.body);

      const beneficiaria = await beneficiariasService.createBeneficiaria(parsed as any, {
        skipValidation: true
      });

      const beneficiariaFormatada = formatObjectDates(
        beneficiaria as unknown as Record<string, unknown>,
        ['data_nascimento', 'rg_data_emissao', 'created_at', 'updated_at'] as any
      ) as unknown as typeof beneficiaria;

      const familiaresFormatados = beneficiariaFormatada.familiares?.map((familiar) =>
        formatObjectDates(familiar as unknown as Record<string, unknown>, ['data_nascimento'] as any)
      ) ?? [];

      loggerService.audit('BENEFICIARIA_CREATED', (req as any).user?.id, {
        beneficiaria_id: beneficiaria.id
      });

      res.status(201).json(successResponse({
        ...beneficiariaFormatada,
        familiares: familiaresFormatados
      }));
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.issues
        });
        return;
      }
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      }
      loggerService.error('Create beneficiaria error:', error);
      res.status(500).json(errorResponse('Erro ao criar beneficiária'));
      return;
    }
  }
);

// PUT /:id - Atualizar beneficiária
router.put(
  '/:id',
  authenticateToken,
  requireProfissional,
  authorize('beneficiarias.editar'),
  validateRequest(
    require('zod').z.object({
      body: beneficiariaSchema.partial(),
      query: require('zod').z.any().optional(),
      params: require('zod').z.any().optional(),
    })
  ),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const parsedUpdate = await validateBeneficiaria(updateData, true);

      const beneficiaria = await beneficiariasService.updateBeneficiaria(
        Number(id),
        parsedUpdate as any,
        { skipValidation: true }
      );

      const beneficiariaFormatada = formatObjectDates(
        beneficiaria as unknown as Record<string, unknown>,
        ['data_nascimento', 'rg_data_emissao', 'created_at', 'updated_at'] as any
      ) as unknown as typeof beneficiaria;

      const familiaresFormatados = beneficiariaFormatada.familiares?.map((familiar) =>
        formatObjectDates(familiar as unknown as Record<string, unknown>, ['data_nascimento'] as any)
      ) ?? [];

      loggerService.audit('BENEFICIARIA_UPDATED', (req as any).user?.id, {
        beneficiaria_id: id,
        changes: updateData
      });

      res.json(successResponse({
        ...beneficiariaFormatada,
        familiares: familiaresFormatados
      }));
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.issues
        });
        return;
      }
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      }
      loggerService.error('Update beneficiaria error:', error);
      res.status(500).json(errorResponse('Erro ao atualizar beneficiária'));
      return;
    }
  }
);

// DELETE /:id - Excluir beneficiária
router.delete(
  '/:id',
  authenticateToken,
  requireProfissional,
  authorize('beneficiarias.excluir'),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await beneficiariasService.deleteBeneficiaria(Number(id));

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
