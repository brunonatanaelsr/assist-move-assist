import { Pool } from 'pg';
import type { RedisClient } from '../lib/redis';
import { BeneficiariasRepository } from '../repositories/beneficiariasRepository';
import { logger, loggerService } from '../services/logger';
import { AppError } from '../utils';
import { formatObjectDates } from '../utils/dateFormatter';
import { validateBeneficiaria } from '../validators/beneficiaria.validator';
import { withCache } from '../utils/redisCache';
import { cacheService } from './cache.service';

interface ListBeneficiariasParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  bairro?: string;
}

interface Beneficiaria {
  id: number;
  nome_completo: string;
  cpf: string;
  data_nascimento: Date;
  telefone: string;
  email?: string;
  status: string;  
  created_at: Date;
  updated_at: Date;
}

interface BeneficiariaInput {
  nome_completo: string;
  cpf: string;
  data_nascimento: Date;
  telefone: string;
  email?: string;
}

export class BeneficiariasService {
  constructor(
    private readonly db: Pool,
    private readonly redis: RedisClient,
    private readonly beneficiariasRepository: BeneficiariasRepository = new BeneficiariasRepository(db)
  ) {}

  private formatBeneficiariaWithRelations(beneficiaria: any) {
    if (!beneficiaria) {
      return beneficiaria;
    }

    const beneficiariaFormatada = formatObjectDates(
      beneficiaria as unknown as Record<string, unknown>,
      ['data_nascimento', 'rg_data_emissao', 'created_at', 'updated_at'] as any
    ) as typeof beneficiaria;

    const familiaresFormatados = beneficiariaFormatada.familiares?.map((familiar: any) =>
      formatObjectDates(familiar as unknown as Record<string, unknown>, ['data_nascimento'] as any)
    ) ?? [];

    return {
      ...beneficiariaFormatada,
      familiares: familiaresFormatados
    };
  }

  async searchBeneficiarias(searchTerm: string, limit = 10) {
    const term = searchTerm.trim();

    if (!term) {
      return [];
    }

    const cacheKey = `beneficiarias:search:${term.toLowerCase()}:${limit}`;

    return withCache(cacheKey, async () => {
      const likeTerm = `%${term}%`;

      const { rows } = await this.db.query(
        `
          SELECT
            b.id,
            b.nome_completo,
            b.cpf,
            b.status,
            b.created_at,
            b.updated_at
          FROM beneficiarias b
          WHERE
            b.deleted_at IS NULL
            AND (b.nome_completo ILIKE $1 OR b.cpf ILIKE $2)
          ORDER BY b.nome_completo ASC
          LIMIT $3
        `,
        [likeTerm, likeTerm, limit]
      );

      return rows;
    }, 60);
  }

  async listar({
    search = '',
    status = 'ATIVO',
    page = 1,
    limit = 10,
    bairro
  }: ListBeneficiariasParams = {}) {
    try {
      // Usar cache para consultas frequentes
      const cacheKey = `beneficiarias:list:${search}:${status}:${page}:${limit}:${bairro}`;
      
      return await withCache(cacheKey, async () => {
        const offset = (page - 1) * limit;
        const params: any[] = [];
        let query = `
          SELECT b.*, e.bairro
          FROM beneficiarias b
          LEFT JOIN enderecos e ON e.beneficiaria_id = b.id
          WHERE 1=1
        `;

        if (search) {
          params.push(`%${search}%`);
          query += ` AND (b.nome_completo ILIKE $${params.length} OR b.cpf ILIKE $${params.length})`;
        }

        if (status) {
          params.push(status);
          query += ` AND b.status = $${params.length}`;
        }

        if (bairro) {
          params.push(`%${bairro}%`);
          query += ` AND e.bairro ILIKE $${params.length}`;
        }

        // Contar total antes da paginação
        const countQuery = query.replace('b.*, e.bairro', 'COUNT(*) as total');
        const { total } = (await this.db.query(countQuery, params)).rows[0];

        // Adicionar ordenação e paginação
        query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const { rows: beneficiarias } = await this.db.query(query, params);

        return {
          beneficiarias,
          pagination: {
            page,
            limit,
            total: parseInt(total),
            pages: Math.ceil(total / limit)
          }
        };
      }, 300); // Cache por 5 minutos

    } catch (error) {
      logger.error('Erro ao listar beneficiárias:', { error });
      throw new AppError('Erro ao listar beneficiárias', 500);
    }
  }

