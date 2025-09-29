import { Request, Response } from 'express';
import { MatriculasServiceError, matriculasService } from '../services/matriculas.service';
import { loggerService } from '../services/logger';
import { AppError } from '../utils/AppError';
import { BaseError } from '../utils/errors';

const parseNumberParam = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const handleControllerError = (
  error: unknown,
  res: Response,
  defaultMessage: string
) => {
  if (error instanceof MatriculasServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message
    });
  }

  if (error instanceof BaseError) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message
    });
  }

  const serializedError =
    error instanceof Error
      ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        }
      : error;

  loggerService.error(defaultMessage, {
    error: serializedError
  });
  return res.status(500).json({
    success: false,
    error: defaultMessage
  });
};

export const listarMatriculas = async (req: Request, res: Response) => {
  try {
    const page = parseNumberParam(req.query.page) ?? 1;
    const limit = parseNumberParam(req.query.limit) ?? 10;

    const result = await matriculasService.listarMatriculas({
      beneficiariaId: parseNumberParam(req.query.beneficiaria_id),
      projetoId: parseNumberParam(req.query.projeto_id),
      statusMatricula:
        typeof req.query.status_matricula === 'string'
          ? req.query.status_matricula
          : undefined,
      page,
      limit
    });

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    return handleControllerError(error, res, 'Erro interno ao buscar matrículas');
  }
};

export const criarMatricula = async (req: Request, res: Response) => {
  try {
    const matricula = await matriculasService.criarMatricula(req.body);

    return res.status(201).json({
      success: true,
      data: matricula,
      message: 'Matrícula criada com sucesso'
    });
  } catch (error) {
    return handleControllerError(error, res, 'Erro interno ao criar matrícula');
  }
};

export const obterMatricula = async (req: Request, res: Response) => {
  try {
    const matricula = await matriculasService.obterMatricula(req.params.id as string);

    return res.json({
      success: true,
      data: matricula
    });
  } catch (error) {
    return handleControllerError(error, res, 'Erro interno ao buscar matrícula');
  }
};

export const atualizarMatricula = async (req: Request, res: Response) => {
  try {
    const matricula = await matriculasService.atualizarMatricula(
      req.params.id as string,
      req.body
    );

    return res.json({
      success: true,
      data: matricula,
      message: 'Matrícula atualizada com sucesso'
    });
  } catch (error) {
    return handleControllerError(error, res, 'Erro interno ao atualizar matrícula');
  }
};

export const verificarElegibilidade = async (req: Request, res: Response) => {
  try {
    const resultado = await matriculasService.verificarElegibilidade(
      req.body.beneficiaria_id,
      req.body.projeto_id
    );

    return res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    return handleControllerError(error, res, 'Erro interno ao verificar elegibilidade');
  }
};
