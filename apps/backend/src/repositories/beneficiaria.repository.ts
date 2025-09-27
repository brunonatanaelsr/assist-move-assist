import { Prisma } from '@prisma/client';
import { PaginatedResult, PaginationParams } from './base.repository';
import { Beneficiaria, CreateBeneficiariaDTO, UpdateBeneficiariaDTO } from '../models/beneficiaria.model';
import { prisma } from '../services/prisma';
import { logger } from '../services/logger';

interface EstatisticasBeneficiarias {
    total: number;
    porStatus: { [key: string]: number };
    porCidade: { [key: string]: number };
    porEstado: { [key: string]: number };
    mediaIdade: number;
}

const orderableFields = new Set([
    'id',
    'nome_completo',
    'cpf',
    'cidade',
    'estado',
    'created_at',
    'updated_at',
]);

export class BeneficiariaRepository {
    private readonly softDelete = true;

    private buildOrderBy(field: string, direction: 'ASC' | 'DESC'): Prisma.BeneficiariaOrderByWithRelationInput {
        const normalized = orderableFields.has(field) ? field : 'id';
        const prismaDirection = direction === 'DESC' ? 'desc' : 'asc';
        return { [normalized]: prismaDirection };
    }

    async create(data: CreateBeneficiariaDTO): Promise<Beneficiaria> {
        try {
            const existing = await this.findByCPF(data.cpf);
            if (existing) {
                throw new Error('Já existe uma beneficiária cadastrada com este CPF');
            }

            const created = await prisma.beneficiaria.create({
                data: {
                    ...data,
                    tipo_violencia: data.tipo_violencia ?? [],
                },
            });

            return created as Beneficiaria;
        } catch (error) {
            logger.error('Erro ao criar beneficiária:', error);
            throw error;
        }
    }

    async findById(id: number): Promise<Beneficiaria | null> {
        try {
            const beneficiaria = await prisma.beneficiaria.findFirst({
                where: {
                    id,
                    deleted_at: this.softDelete ? null : undefined,
                },
            });
            return (beneficiaria as Beneficiaria) ?? null;
        } catch (error) {
            logger.error('Erro ao buscar beneficiária por ID:', error);
            throw error;
        }
    }

    async findAll(params: PaginationParams = {}): Promise<PaginatedResult<Beneficiaria>> {
        const {
            page = 1,
            limit = 10,
            orderBy = 'id',
            orderDirection = 'ASC',
        } = params;

        const skip = (page - 1) * limit;

        try {
            const [total, data] = await Promise.all([
                prisma.beneficiaria.count({
                    where: this.softDelete
                        ? { deleted_at: null }
                        : undefined,
                }),
                prisma.beneficiaria.findMany({
                    where: this.softDelete ? { deleted_at: null } : undefined,
                    orderBy: this.buildOrderBy(orderBy, orderDirection),
                    skip,
                    take: limit,
                }),
            ]);

            const totalPages = Math.ceil(total / limit) || 1;

            return {
                data: data as Beneficiaria[],
                total,
                page,
                limit,
                totalPages,
            };
        } catch (error) {
            logger.error('Erro ao listar beneficiárias:', error);
            throw error;
        }
    }

