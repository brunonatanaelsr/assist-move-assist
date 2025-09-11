import { Request, Response, NextFunction } from 'express';
import { loggerService } from '../services/logger';
import { AppError, ValidationError } from '../utils';
import { ParticipacaoService } from '../services/participacao.service';
import pool from '../config/database';
import redis from '../config/redis';

interface CustomRequest {
  query: {
    page?: string;
    limit?: string;
    beneficiaria_id?: string;
    projeto_id?: string;
    oficina_id?: string;
    status?: string;
    data_inicio?: string;
    data_fim?: string;
    search?: string;
  };
  params: {
    id?: string;
  };
  body: any;
};

interface CustomResponse {
  status(code: number): CustomResponse;
  json(data: any): CustomResponse;
  send(): CustomResponse;
};

const participacaoService = new ParticipacaoService(pool, redis);

export const listarParticipacoes = async (req: CustomRequest & Request, res: CustomResponse, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 10,
      beneficiaria_id,
      projeto_id,
      oficina_id,
      status,
      data_inicio,
      data_fim,
      search
    } = req.query;

    const filters = {
      page: Number(page),
      limit: Number(limit),
      beneficiaria_id: beneficiaria_id ? Number(beneficiaria_id) : undefined,
      projeto_id: projeto_id ? Number(projeto_id) : undefined,
      oficina_id: oficina_id ? Number(oficina_id) : undefined,
      status: status ? (status as any) : undefined,
      data_inicio: data_inicio ? new Date(data_inicio) : undefined,
      data_fim: data_fim ? new Date(data_fim) : undefined,
      search: search?.toString()
    };

    const result = await participacaoService.listarParticipacoes(filters);
    return res.json(result);
  } catch (error) {
    loggerService.error('Erro no controller ao listar participações', { error });
    return next(error instanceof AppError ? error : new AppError('Erro interno ao buscar participações', 500));
  }
};

export const criarParticipacao = async (req: CustomRequest & Request, res: CustomResponse, next: NextFunction) => {
  try {
    const participacao = await participacaoService.criarParticipacao(req.body);
    return res.status(201).json(participacao);
  } catch (error: any) {
    loggerService.error('Erro no controller ao criar participação', { error });
    return next(error);
  }
};

export const atualizarParticipacao = async (req: CustomRequest & Request, res: CustomResponse, next: NextFunction) => {
  try {
    const { id } = req.params;
    const participacao = await participacaoService.atualizarParticipacao(Number(id), req.body);
    return res.json(participacao);
  } catch (error: any) {
    loggerService.error('Erro no controller ao atualizar participação', { error });
    return next(error);
  }
};

export const excluirParticipacao = async (req: CustomRequest & Request, res: CustomResponse, next: NextFunction) => {
  try {
    const { id } = req.params;
    await participacaoService.excluirParticipacao(Number(id));
    return res.status(204).send();
  } catch (error: any) {
    loggerService.error('Erro no controller ao excluir participação', { error });
    return next(error);
  }
};

export const registrarPresenca = async (req: CustomRequest & Request, res: CustomResponse, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { presenca } = req.body;
    
    if (presenca === undefined) {
      throw new ValidationError('Percentual de presença é obrigatório');
    }

    const participacao = await participacaoService.registrarPresenca(Number(id), Number(presenca));
    return res.json(participacao);
  } catch (error: any) {
    loggerService.error('Erro no controller ao registrar presença', { error });
    return next(error);
  }
};

export const emitirCertificado = async (req: CustomRequest & Request, res: CustomResponse, next: NextFunction) => {
  try {
    const { id } = req.params;
    const participacao = await participacaoService.emitirCertificado(Number(id));
    return res.json(participacao);
  } catch (error: any) {
    loggerService.error('Erro no controller ao emitir certificado', { error });
    return next(error);
  }
};
