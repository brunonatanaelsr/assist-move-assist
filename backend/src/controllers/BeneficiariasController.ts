import { Request, Response, NextFunction } from 'express';
import { BeneficiariasRepository } from '../repositories/BeneficiariasRepository';
import { beneficiariaSchema } from '../types/beneficiarias';
import { AppError } from '../utils/AppError';
import { calculatePagination } from '../utils/pagination';

export class BeneficiariasController {
  constructor(private repository: BeneficiariasRepository) {}

  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = beneficiariaSchema.parse(req.body);

      const beneficiaria = await this.repository.criar({
        ...validatedData,
        usuario_criacao: req.user.id,
        usuario_atualizacao: req.user.id,
        ativo: true
      });

      res.status(201).json(beneficiaria);
    } catch (error) {
      next(error);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = beneficiariaSchema.partial().parse(req.body);

      const beneficiaria = await this.repository.atualizar(
        Number(id),
        validatedData,
        req.user.id
      );

      res.json(beneficiaria);
    } catch (error) {
      next(error);
    }
  }

  async buscarPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const beneficiaria = await this.repository.buscarPorId(Number(id));
      res.json(beneficiaria);
    } catch (error) {
      next(error);
    }
  }

  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        search,
        status,
        data_inicio,
        data_fim,
        escolaridade,
        renda_min,
        renda_max,
        page,
        limit
      } = req.query;

      const filtros = {
        search: search as string,
        status: status as any,
        data_inicio: data_inicio ? new Date(data_inicio as string) : undefined,
        data_fim: data_fim ? new Date(data_fim as string) : undefined,
        escolaridade: escolaridade as string,
        renda_min: renda_min ? Number(renda_min) : undefined,
        renda_max: renda_max ? Number(renda_max) : undefined
      };

      const paginacao = calculatePagination({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined
      });

      const beneficiarias = await this.repository.listar(filtros, paginacao);
      res.json(beneficiarias);
    } catch (error) {
      next(error);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await this.repository.excluir(Number(id));
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  async buscarResumo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const resumo = await this.repository.buscarResumo(Number(id));
      res.json(resumo);
    } catch (error) {
      next(error);
    }
  }
}