    async update(id: number, data: UpdateBeneficiariaDTO): Promise<Beneficiaria | null> {
        try {
            const result = await prisma.beneficiaria.updateMany({
                where: {
                    id,
                    deleted_at: this.softDelete ? null : undefined,
                },
                data: {
                    ...data,
                    tipo_violencia: data.tipo_violencia ?? undefined,
                    updated_at: new Date(),
                },
            });

            if (result.count === 0) {
                return null;
            }

            return this.findById(id);
        } catch (error) {
            logger.error('Erro ao atualizar beneficiária:', error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            if (this.softDelete) {
                const result = await prisma.beneficiaria.updateMany({
                    where: {
                        id,
                        deleted_at: null,
                    },
                    data: {
                        deleted_at: new Date(),
                        updated_at: new Date(),
                    },
                });
                return result.count > 0;
            }

            const result = await prisma.beneficiaria.deleteMany({ where: { id } });
            return result.count > 0;
        } catch (error) {
            logger.error('Erro ao deletar beneficiária:', error);
            throw error;
        }
    }

    async restore(id: number): Promise<Beneficiaria | null> {
        if (!this.softDelete) {
            throw new Error('Restore só está disponível para tabelas com soft delete');
        }

        try {
            const restored = await prisma.beneficiaria.updateMany({
                where: {
                    id,
                    deleted_at: { not: null },
                },
                data: {
                    deleted_at: null,
                    updated_at: new Date(),
                },
            });

            if (restored.count === 0) {
                return null;
            }

            return this.findById(id);
        } catch (error) {
            logger.error('Erro ao restaurar beneficiária:', error);
            throw error;
        }
    }

    async findByCPF(cpf: string): Promise<Beneficiaria | null> {
        try {
            const beneficiaria = await prisma.beneficiaria.findFirst({
                where: {
                    cpf,
                    deleted_at: this.softDelete ? null : undefined,
                },
            });
            return (beneficiaria as Beneficiaria) ?? null;
        } catch (error) {
            logger.error('Erro ao buscar beneficiária por CPF:', error);
            throw error;
        }
    }

    async findByStatus(status: Beneficiaria['status']): Promise<Beneficiaria[]> {
        try {
            const beneficiarias = await prisma.beneficiaria.findMany({
                where: {
                    status,
                    deleted_at: this.softDelete ? null : undefined,
                },
                orderBy: {
                    nome_completo: 'asc',
                },
            });

            return beneficiarias as Beneficiaria[];
        } catch (error) {
            logger.error('Erro ao buscar beneficiárias por status:', error);
            throw error;
        }
    }

    async search(params: {
        nome?: string;
        cpf?: string;
        cidade?: string;
        estado?: string;
        status?: Beneficiaria['status'];
        dataInicio?: Date;
        dataFim?: Date;
    }): Promise<Beneficiaria[]> {
        const where: Prisma.BeneficiariaWhereInput = {
            deleted_at: this.softDelete ? null : undefined,
        };

        if (params.nome) {
            where.nome_completo = { contains: params.nome, mode: 'insensitive' };
        }

        if (params.cpf) {
            const clean = params.cpf.replace(/\D/g, '');
            where.cpf = { contains: clean };
        }

        if (params.cidade) {
            where.cidade = { contains: params.cidade, mode: 'insensitive' };
        }

        if (params.estado) {
            where.estado = { equals: params.estado.toUpperCase() };
        }

        if (params.status) {
            where.status = params.status;
        }

        if (params.dataInicio || params.dataFim) {
            where.data_nascimento = {};
            if (params.dataInicio) {
                where.data_nascimento.gte = params.dataInicio;
            }
            if (params.dataFim) {
                where.data_nascimento.lte = params.dataFim;
            }
        }

        try {
            const beneficiarias = await prisma.beneficiaria.findMany({
                where,
                orderBy: {
                    nome_completo: 'asc',
                },
                take: 100,
            });

            return beneficiarias as Beneficiaria[];
        } catch (error) {
            logger.error('Erro na busca avançada de beneficiárias:', error);
            throw error;
        }
    }

    async findByUsuario(usuarioId: number): Promise<Beneficiaria[]> {
        try {
            const beneficiarias = await prisma.beneficiaria.findMany({
                where: {
                    usuario_id: usuarioId,
                    deleted_at: this.softDelete ? null : undefined,
                },
                orderBy: {
                    nome_completo: 'asc',
                },
            });

            return beneficiarias as Beneficiaria[];
        } catch (error) {
            logger.error('Erro ao buscar beneficiárias por usuário:', error);
            throw error;
        }
    }

    async getEstatisticas(): Promise<EstatisticasBeneficiarias> {
        try {
            const [row] = await prisma.$queryRawUnsafe<Array<{
                total: number;
                por_status: Array<{ status: string; total: number }> | null;
                por_cidade: Array<{ cidade: string | null; total: number }> | null;
                por_estado: Array<{ estado: string | null; total: number }> | null;
                media_idade: number | null;
            }>>(`
                WITH estatisticas AS (
                    SELECT
                        COUNT(*) as total,
                        status,
                        cidade,
                        estado,
                        AVG(EXTRACT(YEAR FROM age(data_nascimento))) as media_idade
                    FROM beneficiarias
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
            `);

            const total = row?.total ?? 0;
            const porStatus = (row?.por_status ?? []).reduce<Record<string, number>>((acc, item) => {
                if (item?.status) {
                    acc[item.status] = Number(item.total ?? 0);
                }
                return acc;
            }, {});

            const porCidade = (row?.por_cidade ?? []).reduce<Record<string, number>>((acc, item) => {
                if (item?.cidade) {
                    acc[item.cidade] = Number(item.total ?? 0);
                }
                return acc;
            }, {});

            const porEstado = (row?.por_estado ?? []).reduce<Record<string, number>>((acc, item) => {
                if (item?.estado) {
                    acc[item.estado] = Number(item.total ?? 0);
                }
                return acc;
            }, {});

            return {
                total: Number(total) || 0,
                porStatus,
                porCidade,
                porEstado,
                mediaIdade: row?.media_idade ? Number(row.media_idade) : 0,
            };
        } catch (error) {
            logger.error('Erro ao obter estatísticas das beneficiárias:', error);
            throw error;
        }
    }
}
