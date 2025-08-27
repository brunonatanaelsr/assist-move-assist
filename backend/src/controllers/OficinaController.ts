import { Request, Response } from 'express';
import { OficinaService } from '../services/OficinaService';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class OficinaController {
  private service: OficinaService;

  constructor() {
    this.service = new OficinaService();
  }

  async listar(req: Request, res: Response) {
    try {
      const oficinas = await this.service.listarOficinas({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        status: req.query.status as string,
        data_inicio: req.query.data_inicio as string,
        data_fim: req.query.data_fim as string
      });
      
      res.json(oficinas);
    } catch (error) {
      logger.error('Erro ao listar oficinas:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const oficina = await this.service.buscarOficina(Number(id));
      res.json(oficina);
    } catch (error) {
      logger.error('Erro ao buscar oficina:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const oficina = await this.service.criarOficina(req.body);
      res.status(201).json(oficina);
    } catch (error) {
      logger.error('Erro ao criar oficina:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const oficina = await this.service.atualizarOficina(Number(id), req.body);
      res.json(oficina);
    } catch (error) {
      logger.error('Erro ao atualizar oficina:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.service.excluirOficina(Number(id));
      res.status(204).send();
    } catch (error) {
      logger.error('Erro ao excluir oficina:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async registrarPresenca(req: Request, res: Response) {
    try {
      const { oficina_id, beneficiaria_id } = req.params;
      const { presente, observacoes } = req.body;

      const presenca = await this.service.registrarPresenca(
        Number(oficina_id),
        Number(beneficiaria_id),
        presente,
        observacoes
      );

      res.json(presenca);
    } catch (error) {
      logger.error('Erro ao registrar presença:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async listarPresencas(req: Request, res: Response) {
    try {
      const { oficina_id } = req.params;
      const presencas = await this.service.listarPresencas(Number(oficina_id));
      res.json(presencas);
    } catch (error) {
      logger.error('Erro ao listar presenças:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }
}
