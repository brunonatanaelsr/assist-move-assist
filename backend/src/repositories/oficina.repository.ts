import { BaseRepository } from './base.repository';
import { 
    Oficina, 
    ParticipacaoOficina, 
    CreateOficinaDTO, 
    UpdateOficinaDTO,
    CreateParticipacaoDTO,
    UpdateParticipacaoDTO,
    EstatisticasOficina,
    OficinaComParticipantes
} from '../models/oficina.model';
import { query } from '../config/database';
import { logger } from '../services/logger';

export class OficinaRepository extends BaseRepository<Oficina> {
    constructor() {
        super('oficinas', true);
    }

    // Método para criar uma nova oficina
    async create(data: CreateOficinaDTO): Promise<Oficina> {
        try {
            // Validações básicas
            if (data.data_fim && data.data_inicio > data.data_fim) {
                throw new Error('Data de início deve ser anterior à data de fim');
            }

            return super.create(data);
        } catch (error) {
            logger.error('Erro ao criar oficina:', error);
            throw error;
        }
    }

    // Método para buscar oficinas ativas
    async findAtivas(): Promise<Oficina[]> {
        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE status = 'ativa' 
            AND deleted_at IS NULL
            AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
            ORDER BY data_inicio
        `;

        try {
            return await query<Oficina>(sql);
        } catch (error) {
            logger.error('Erro ao buscar oficinas ativas:', error);
            throw error;
        }
    }

    // Método para busca avançada
    async search(params: {
        nome?: string;
        tipo?: string;
        status?: Oficina['status'];
        dataInicio?: Date;
        dataFim?: Date;
        local?: string;
        instrutor?: string;
    }): Promise<Oficina[]> {
        let conditions: string[] = ['deleted_at IS NULL'];
        const values: any[] = [];
        let paramCount = 1;

        if (params.nome) {
            conditions.push(`nome ILIKE $${paramCount}`);
            values.push(`%${params.nome}%`);
            paramCount++;
        }

        if (params.tipo) {
            conditions.push(`tipo ILIKE $${paramCount}`);
            values.push(`%${params.tipo}%`);
            paramCount++;
        }

        if (params.status) {
            conditions.push(`status = $${paramCount}`);
            values.push(params.status);
            paramCount++;
        }

        if (params.dataInicio) {
            conditions.push(`data_inicio >= $${paramCount}`);
            values.push(params.dataInicio);
            paramCount++;
        }

        if (params.dataFim) {
            conditions.push(`data_fim <= $${paramCount}`);
            values.push(params.dataFim);
            paramCount++;
        }

        if (params.local) {
            conditions.push(`local ILIKE $${paramCount}`);
            values.push(`%${params.local}%`);
            paramCount++;
        }

        if (params.instrutor) {
            conditions.push(`instrutor ILIKE $${paramCount}`);
            values.push(`%${params.instrutor}%`);
            paramCount++;
        }

        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE ${conditions.join(' AND ')}
            ORDER BY data_inicio DESC
            LIMIT 100
        `;

        try {
            return await query<Oficina>(sql, values);
        } catch (error) {
            logger.error('Erro na busca avançada de oficinas:', error);
            throw error;
        }
    }

    // Método para gerenciar participação
    async gerenciarParticipacao(participacao: CreateParticipacaoDTO): Promise<ParticipacaoOficina> {
        try {
            // Verifica se a oficina existe e tem vagas
            const oficina = await this.findById(participacao.oficina_id);
            if (!oficina) {
                throw new Error('Oficina não encontrada');
            }

            if (oficina.status !== 'ativa') {
                throw new Error('Oficina não está ativa para inscrições');
            }

            // Conta participantes atuais
            const sql = `
                SELECT COUNT(*) as total 
                FROM participacao_oficinas 
                WHERE oficina_id = $1 
                AND status NOT IN ('cancelada', 'desistente')
            `;

            const result = await query<{ total: number }>(sql, [participacao.oficina_id]);
            const totalParticipantes = parseInt(result[0].total);

            if (totalParticipantes >= oficina.vagas) {
                throw new Error('Não há vagas disponíveis nesta oficina');
            }

            // Insere a participação
            const insertSql = `
                INSERT INTO participacao_oficinas (
                    oficina_id, beneficiaria_id, status, 
                    data_inscricao, frequencia, certificado_emitido
                ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 0, false)
                RETURNING *
            `;

            const participacaoResult = await query<ParticipacaoOficina>(
                insertSql, 
                [participacao.oficina_id, participacao.beneficiaria_id, participacao.status]
            );

            return participacaoResult[0];
        } catch (error) {
            logger.error('Erro ao gerenciar participação:', error);
            throw error;
        }
    }