  async criar(data: BeneficiariaInput) {
    try {
      // Validar dados
      const validatedData = await validateBeneficiaria(data);

      // Verificar CPF duplicado
      const existingCPF = await this.db.query(
        'SELECT id FROM beneficiarias WHERE cpf = $1',
        [validatedData.cpf]
      );

      if (existingCPF.rows.length) {
        throw new AppError('CPF já cadastrado', 400);
      }

      // Inserir beneficiária
      const query = `
        INSERT INTO beneficiarias (
          nome_completo,
          cpf,
          data_nascimento,
          telefone,
          email,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'ATIVO', NOW(), NOW())
        RETURNING *
      `;

      const { rows: [beneficiaria] } = await this.db.query(query, [
        validatedData.nome_completo,
        validatedData.cpf,
        validatedData.data_nascimento,
        validatedData.telefone,
        validatedData.email
      ]);

      // Invalidar cache
      await cacheService.deletePattern('beneficiarias:list:*');

      return beneficiaria;

    } catch (error) {
      logger.error('Erro ao criar beneficiária:', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Erro ao criar beneficiária', 500);
    }
  }

  async atualizar(id: number, data: Partial<BeneficiariaInput>) {
    try {
      // Verificar se existe
      const existingBeneficiaria = await this.db.query(
        'SELECT id FROM beneficiarias WHERE id = $1',
        [id]
      );

      if (!existingBeneficiaria.rows.length) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      // Validar dados parciais
      const validatedData = await validateBeneficiaria(data, true);

      // Montar query dinâmica
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(validatedData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (!fields.length) {
        throw new AppError('Nenhum dado para atualizar', 400);
      }

      values.push(id);
      const query = `
        UPDATE beneficiarias 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const { rows: [beneficiaria] } = await this.db.query(query, values);

      // Invalidar cache
      await cacheService.deletePattern('beneficiarias:list:*');

      return beneficiaria;

    } catch (error) {
      logger.error('Erro ao atualizar beneficiária:', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Erro ao atualizar beneficiária', 500);
    }
  }

  async excluir(id: number) {
    try {
      const result = await this.db.query(
        'UPDATE beneficiarias SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
        ['INATIVO', id]
      );

      if (!result.rows.length) {
        throw new AppError('Beneficiária não encontrada', 404);
      }

      // Invalidar cache
      await cacheService.deletePattern('beneficiarias:list:*');

      return { success: true };

    } catch (error) {
      logger.error('Erro ao excluir beneficiária:', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Erro ao excluir beneficiária', 500);
    }
  }

  async listarAtivas(page: number = 1, limit: number = 10) {
    return this.beneficiariasRepository.listarAtivas(page, limit);
  }

  async obterDetalhes(id: number) {
    const beneficiaria = await this.beneficiariasRepository.findWithRelations(id);

    if (!beneficiaria) {
      throw new AppError('Beneficiária não encontrada', 404);
    }

    return this.formatBeneficiariaWithRelations(beneficiaria);
  }

  async obterResumo(id: number) {
    return this.beneficiariasRepository.getResumo(id);
  }

  async obterAtividades(id: number, page: number, limit: number) {
    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    const data = await this.beneficiariasRepository.getAtividades(id, limit, offset);

    return {
      data,
      pagination: {
        page,
        limit,
        total: null
      }
    };
  }

  async criarCompleta(payload: any, userId?: number) {
    const parsed = await validateBeneficiaria(payload);
    const { familiares, vulnerabilidades, ...beneficiariaPayload } = parsed;

    if (beneficiariaPayload.cpf) {
      const existingBeneficiaria = await this.beneficiariasRepository.findByCPF(beneficiariaPayload.cpf);

      if (existingBeneficiaria) {
        throw new AppError('CPF já cadastrado', 400);
      }
    }

    const beneficiariaData = Object.fromEntries(
      Object.entries(beneficiariaPayload).filter(([, value]) => value !== undefined && value !== null)
    );

    const beneficiaria = await this.beneficiariasRepository.createWithRelations(
      beneficiariaData as any,
      familiares,
      vulnerabilidades
    );

    await cacheService.deletePattern('beneficiarias:list:*');

    if (userId) {
      loggerService.audit('BENEFICIARIA_CREATED', userId, {
        beneficiaria_id: beneficiaria.id
      });
    }

    return this.formatBeneficiariaWithRelations(beneficiaria);
  }

  async atualizarCompleta(id: number, payload: any, userId?: number) {
    const existingBeneficiaria = await this.beneficiariasRepository.findById(id);

    if (!existingBeneficiaria) {
      throw new AppError('Beneficiária não encontrada', 404);
    }

    const parsedUpdate = await validateBeneficiaria(payload, true);
    const { familiares, vulnerabilidades, ...beneficiariaPayload } = parsedUpdate;

    if (beneficiariaPayload.cpf && beneficiariaPayload.cpf !== existingBeneficiaria.cpf) {
      const cpfExists = await this.beneficiariasRepository.findByCPF(beneficiariaPayload.cpf);
      if (cpfExists && cpfExists.id !== id) {
        throw new AppError('CPF já cadastrado para outra beneficiária', 400);
      }
    }

    const sanitized = Object.fromEntries(
      Object.entries(beneficiariaPayload).filter(([, value]) => value !== undefined && value !== null)
    );

    const beneficiaria = await this.beneficiariasRepository.updateWithRelations(
      id,
      sanitized as any,
      familiares,
      vulnerabilidades
    );

    await cacheService.deletePattern('beneficiarias:list:*');

    if (userId) {
      loggerService.audit('BENEFICIARIA_UPDATED', userId, {
        beneficiaria_id: id,
        changes: sanitized
      });
    }

    return this.formatBeneficiariaWithRelations(beneficiaria);
  }

  async remover(id: number, userId?: number) {
    const existingBeneficiaria = await this.beneficiariasRepository.findById(id);

    if (!existingBeneficiaria) {
      throw new AppError('Beneficiária não encontrada', 404);
    }

    await this.beneficiariasRepository.softDelete(id);

    await cacheService.deletePattern('beneficiarias:list:*');

    if (userId) {
      loggerService.audit('BENEFICIARIA_DELETED', userId, {
        beneficiaria_id: id
      });
    }

    return { message: 'Beneficiária removida com sucesso' };
  }
}
