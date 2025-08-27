import { BeneficiariasRepository } from '../repositories/BeneficiariasRepository';
import { Beneficiaria, BeneficiariaFiltros, BeneficiariaResumo } from '../types/beneficiarias';
import { AppError } from '../utils/AppError';
import { PaginatedResponse, PaginationParams } from '../utils/pagination';
import { logger } from '../config/logger';

export class BeneficiariasService {
  constructor(private repository: BeneficiariasRepository) {}

  async create(data: Omit<Beneficiaria, 'id' | 'data_criacao' | 'data_atualizacao'>): Promise<Beneficiaria> {
    try {
      const beneficiaria = await this.repository.criar(data);

      logger.info('Beneficiária criada', {
        id: beneficiaria.id,
        nome: beneficiaria.nome_completo,
        usuario: data.usuario_criacao
      });

      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao criar beneficiária:', { error, data });
      throw error;
    }
  }

  async update(
    id: number,
    data: Partial<Omit<Beneficiaria, 'id' | 'data_criacao' | 'data_atualizacao'>>,
    usuarioAtualizacao: number
  ): Promise<Beneficiaria> {
    try {
      const beneficiaria = await this.repository.atualizar(id, data, usuarioAtualizacao);

      logger.info('Beneficiária atualizada', {
        id: beneficiaria.id,
        nome: beneficiaria.nome_completo,
        usuario: usuarioAtualizacao
      });

      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao atualizar beneficiária:', { error, id, data });
      throw error;
    }
  }

  async findById(id: number): Promise<Beneficiaria> {
    try {
      return await this.repository.buscarPorId(id);
    } catch (error) {
      logger.error('Erro ao buscar beneficiária:', { error, id });
      throw error;
    }
  }

  async list(
    filtros: BeneficiariaFiltros,
    paginacao: PaginationParams
  ): Promise<PaginatedResponse<Beneficiaria>> {
    try {
      return await this.repository.listar(filtros, paginacao);
    } catch (error) {
      logger.error('Erro ao listar beneficiárias:', { error, filtros, paginacao });
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.repository.excluir(id);
      logger.info('Beneficiária excluída', { id });
    } catch (error) {
      logger.error('Erro ao excluir beneficiária:', { error, id });
      throw error;
    }
  }

  async getResumo(id: number): Promise<BeneficiariaResumo> {
    try {
      return await this.repository.buscarResumo(id);
    } catch (error) {
      logger.error('Erro ao buscar resumo da beneficiária:', { error, id });
      throw error;
    }
  }
}
