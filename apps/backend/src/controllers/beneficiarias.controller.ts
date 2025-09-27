import { Request, Response } from 'express';
import { ZodError } from 'zod';
import pool from '../config/database';
import redis from '../config/redis';
import { BeneficiariasRepository } from '../repositories/beneficiariasRepository';
import { BeneficiariasService } from '../services/beneficiarias.service';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { AppError } from '../utils';
import { loggerService } from '../services/logger';

const beneficiariasRepository = new BeneficiariasRepository(pool);
const beneficiariasService = new BeneficiariasService(pool, redis, beneficiariasRepository);

const getUserId = (req: Request): number | undefined => {
  const user = (req as any).user;
  if (user?.id) {
    return Number(user.id);
  }
  return undefined;
};

export const listarBeneficiarias = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);

    const result = await beneficiariasService.listarAtivas(page, limit);

    return res.json(successResponse(result.data));
  } catch (error) {
    loggerService.error('List beneficiarias error:', error);
    return res.status(500).json(errorResponse('Erro ao listar beneficiárias'));
  }
};

export const obterBeneficiaria = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const beneficiaria = await beneficiariasService.obterDetalhes(Number(id));

    return res.json(successResponse(beneficiaria));
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error.message));
    }

    loggerService.error('Get beneficiaria error:', error);
    return res.status(500).json(errorResponse('Erro ao buscar beneficiária'));
  }
};

export const obterResumoBeneficiaria = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resumo = await beneficiariasService.obterResumo(Number(id));

    return res.json(successResponse(resumo));
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error.message));
    }

    loggerService.error('Resumo beneficiaria error:', error);
    return res.status(500).json(errorResponse('Erro ao obter resumo da beneficiária'));
  }
};

export const obterAtividadesBeneficiaria = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);

    const atividades = await beneficiariasService.obterAtividades(Number(id), page, limit);

    return res.json(successResponse(atividades));
  } catch (error) {
    loggerService.error('Erro ao listar atividades da beneficiária:', error);
    return res.status(500).json(errorResponse('Erro ao listar atividades'));
  }
};

export const criarBeneficiaria = async (req: Request, res: Response) => {
  try {
    const beneficiaria = await beneficiariasService.criarCompleta(req.body, getUserId(req));

    return res.status(201).json(successResponse(beneficiaria));
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.issues
      });
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error.message));
    }

    loggerService.error('Create beneficiaria error:', error);
    return res.status(500).json(errorResponse('Erro ao criar beneficiária'));
  }
};

export const atualizarBeneficiaria = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const beneficiaria = await beneficiariasService.atualizarCompleta(Number(id), req.body, getUserId(req));

    return res.json(successResponse(beneficiaria));
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.issues
      });
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error.message));
    }

    loggerService.error('Update beneficiaria error:', error);
    return res.status(500).json(errorResponse('Erro ao atualizar beneficiária'));
  }
};

export const removerBeneficiaria = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resultado = await beneficiariasService.remover(Number(id), getUserId(req));

    return res.json(successResponse(resultado));
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error.message));
    }

    loggerService.error('Delete beneficiaria error:', error);
    return res.status(500).json(errorResponse('Erro ao remover beneficiária'));
  }
};
