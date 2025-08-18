import { Request, Response } from 'express';
import { visaoHolisticaService } from '../services/visaoHolistica.service';
import { loggerService } from '../services/logger';

class VisaoHolisticaController {
  async create(req: Request, res: Response) {
    try {
      const data = req.body;
      const result = await visaoHolisticaService.create({
        ...data,
        data_avaliacao: data.data_avaliacao ? new Date(data.data_avaliacao) : new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      loggerService.error('Erro ao salvar visão holística:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  async get(req: Request, res: Response) {
    try {
      const { beneficiariaId } = req.params;
      const data = await visaoHolisticaService.findByBeneficiaria(Number(beneficiariaId));
      if (!data) {
        return res.status(404).json({ success: false, message: 'Visão holística não encontrada' });
      }
      res.json({ success: true, data });
    } catch (error) {
      loggerService.error('Erro ao buscar visão holística:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }
}

export const visaoHolisticaController = new VisaoHolisticaController();
export default visaoHolisticaController;
