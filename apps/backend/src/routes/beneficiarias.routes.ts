import { Router, Request, Response, type RequestHandler } from 'express';
import fs from 'fs';
import path from 'path';
// Import com case correto para compatibilidade em Linux (FS case-sensitive)
import { BeneficiariasService } from '../services/beneficiarias.service';
import { authenticateToken, requireProfissional, authorize } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { formatObjectDates } from '../utils/dateFormatter';
import { AppError } from '../utils';
import { loggerService } from '../services/logger';
import { validateRequest } from '../middleware/validationMiddleware';
import {
  createAtendimentoRequestSchema,
  createBeneficiariaRequestSchema,
  createDependenteRequestSchema,
  updateBeneficiariaRequestSchema,
  updateInfoSocioeconomicaRequestSchema,
  validateBeneficiaria
} from '../validation/schemas/beneficiaria.schema';
import { pool } from '../config/database';
import { ZodError } from 'zod';
import { redis } from '../lib/redis';
import { uploadSingle, UPLOAD_DIR } from '../middleware/upload';
import type { BeneficiariaDetalhada } from '../types/beneficiarias';

// Interface para requisições autenticadas com parâmetros e corpo
type ExtendedRequest = Request;

const router = Router();
const beneficiariasService = new BeneficiariasService(pool, redis);

const uploadFotoMiddleware = (fieldName: string): RequestHandler => (
  uploadSingle(fieldName) as unknown as RequestHandler
);

const formatBeneficiariaDetalhadaResponse = (
  beneficiaria: BeneficiariaDetalhada
): BeneficiariaDetalhada => {
  const base = formatObjectDates(
    beneficiaria as unknown as Record<string, unknown>,
    ['data_nascimento', 'rg_data_emissao', 'created_at', 'updated_at', 'arquivada_em'] as any
  ) as unknown as BeneficiariaDetalhada;

  const familiaresFormatados =
    base.familiares?.map((familiar) =>
      formatObjectDates(familiar as unknown as Record<string, unknown>, ['data_nascimento', 'created_at'] as any)
    ) ?? [];

  const dependentesFormatados =
    base.dependentes?.map((dependente) =>
      formatObjectDates(
        dependente as unknown as Record<string, unknown>,
        ['data_nascimento', 'created_at', 'updated_at'] as any
      )
    ) ?? [];

  const historicoFormatado =
    base.historico_atendimentos?.map((atendimento) =>
      formatObjectDates(
        atendimento as unknown as Record<string, unknown>,
        ['data', 'created_at', 'updated_at'] as any
      )
    ) ?? [];

  const infoSocio = base.info_socioeconomica
    ? formatObjectDates(
        base.info_socioeconomica as unknown as Record<string, unknown>,
        ['created_at', 'updated_at'] as any
      )
    : null;

  return {
    ...base,
    familiares: familiaresFormatados as any,
    dependentes: dependentesFormatados as any,
    historico_atendimentos: historicoFormatado as any,
    info_socioeconomica: infoSocio as any
  };
};

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
      type BeneficiariaStatus =
        | 'ativa'
        | 'inativa'
        | 'pendente'
        | 'desistente'
        | 'em_acompanhamento';
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
      const allowedStatus: ReadonlySet<BeneficiariaStatus> = new Set([
        'ativa',
        'inativa',
        'pendente',
        'desistente',
        'em_acompanhamento'
      ]);
      const statusFilter: BeneficiariaStatus | undefined =
        status && allowedStatus.has(status as BeneficiariaStatus)
          ? (status as BeneficiariaStatus)
          : undefined;

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

      const beneficiariaFormatada = formatBeneficiariaDetalhadaResponse(beneficiaria);

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
  validateRequest(createBeneficiariaRequestSchema),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const parsed = await validateBeneficiaria(req.body);

      const beneficiaria = await beneficiariasService.createBeneficiaria(parsed as any, {
        skipValidation: true
      });

      const beneficiariaFormatada = formatBeneficiariaDetalhadaResponse(beneficiaria);

      loggerService.audit('BENEFICIARIA_CREATED', (req as any).user?.id, {
        beneficiaria_id: beneficiaria.id
      });

      res.status(201).json(successResponse(beneficiariaFormatada));
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
  validateRequest(updateBeneficiariaRequestSchema),
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

      const beneficiariaFormatada = formatBeneficiariaDetalhadaResponse(beneficiaria);

      loggerService.audit('BENEFICIARIA_UPDATED', (req as any).user?.id, {
        beneficiaria_id: id,
        changes: updateData
      });

      res.json(successResponse(beneficiariaFormatada));
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

router.patch(
  '/:id/arquivar',
  authenticateToken,
  requireProfissional,
  authorize('beneficiarias.editar'),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await beneficiariasService.arquivarBeneficiaria(Number(id));

      loggerService.audit('BENEFICIARIA_ARCHIVED', (req as any).user?.id, {
        beneficiaria_id: id
      });

      res.json(successResponse<null>(null, 'Beneficiária arquivada com sucesso'));
      return;
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      }
      loggerService.error('Erro ao arquivar beneficiária:', error);
      res.status(500).json(errorResponse('Erro ao arquivar beneficiária'));
      return;
    }
  }
);

