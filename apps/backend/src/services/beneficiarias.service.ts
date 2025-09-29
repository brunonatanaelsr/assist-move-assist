import { Pool } from 'pg';
import type { RedisClient } from '../lib/redis';
import { BeneficiariasRepository } from '../repositories/beneficiariasRepository';
import { logger } from '../services/logger';
import { AppError, BaseError } from '../utils';
import { cacheService } from './cache.service';
import { validateBeneficiaria } from '../validators/beneficiaria.validator';
import type { BeneficiariaDetalhada } from '../models/beneficiaria';
import type {
  Beneficiaria,
  BeneficiariaAtividadeLista,
  BeneficiariaCreatePayload,
  BeneficiariaDependente,
  BeneficiariaInfoSocioeconomica,
  BeneficiariaResumoDetalhado,
  BeneficiariaUpdatePayload
} from '../types/beneficiarias';

interface ListBeneficiariasParams {
  page?: number;
  limit?: number;
  filtros?: {
    status?: 'ativa' | 'inativa' | 'em_acompanhamento' | 'pendente' | 'desistente';
    medida_protetiva?: boolean;
    tipo_violencia?: string[];
    data_inicio?: Date;
    data_fim?: Date;
    search?: string;
  };
}

export class BeneficiariasService {
  private readonly repository: BeneficiariasRepository;

  constructor(
    repositoryOrPool: BeneficiariasRepository | Pool,
    // Mantém o parâmetro redis para compatibilidade com instâncias existentes
    _redis?: RedisClient,
    repositoryOverride?: BeneficiariasRepository
  ) {
    this.repository = repositoryOverride
      ? repositoryOverride
      : repositoryOrPool instanceof BeneficiariasRepository
        ? repositoryOrPool
        : new BeneficiariasRepository(repositoryOrPool);
  }

