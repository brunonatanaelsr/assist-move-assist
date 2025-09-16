// Arquivo temporário para o conteúdo correto
import { BaseRepository } from './base.repository';
import { Beneficiaria, CreateBeneficiariaDTO, UpdateBeneficiariaDTO } from '../models/beneficiaria.model';
import { query } from '../config/database';
import { logger } from '../services/logger';

interface EstatisticasBeneficiarias {
    total: number;
    porStatus: { [key: string]: number };
    porCidade: { [key: string]: number };
    porEstado: { [key: string]: number };
    mediaIdade: number;
}

export class BeneficiariaRepository extends BaseRepository<Beneficiaria> {
    constructor() {
        super('beneficiarias', true); // Habilitamos soft delete
    }

    // Método para criar uma nova beneficiária com validações
    async create(data: CreateBeneficiariaDTO): Promise<Beneficiaria> {
        try {
            // Verifica se já existe uma beneficiária com o mesmo CPF
            const existingBeneficiaria = await this.findByCPF(data.cpf);
            if (existingBeneficiaria) {
                throw new Error('Já existe uma beneficiária cadastrada com este CPF');
            }

            return super.create(data);
        } catch (error) {
            logger.error('Erro ao criar beneficiária:', error);
            throw error;
        }
    }

    // Método para buscar por CPF
    async findByCPF(cpf: string): Promise<Beneficiaria | null> {
        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE cpf = $1 AND deleted_at IS NULL
        `;

        try {
            const result = await query<Beneficiaria>(sql, [cpf]);
            return result[0] || null;
        } catch (error) {
            logger.error('Erro ao buscar beneficiária por CPF:', error);
            throw error;
        }
    }

    // Método para buscar por status
    async findByStatus(status: Beneficiaria['status']): Promise<Beneficiaria[]> {
        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE status = $1 AND deleted_at IS NULL
            ORDER BY nome
        `;

        try {
            return await query<Beneficiaria>(sql, [status]);
        } catch (error) {
            logger.error('Erro ao buscar beneficiárias por status:', error);
            throw error;
        }
    }

    // Método para busca avançada
    async search(params: {
        nome?: string;
        cpf?: string;
        cidade?: string;
        estado?: string;
        status?: Beneficiaria['status'];
        dataInicio?: Date;
        dataFim?: Date;
    }): Promise<Beneficiaria[]> {
        const conditions: string[] = ['deleted_at IS NULL'];
        const values: any[] = [];
        let paramCount = 1;

        if (params.nome) {
            conditions.push(`nome ILIKE $${paramCount}`);
            values.push(`%${params.nome}%`);
            paramCount++;
        }

        if (params.cpf) {
            conditions.push(`cpf LIKE $${paramCount}`);
            values.push(`%${params.cpf.replace(/\D/g, '')}%`);
            paramCount++;
        }

        if (params.cidade) {
            conditions.push(`cidade ILIKE $${paramCount}`);
            values.push(`%${params.cidade}%`);
            paramCount++;
        }

        if (params.estado) {
            conditions.push(`estado = $${paramCount}`);
            values.push(params.estado.toUpperCase());
            paramCount++;
        }

        if (params.status) {
            conditions.push(`status = $${paramCount}`);
            values.push(params.status);
            paramCount++;
        }

        if (params.dataInicio) {
            conditions.push(`data_nascimento >= $${paramCount}`);
            values.push(params.dataInicio);
            paramCount++;
        }

        if (params.dataFim) {
            conditions.push(`data_nascimento <= $${paramCount}`);
            values.push(params.dataFim);
            paramCount++;
        }

        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE ${conditions.join(' AND ')}
            ORDER BY nome
            LIMIT 100
        `;

        try {
            return await query<Beneficiaria>(sql, values);
        } catch (error) {
            logger.error('Erro na busca avançada de beneficiárias:', error);
            throw error;
        }
    }

    // Método para buscar beneficiárias por usuário responsável
    async findByUsuario(usuarioId: number): Promise<Beneficiaria[]> {
        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE usuario_id = $1 AND deleted_at IS NULL
            ORDER BY nome
        `;

        try {
            return await query<Beneficiaria>(sql, [usuarioId]);
        } catch (error) {
            logger.error('Erro ao buscar beneficiárias por usuário:', error);
            throw error;
        }
    }

    // Método para estatísticas
    async getEstatisticas(): Promise<EstatisticasBeneficiarias> {
        const sql = `
            WITH estatisticas AS (
                SELECT 
                    COUNT(*) as total,
                    status,
                    cidade,
                    estado,
                    AVG(EXTRACT(YEAR FROM age(data_nascimento))) as media_idade,
                    COUNT(*) FILTER (WHERE status = 'ativa') as ativas,
                    COUNT(*) FILTER (WHERE status = 'inativa') as inativas,
                    COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
                    COUNT(*) FILTER (WHERE status = 'desistente') as desistentes
                FROM ${this.tableName}
                WHERE deleted_at IS NULL
                GROUP BY status, cidade, estado
            )
            SELECT 
                SUM(total) as total,
                JSON_AGG(DISTINCT jsonb_build_object(
                    'status', status,
                    'total', COUNT(*)
                )) as por_status,
                JSON_AGG(DISTINCT jsonb_build_object(
                    'cidade', cidade,
                    'total', COUNT(*)
                )) as por_cidade,
                JSON_AGG(DISTINCT jsonb_build_object(
                    'estado', estado,
                    'total', COUNT(*)
                )) as por_estado,
                AVG(media_idade) as media_idade
            FROM estatisticas;
        `;

        try {
            const result = await query<any>(sql);
            const data = result[0];

            return {
                total: parseInt(data.total) || 0,
                porStatus: data.por_status?.reduce((acc: any, curr: any) => {
                    acc[curr.status] = curr.total;
                    return acc;
                }, {}) || {},
                porCidade: data.por_cidade?.reduce((acc: any, curr: any) => {
                    if (curr.cidade) {
                        acc[curr.cidade] = curr.total;
                    }
                    return acc;
                }, {}) || {},
                porEstado: data.por_estado?.reduce((acc: any, curr: any) => {
                    if (curr.estado) {
                        acc[curr.estado] = curr.total;
                    }
                    return acc;
                }, {}) || {},
                mediaIdade: parseFloat(data.media_idade) || 0
            };
        } catch (error) {
            logger.error('Erro ao obter estatísticas das beneficiárias:', error);
            throw error;
        }
    }
}