router.put(
  '/:id/info-socioeconomica',
  authenticateToken,
  requireProfissional,
  authorize('beneficiarias.editar'),
  validateRequest(updateInfoSocioeconomicaRequestSchema),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const beneficiaria = await beneficiariasService.atualizarInfoSocioeconomica(
        Number(id),
        req.body
      );

      loggerService.audit('BENEFICIARIA_SOCIOECONOMICO_UPDATED', (req as any).user?.id, {
        beneficiaria_id: id,
        payload: req.body
      });

      const beneficiariaFormatada = formatBeneficiariaDetalhadaResponse(beneficiaria);
      res.json(successResponse(beneficiariaFormatada));
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
      loggerService.error('Erro ao atualizar informações socioeconômicas:', error);
      res.status(500).json(errorResponse('Erro ao atualizar informações socioeconômicas'));
      return;
    }
  }
);

router.post(
  '/:id/dependentes',
  authenticateToken,
  requireProfissional,
  authorize('beneficiarias.editar'),
  validateRequest(createDependenteRequestSchema),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const beneficiaria = await beneficiariasService.adicionarDependente(Number(id), req.body);

      loggerService.audit('BENEFICIARIA_DEPENDENTE_ADICIONADO', (req as any).user?.id, {
        beneficiaria_id: id,
        dependente: req.body?.nome_completo
      });

      const beneficiariaFormatada = formatBeneficiariaDetalhadaResponse(beneficiaria);
      res.status(201).json(successResponse(beneficiariaFormatada));
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
      loggerService.error('Erro ao adicionar dependente:', error);
      res.status(500).json(errorResponse('Erro ao adicionar dependente'));
      return;
    }
  }
);

router.delete(
  '/:id/dependentes/:dependenteId',
  authenticateToken,
  requireProfissional,
  authorize('beneficiarias.editar'),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id, dependenteId } = req.params as any;
      await beneficiariasService.removerDependente(Number(id), Number(dependenteId));

      loggerService.audit('BENEFICIARIA_DEPENDENTE_REMOVIDO', (req as any).user?.id, {
        beneficiaria_id: id,
        dependente_id: dependenteId
      });

      res.json(successResponse<null>(null, 'Dependente removido com sucesso'));
      return;
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      }
      loggerService.error('Erro ao remover dependente:', error);
      res.status(500).json(errorResponse('Erro ao remover dependente'));
      return;
    }
  }
);

router.post(
  '/:id/atendimentos',
  authenticateToken,
  requireProfissional,
  authorize('beneficiarias.editar'),
  validateRequest(createAtendimentoRequestSchema),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const beneficiaria = await beneficiariasService.adicionarAtendimento(Number(id), req.body);

      loggerService.audit('BENEFICIARIA_ATENDIMENTO_ADICIONADO', (req as any).user?.id, {
        beneficiaria_id: id,
        tipo: req.body?.tipo
      });

      const beneficiariaFormatada = formatBeneficiariaDetalhadaResponse(beneficiaria);
      res.status(201).json(successResponse(beneficiariaFormatada));
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
      loggerService.error('Erro ao registrar atendimento:', error);
      res.status(500).json(errorResponse('Erro ao registrar atendimento'));
      return;
    }
  }
);

router.post(
  '/:id/foto',
  authenticateToken,
  requireProfissional,
  authorize('beneficiarias.editar'),
  uploadFotoMiddleware('foto'),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    const uploadedFile = (req as any).file as Express.Multer.File | undefined;
    try {
      const { id } = req.params;
      const beneficiariaId = Number(id);

      if (!uploadedFile) {
        res.status(400).json(errorResponse('Nenhum arquivo enviado'));
        return;
      }

      const existente = await beneficiariasService.buscarPorId(beneficiariaId);
      const fotoAnterior = existente.foto_filename;

      const beneficiariaAtualizada = await beneficiariasService.atualizarFoto(
        beneficiariaId,
        uploadedFile.filename
      );

      if (fotoAnterior && fotoAnterior !== beneficiariaAtualizada.foto_filename) {
        const antigoPath = path.join(UPLOAD_DIR, fotoAnterior);
        try {
          await fs.promises.unlink(antigoPath);
        } catch (unlinkError: any) {
          if (unlinkError?.code !== 'ENOENT') {
            loggerService.warn('Falha ao remover foto antiga da beneficiária', {
              beneficiariaId,
              error: unlinkError
            });
          }
        }
      }

      loggerService.audit('BENEFICIARIA_FOTO_ATUALIZADA', (req as any).user?.id, {
        beneficiaria_id: id,
        filename: beneficiariaAtualizada.foto_filename
      });

      res.status(201).json(
        successResponse({
          foto_url: beneficiariaAtualizada.foto_url ?? null,
          foto_filename: beneficiariaAtualizada.foto_filename ?? null
        }, 'Foto atualizada com sucesso')
      );
      return;
    } catch (error) {
      if (uploadedFile) {
        try {
          await fs.promises.unlink(path.join(UPLOAD_DIR, uploadedFile.filename));
        } catch (unlinkError) {
          loggerService.warn('Falha ao remover upload após erro', {
            error: unlinkError
          });
        }
      }

      if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));
        return;
      }
      loggerService.error('Erro ao atualizar foto da beneficiária:', error);
      res.status(500).json(errorResponse('Erro ao atualizar foto da beneficiária'));
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