  async searchBeneficiarias(searchTerm: string, limit = 10): Promise<Beneficiaria[]> {
    const term = searchTerm.trim();

    if (!term) {
      return [];
    }

    const cacheKey = `beneficiarias:search:${term.toLowerCase()}:${limit}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const rows = await this.repository.buscarPorTexto(term, limit);
        return rows.slice(0, limit);
      },
      60
    );
  }

  async listarAtivas({ page = 1, limit = 10, filtros }: ListBeneficiariasParams = {}) {
    const cacheKey = `beneficiarias:list:${page}:${limit}:${JSON.stringify(filtros ?? {})}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.repository.listarAtivas(page, limit, filtros);
      },
      300
    );
  }

  async getDetalhes(id: number): Promise<BeneficiariaDetalhada> {
    const beneficiaria = await this.repository.findWithRelations(id);
    if (!beneficiaria) {
      throw new AppError('Beneficiária não encontrada', 404);
    }
    return beneficiaria;
  }

  async getResumo(id: number): Promise<BeneficiariaResumoDetalhado> {
    const cacheKey = `beneficiarias:${id}:resumo`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const resumo = await this.repository.getResumo(id);
        if (!resumo) {
          throw new AppError('Beneficiária não encontrada', 404);
        }
        return resumo;
      },
      300
    );
  }

  async getAtividades(
    id: number,
    page: number = 1,
    limit: number = 20
  ): Promise<BeneficiariaAtividadeLista> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const cacheKey = `beneficiarias:${id}:atividades:${safePage}:${safeLimit}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const resumo = await this.repository.getResumo(id);
        if (!resumo) {
          throw new AppError('Beneficiária não encontrada', 404);
        }
        return this.repository.getAtividades(id, safePage, safeLimit);
      },
      120
    );
  }

  async createBeneficiaria(
    data: BeneficiariaCreatePayload,
    options: { skipValidation?: boolean } = {}
  ): Promise<BeneficiariaDetalhada> {
    try {
      const { skipValidation = false } = options;
      const validated = skipValidation ? data : await validateBeneficiaria(data as any);
      const { familiares, vulnerabilidades, ...beneficiariaPayload } = validated;

      if (beneficiariaPayload.cpf) {
        const existing = await this.repository.findByCPF(beneficiariaPayload.cpf);
        if (existing) {
          throw new AppError('CPF já cadastrado', 400);
        }
      }

      const beneficiaria = await this.repository.createWithRelations(
        beneficiariaPayload as any,
        familiares,
        vulnerabilidades
      );

      await this.invalidateCaches(beneficiaria.id);

      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao criar beneficiária:', { error });
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof BaseError) {
        throw new AppError(error.message, error.status);
      }
      throw new AppError('Erro ao criar beneficiária', 500);
    }
  }

  async updateBeneficiaria(
    id: number,
    data: BeneficiariaUpdatePayload,
    options: { skipValidation?: boolean } = {}
  ): Promise<BeneficiariaDetalhada> {
    try {
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      const { skipValidation = false } = options;
      const validated = skipValidation ? data : await validateBeneficiaria(data as any, true);
      const { familiares, vulnerabilidades, ...payload } = validated;

      if (payload.cpf && payload.cpf !== existing.cpf) {
        const cpfExists = await this.repository.findByCPF(payload.cpf);
        if (cpfExists && cpfExists.id !== id) {
          throw new AppError('CPF já cadastrado para outra beneficiária', 400);
        }
      }

      const sanitized = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
      );

      const beneficiaria = await this.repository.updateWithRelations(
        id,
        sanitized as any,
        familiares,
        vulnerabilidades
      );

      await this.invalidateCaches(id);

      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao atualizar beneficiária:', { error });
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof BaseError) {
        throw new AppError(error.message, error.status);
      }
      throw new AppError('Erro ao atualizar beneficiária', 500);
    }
  }

  async deleteBeneficiaria(id: number): Promise<void> {
    try {
      await this.repository.softDelete(id);
      await this.invalidateCaches(id);
    } catch (error) {
      logger.error('Erro ao excluir beneficiária:', { error });
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof BaseError) {
        throw new AppError(error.message, error.status);
      }
      throw new AppError('Erro ao excluir beneficiária', 500);
    }
  }

  async findByCPF(cpf: string) {
    return this.repository.findByCPF(cpf);
  }

  async buscarPorId(id: number): Promise<Beneficiaria> {
    return this.repository.buscarPorId(id);
  }

  async arquivarBeneficiaria(id: number): Promise<Beneficiaria> {
    try {
      await this.repository.buscarPorId(id);
      const beneficiaria = await this.repository.arquivar(id);
      await this.invalidateCaches(id);
      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao arquivar beneficiária:', { error });
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof BaseError) {
        throw new AppError(error.message, error.status);
      }
      throw new AppError('Erro ao arquivar beneficiária', 500);
    }
  }

  async atualizarInfoSocioeconomica(
    id: number,
    info: Partial<BeneficiariaInfoSocioeconomica>
  ): Promise<BeneficiariaDetalhada> {
    try {
      await this.repository.buscarPorId(id);
      await this.repository.upsertInfoSocioeconomica(id, info);
      await this.invalidateCaches(id);

      const beneficiaria = await this.repository.findWithRelations(id);
      if (!beneficiaria) {
        throw new AppError('Beneficiária não encontrada', 404);
      }
      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao atualizar informações socioeconômicas:', { error });
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof BaseError) {
        throw new AppError(error.message, error.status);
      }
      throw new AppError('Erro ao atualizar informações socioeconômicas', 500);
    }
  }

  async adicionarDependente(
    id: number,
    dependente: Omit<BeneficiariaDependente, 'id' | 'created_at' | 'updated_at'>
  ): Promise<BeneficiariaDetalhada> {
    try {
      await this.repository.buscarPorId(id);
      await this.repository.addDependente(id, dependente);
      await this.invalidateCaches(id);
      const beneficiaria = await this.repository.findWithRelations(id);
      if (!beneficiaria) {
        throw new AppError('Beneficiária não encontrada', 404);
      }
      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao adicionar dependente:', { error });
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof BaseError) {
        throw new AppError(error.message, error.status);
      }
      throw new AppError('Erro ao adicionar dependente', 500);
    }
  }

  async removerDependente(id: number, dependenteId: number): Promise<void> {
    try {
      await this.repository.buscarPorId(id);
      await this.repository.removeDependente(id, dependenteId);
      await this.invalidateCaches(id);
    } catch (error) {
      logger.error('Erro ao remover dependente:', { error });
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof BaseError) {
        throw new AppError(error.message, error.status);
      }
      throw new AppError('Erro ao remover dependente', 500);
    }
  }

  async adicionarAtendimento(
    id: number,
    atendimento: {
      tipo: string;
      data: Date;
      descricao: string;
      encaminhamentos?: string | null;
      profissional_id?: number | null;
    }
  ): Promise<BeneficiariaDetalhada> {
    try {
      await this.repository.buscarPorId(id);
      await this.repository.addAtendimento(id, atendimento);
      await this.invalidateCaches(id);
      const beneficiaria = await this.repository.findWithRelations(id);
      if (!beneficiaria) {
        throw new AppError('Beneficiária não encontrada', 404);
      }
      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao adicionar atendimento:', { error });
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof BaseError) {
        throw new AppError(error.message, error.status);
      }
      throw new AppError('Erro ao adicionar atendimento', 500);
    }
  }

  async atualizarFoto(
    id: number,
    filename: string
  ): Promise<Beneficiaria> {
    try {
      await this.repository.buscarPorId(id);
      const beneficiaria = await this.repository.updateFoto(id, filename);
      await this.invalidateCaches(id);
      return beneficiaria;
    } catch (error) {
      logger.error('Erro ao atualizar foto da beneficiária:', { error });
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof BaseError) {
        throw new AppError(error.message, error.status);
      }
      throw new AppError('Erro ao atualizar foto da beneficiária', 500);
    }
  }

  private async invalidateCaches(id?: number) {
    const tasks = [cacheService.deletePattern('beneficiarias:list:*')];
    if (id) {
      tasks.push(cacheService.deletePattern(`beneficiarias:${id}:*`));
    }
    await Promise.all(tasks);
  }
}
