import { OficinaRepository } from '../repositories/OficinaRepository';
import { Oficina } from '../types/shared';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class OficinaService {
  private repository: OficinaRepository;

  constructor() {
    this.repository = new OficinaRepository();
  }

  async listarOficinas(params: {
    page?: number;
    limit?: number;
    status?: string;
    data_inicio?: string;
    data_fim?: string;
  }) {
    try {
      return await this.repository.listar(params);
    } catch (error) {
      logger.error('Erro ao listar oficinas:', error);
      throw new AppError('Erro ao listar oficinas', 500);
    }
  }

  async buscarOficina(id: number) {
    try {
      const oficina = await this.repository.buscarPorId(id);
      if (!oficina) {
        throw new AppError('Oficina não encontrada', 404);
      }
      return oficina;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Erro ao buscar oficina:', error);
      throw new AppError('Erro ao buscar oficina', 500);
    }
  }

  async criarOficina(data: Partial<Oficina>) {
    try {
      // Validações
      if (!data.titulo) {
        throw new AppError('Título é obrigatório', 400);
      }
      if (!data.data_oficina) {
        throw new AppError('Data da oficina é obrigatória', 400);
      }
      if (!data.horario_inicio || !data.horario_fim) {
        throw new AppError('Horários são obrigatórios', 400);
      }

      // Validar horários
      const inicio = new Date(`2000-01-01 ${data.horario_inicio}`);
      const fim = new Date(`2000-01-01 ${data.horario_fim}`);
      if (fim <= inicio) {
        throw new AppError('Horário de fim deve ser maior que horário de início', 400);
      }

      return await this.repository.criar(data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Erro ao criar oficina:', error);
      throw new AppError('Erro ao criar oficina', 500);
    }
  }

  async atualizarOficina(id: number, data: Partial<Oficina>) {
    try {
      // Verificar se oficina existe
      await this.buscarOficina(id);

      // Validar horários se fornecidos
      if (data.horario_inicio && data.horario_fim) {
        const inicio = new Date(`2000-01-01 ${data.horario_inicio}`);
        const fim = new Date(`2000-01-01 ${data.horario_fim}`);
        if (fim <= inicio) {
          throw new AppError('Horário de fim deve ser maior que horário de início', 400);
        }
      }

      return await this.repository.atualizar(id, data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Erro ao atualizar oficina:', error);
      throw new AppError('Erro ao atualizar oficina', 500);
    }
  }

  async excluirOficina(id: number) {
    try {
      // Verificar se oficina existe
      await this.buscarOficina(id);
      
      await this.repository.excluir(id);
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Erro ao excluir oficina:', error);
      throw new AppError('Erro ao excluir oficina', 500);
    }
  }

  async registrarPresenca(oficinaId: number, beneficiariaId: number, presente: boolean, observacoes?: string) {
    try {
      // Verificar se oficina existe
      const oficina = await this.buscarOficina(oficinaId);

      // Verificar status da oficina
      if (oficina.status === 'cancelada') {
        throw new AppError('Não é possível registrar presença em oficina cancelada', 400);
      }

      // Verificar capacidade máxima
      if (presente) {
        const presencas = await this.repository.listarPresencas(oficinaId);
        const totalPresentes = presencas.filter(p => p.presente).length;
        
        if (totalPresentes >= oficina.capacidade_maxima) {
          throw new AppError('Capacidade máxima da oficina atingida', 400);
        }
      }

      return await this.repository.registrarPresenca(
        oficinaId,
        beneficiariaId,
        presente,
        observacoes
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Erro ao registrar presença:', error);
      throw new AppError('Erro ao registrar presença', 500);
    }
  }

  async listarPresencas(oficinaId: number) {
    try {
      // Verificar se oficina existe
      await this.buscarOficina(oficinaId);
      
      return await this.repository.listarPresencas(oficinaId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Erro ao listar presenças:', error);
      throw new AppError('Erro ao listar presenças', 500);
    }
  }
}
