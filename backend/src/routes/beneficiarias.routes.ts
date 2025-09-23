import { Router, Request, Response, NextFunction } from 'express';
// Import com case correto para compatibilidade em Linux (FS case-sensitive)
import { BeneficiariasRepository } from '../repositories/beneficiariasRepository';
import { authenticateToken, requireProfissional, authorize } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { catchAsync } from '../middleware/errorHandler';
import { formatObjectDates } from '../utils/dateFormatter';
import { AppError } from '../utils';
import { loggerService } from '../services/logger';
import { validateRequest } from '../middleware/validationMiddleware';
import { beneficiariaSchema, validateBeneficiaria } from '../validators/beneficiaria.validator';
import { db } from '../services/db';
import { pool } from '../config/database';
import { ZodError } from 'zod';

// Interface para requisições autenticadas com parâmetros e corpo
type ExtendedRequest = Request;

const router = Router();
const beneficiariasRepository = new BeneficiariasRepository(pool);

// GET / - Listar beneficiárias (paginado)
router.get(
  '/',
  authenticateToken,
  authorize('beneficiarias.ler'),
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
  authorize('beneficiarias.ler'),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const beneficiaria = await beneficiariasRepository.findWithRelations(Number(id));

      if (!beneficiaria) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

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

      const info = await pool.query(
        'SELECT id, nome_completo, status, created_at, updated_at FROM beneficiarias WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (info.rowCount === 0) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      const [anamnese, ficha, termos, visao, genericos, atend, parts] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS c FROM anamnese_social WHERE beneficiaria_id = $1', [id]),
        pool.query('SELECT COUNT(*)::int AS c FROM ficha_evolucao WHERE beneficiaria_id = $1', [id]),
        pool.query('SELECT COUNT(*)::int AS c FROM termos_consentimento WHERE beneficiaria_id = $1', [id]),
        pool.query('SELECT COUNT(*)::int AS c FROM visao_holistica WHERE beneficiaria_id = $1', [id]),
        pool.query('SELECT COUNT(*)::int AS c FROM formularios WHERE beneficiaria_id = $1', [id]),
        pool.query('SELECT COUNT(*)::int AS c, MAX(data_atendimento) AS ultimo FROM historico_atendimentos WHERE beneficiaria_id = $1', [id]),
        pool.query('SELECT COUNT(*)::int AS c FROM participacoes WHERE beneficiaria_id = $1 AND ativo = true', [id])
      ]);

      const resumo = {
        beneficiaria: info.rows[0],
        formularios: {
          total:
            anamnese.rows[0].c +
            ficha.rows[0].c +
            termos.rows[0].c +
            visao.rows[0].c +
            genericos.rows[0].c,
          anamnese: anamnese.rows[0].c,
          ficha_evolucao: ficha.rows[0].c,
          termos: termos.rows[0].c,
          visao_holistica: visao.rows[0].c,
          genericos: genericos.rows[0].c
        },
        atendimentos: {
          total: atend.rows[0].c,
          ultimo_atendimento: atend.rows[0].ultimo
        },
        participacoes: {
          total_ativas: parts.rows[0].c
        }
      };

      res.json(successResponse(resumo));
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
      const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
      const offset = (Math.max(1, page) - 1) * Math.max(1, limit);

      const result = await pool.query(
        `SELECT * FROM (
           SELECT 'formulario' as type, id, created_at, usuario_id as created_by, null::text as created_by_name
             FROM formularios WHERE beneficiaria_id = $1
           UNION ALL
           SELECT 'anamnese' as type, id, created_at, created_by, null::text as created_by_name
             FROM anamnese_social WHERE beneficiaria_id = $1
           UNION ALL
           SELECT 'ficha_evolucao' as type, id, created_at, created_by, null::text as created_by_name
             FROM ficha_evolucao WHERE beneficiaria_id = $1
           UNION ALL
           SELECT 'termos_consentimento' as type, id, created_at, created_by, null::text as created_by_name
             FROM termos_consentimento WHERE beneficiaria_id = $1
           UNION ALL
           SELECT 'visao_holistica' as type, id, created_at, created_by, null::text as created_by_name
             FROM visao_holistica WHERE beneficiaria_id = $1
         ) acts
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [id, limit, offset]
      );

      res.json(successResponse({ data: result.rows, pagination: { page, limit, total: null } }));
      return;
    } catch (error) {
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
      const { familiares, vulnerabilidades, ...beneficiariaPayload } = parsed;

      // Validar CPF único
      const cpfPayload = beneficiariaPayload.cpf;
      if (cpfPayload) {
        const existingBeneficiaria = await beneficiariasRepository.findByCPF(cpfPayload);
        if (existingBeneficiaria) {
          throw new AppError('CPF já cadastrado', 400);
        }
      }

      const beneficiariaData = Object.fromEntries(
        Object.entries(beneficiariaPayload).filter(([, value]) => value !== undefined && value !== null)
      );

      const beneficiaria = await beneficiariasRepository.createWithRelations(
        beneficiariaData as any,
        familiares,
        vulnerabilidades
      );

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

      // Validar se beneficiária existe
      const existingBeneficiaria = await beneficiariasRepository.findById(Number(id));

      if (!existingBeneficiaria) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      const parsedUpdate = await validateBeneficiaria(updateData, true);
      const { familiares, vulnerabilidades, ...payload } = parsedUpdate;

      // Validar CPF único se estiver sendo atualizado
      if (payload.cpf && payload.cpf !== existingBeneficiaria.cpf) {
        const cpfExists = await beneficiariasRepository.findByCPF(payload.cpf);
        if (cpfExists && cpfExists.id !== Number(id)) {
          throw new AppError('CPF já cadastrado para outra beneficiária', 400);
        }
      }

      const sanitized = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
      );

      const beneficiaria = await beneficiariasRepository.updateWithRelations(
        Number(id),
        sanitized as any,
        familiares,
        vulnerabilidades
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
        changes: sanitized
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
