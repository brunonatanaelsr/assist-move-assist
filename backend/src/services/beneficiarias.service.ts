import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { logger } from '../services/logger';
import { AppError } from '../utils';
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
  data_nascimento: string;
  telefone: string;
  email?: string;
}

export class BeneficiariasService {
  constructor(
    private readonly db: Pool,
    private readonly redis: Redis
  ) {}

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
}