    // Método para atualizar participação
    async atualizarParticipacao(
        oficina_id: number, 
        beneficiaria_id: number, 
        data: UpdateParticipacaoDTO
    ): Promise<ParticipacaoOficina> {
        try {
            const sets: string[] = [];
            const values: any[] = [oficina_id, beneficiaria_id];
            let paramCount = 3;

            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined) {
                    sets.push(`${key} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            });

            if (sets.length === 0) {
                throw new Error('Nenhum dado para atualizar');
            }

            const sql = `
                UPDATE participacao_oficinas
                SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE oficina_id = $1 AND beneficiaria_id = $2
                RETURNING *
            `;

            const result = await query<ParticipacaoOficina>(sql, values);
            if (!result[0]) {
                throw new Error('Participação não encontrada');
            }

            return result[0];
        } catch (error) {
            logger.error('Erro ao atualizar participação:', error);
            throw error;
        }
    }

    // Método para obter oficina com participantes e estatísticas
    async findOficinaComParticipantes(id: number): Promise<OficinaComParticipantes | null> {
        try {
            const oficina = await this.findById(id);
            if (!oficina) {
                return null;
            }

            // Busca participantes com dados da beneficiária
            const participantesSql = `
                SELECT 
                    p.*,
                    b.nome as beneficiaria_nome,
                    b.cpf as beneficiaria_cpf
                FROM participacao_oficinas p
                JOIN beneficiarias b ON b.id = p.beneficiaria_id
                WHERE p.oficina_id = $1
                ORDER BY p.data_inscricao
            `;

            // Busca estatísticas
            const estatisticasSql = `
                WITH stats AS (
                    SELECT 
                        COUNT(*) FILTER (WHERE status = 'inscrita') as total_inscritas,
                        COUNT(*) FILTER (WHERE status = 'confirmada') as total_confirmadas,
                        COUNT(*) FILTER (WHERE status = 'concluida') as total_concluidas,
                        COUNT(*) FILTER (WHERE status = 'desistente') as total_desistentes,
                        COUNT(*) FILTER (WHERE status = 'cancelada') as total_canceladas,
                        AVG(frequencia) as media_frequencia,
                        AVG(avaliacao) as media_avaliacao,
                        COUNT(*) FILTER (WHERE status NOT IN ('cancelada', 'desistente')) as total_ativas
                    FROM participacao_oficinas
                    WHERE oficina_id = $1
                )
                SELECT 
                    *,
                    $2 - total_ativas as vagas_disponiveis,
                    CASE 
                        WHEN $2 > 0 THEN (total_ativas::float / $2) * 100 
                        ELSE 0 
                    END as taxa_ocupacao,
                    CASE 
                        WHEN total_ativas > 0 THEN (total_concluidas::float / total_ativas) * 100 
                        ELSE 0 
                    END as taxa_conclusao
                FROM stats
            `;

            const [participantesResult, estatisticasResult] = await Promise.all([
                query<ParticipacaoOficina & { beneficiaria_nome: string; beneficiaria_cpf: string }>(
                    participantesSql, 
                    [id]
                ),
                query<EstatisticasOficina>(
                    estatisticasSql, 
                    [id, oficina.vagas]
                )
            ]);

            return {
                ...oficina,
                participantes: participantesResult,
                estatisticas: estatisticasResult[0]
            };
        } catch (error) {
            logger.error('Erro ao buscar oficina com participantes:', error);
            throw error;
        }
    }

    // Método para obter estatísticas gerais
    async getEstatisticasGerais(): Promise<{
        total_oficinas: number;
        total_participantes: number;
        media_frequencia: number;
        media_avaliacao: number;
        oficinas_por_tipo: { [key: string]: number };
        oficinas_por_status: { [key: string]: number };
    }> {
        const sql = `
            WITH stats AS (
                SELECT 
                    o.tipo,
                    o.status as oficina_status,
                    COUNT(DISTINCT o.id) as total_oficinas,
                    COUNT(DISTINCT p.beneficiaria_id) as total_participantes,
                    AVG(p.frequencia) as media_frequencia,
                    AVG(p.avaliacao) as media_avaliacao
                FROM ${this.tableName} o
                LEFT JOIN participacao_oficinas p ON p.oficina_id = o.id
                WHERE o.deleted_at IS NULL
                GROUP BY o.tipo, o.status
            )
            SELECT 
                SUM(total_oficinas) as total_oficinas,
                SUM(total_participantes) as total_participantes,
                AVG(media_frequencia) as media_frequencia,
                AVG(media_avaliacao) as media_avaliacao,
                JSON_AGG(DISTINCT jsonb_build_object(
                    'tipo', tipo,
                    'total', COUNT(*)
                )) as oficinas_por_tipo,
                JSON_AGG(DISTINCT jsonb_build_object(
                    'status', oficina_status,
                    'total', COUNT(*)
                )) as oficinas_por_status
            FROM stats;
        `;

        try {
            const result = await query(sql);
            const data = result[0];

            return {
                total_oficinas: parseInt(data.total_oficinas) || 0,
                total_participantes: parseInt(data.total_participantes) || 0,
                media_frequencia: parseFloat(data.media_frequencia) || 0,
                media_avaliacao: parseFloat(data.media_avaliacao) || 0,
                oficinas_por_tipo: data.oficinas_por_tipo?.reduce((acc: any, curr: any) => {
                    acc[curr.tipo] = curr.total;
                    return acc;
                }, {}) || {},
                oficinas_por_status: data.oficinas_por_status?.reduce((acc: any, curr: any) => {
                    acc[curr.status] = curr.total;
                    return acc;
                }, {}) || {}
            };
        } catch (error) {
            logger.error('Erro ao obter estatísticas gerais das oficinas:', error);
            throw error;
        }
    }
}
