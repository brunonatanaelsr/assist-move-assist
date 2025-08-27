import { BaseRepository } from './base.repository';
import {
    Formulario,
    HistoricoAtendimento,
    CreateFormularioDTO,
    CreateAtendimentoDTO,
    UpdateFormularioDTO,
    UpdateAtendimentoDTO,
    EstatisticasFormularios,
    EstatisticasAtendimentos,
    BeneficiariaFormulariosAtendimentos,
    TipoFormulario,
    StatusFormulario,
    TipoAtendimento
} from '../models/formulario.model';
import { query } from '../config/database';
import { logger } from '../services/logger';

export class FormularioRepository extends BaseRepository<Formulario> {
    constructor() {
        super('formularios', true);
    }

    // Método para criar um novo formulário
    async create(data: CreateFormularioDTO): Promise<Formulario> {
        try {
            // Verifica se já existe um formulário do mesmo tipo para a beneficiária
            const existingForm = await this.findByTipoEBeneficiaria(
                data.tipo,
                data.beneficiaria_id
            );

            if (existingForm && !['acompanhamento_mensal', 'avaliacao_final'].includes(data.tipo)) {
                throw new Error(`Já existe um formulário do tipo ${data.tipo} para esta beneficiária`);
            }

            return super.create({
                ...data,
                data_preenchimento: new Date()
            });
        } catch (error) {
            logger.error('Erro ao criar formulário:', error);
            throw error;
        }
    }

    // Método para buscar formulário por tipo e beneficiária
    async findByTipoEBeneficiaria(tipo: TipoFormulario, beneficiaria_id: number): Promise<Formulario | null> {
        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE tipo = $1 
            AND beneficiaria_id = $2 
            AND deleted_at IS NULL
            ORDER BY data_preenchimento DESC
            LIMIT 1
        `;

        try {
            const result = await query<Formulario>(sql, [tipo, beneficiaria_id]);
            return result[0] || null;
        } catch (error) {
            logger.error('Erro ao buscar formulário por tipo e beneficiária:', error);
            throw error;
        }
    }

    // Método para buscar todos os formulários de uma beneficiária
    async findByBeneficiaria(beneficiaria_id: number): Promise<Formulario[]> {
        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE beneficiaria_id = $1 
            AND deleted_at IS NULL
            ORDER BY data_preenchimento DESC
        `;

        try {
            return await query<Formulario>(sql, [beneficiaria_id]);
        } catch (error) {
            logger.error('Erro ao buscar formulários da beneficiária:', error);
            throw error;
        }
    }

    // Método para buscar formulários por status
    async findByStatus(status: StatusFormulario): Promise<Formulario[]> {
        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE status = $1 
            AND deleted_at IS NULL
            ORDER BY data_preenchimento DESC
        `;

        try {
            return await query<Formulario>(sql, [status]);
        } catch (error) {
            logger.error('Erro ao buscar formulários por status:', error);
            throw error;
        }
    }

    // Método para obter estatísticas dos formulários
    async getEstatisticas(): Promise<EstatisticasFormularios> {
        const sql = `
            WITH stats AS (
                SELECT 
                    COUNT(*) as total,
                    tipo,
                    status,
                    AVG(EXTRACT(EPOCH FROM (atualizado_em - criado_em)) / 86400) as tempo_medio
                FROM ${this.tableName}
                WHERE deleted_at IS NULL
                GROUP BY tipo, status
            )
            SELECT 
                SUM(total) as total_formularios,
                JSON_AGG(DISTINCT jsonb_build_object(
                    'tipo', tipo,
                    'total', SUM(total)
                )) as por_tipo,
                JSON_AGG(DISTINCT jsonb_build_object(
                    'status', status,
                    'total', SUM(total)
                )) as por_status,
                AVG(tempo_medio) as media_tempo_preenchimento
            FROM stats;
        `;

        try {
            const result = await query(sql);
            const data = result[0];

            return {
                total_formularios: parseInt(data.total_formularios) || 0,
                por_tipo: data.por_tipo?.reduce((acc: Record<TipoFormulario, number>, curr: any) => {
                    acc[curr.tipo as TipoFormulario] = curr.total;
                    return acc;
                }, {} as Record<TipoFormulario, number>) || {},
                por_status: data.por_status?.reduce((acc: Record<StatusFormulario, number>, curr: any) => {
                    acc[curr.status as StatusFormulario] = curr.total;
                    return acc;
                }, {} as Record<StatusFormulario, number>) || {},
                media_tempo_preenchimento: parseFloat(data.media_tempo_preenchimento) || 0
            };
        } catch (error) {
            logger.error('Erro ao obter estatísticas dos formulários:', error);
            throw error;
        }
    }
}

export class AtendimentoRepository extends BaseRepository<HistoricoAtendimento> {
    constructor() {
        super('historico_atendimentos', true);
    }

    // Método para criar um novo atendimento
    async create(data: CreateAtendimentoDTO): Promise<HistoricoAtendimento> {
        try {
            return super.create(data);
        } catch (error) {
            logger.error('Erro ao criar atendimento:', error);
            throw error;
        }
    }

    // Método para buscar atendimentos por beneficiária
    async findByBeneficiaria(beneficiaria_id: number): Promise<HistoricoAtendimento[]> {
        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE beneficiaria_id = $1 
            AND deleted_at IS NULL
            ORDER BY data_atendimento DESC
        `;

        try {
            return await query<HistoricoAtendimento>(sql, [beneficiaria_id]);
        } catch (error) {
            logger.error('Erro ao buscar atendimentos da beneficiária:', error);
            throw error;
        }
    }

    // Método para buscar atendimentos por tipo
    async findByTipo(tipo: TipoAtendimento): Promise<HistoricoAtendimento[]> {
        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE tipo_atendimento = $1 
            AND deleted_at IS NULL
            ORDER BY data_atendimento DESC
        `;

        try {
            return await query<HistoricoAtendimento>(sql, [tipo]);
        } catch (error) {
            logger.error('Erro ao buscar atendimentos por tipo:', error);
            throw error;
        }
    }

    // Método para buscar atendimentos por período
    async findByPeriodo(inicio: Date, fim: Date): Promise<HistoricoAtendimento[]> {
        const sql = `
            SELECT * FROM ${this.tableName}
            WHERE data_atendimento BETWEEN $1 AND $2
            AND deleted_at IS NULL
            ORDER BY data_atendimento DESC
        `;

        try {
            return await query<HistoricoAtendimento>(sql, [inicio, fim]);
        } catch (error) {
            logger.error('Erro ao buscar atendimentos por período:', error);
            throw error;
        }
    }

    // Método para obter estatísticas dos atendimentos
    async getEstatisticas(): Promise<EstatisticasAtendimentos> {
        const sql = `
            WITH stats AS (
                SELECT 
                    COUNT(*) as total,
                    tipo_atendimento,
                    COUNT(DISTINCT beneficiaria_id) as total_beneficiarias,
                    TO_CHAR(data_atendimento, 'YYYY-MM') as mes
                FROM ${this.tableName}
                WHERE deleted_at IS NULL
                GROUP BY tipo_atendimento, TO_CHAR(data_atendimento, 'YYYY-MM')
            )
            SELECT 
                SUM(total) as total_atendimentos,
                COUNT(DISTINCT beneficiaria_id) as total_beneficiarias,
                JSON_AGG(DISTINCT jsonb_build_object(
                    'tipo', tipo_atendimento,
                    'total', SUM(total)
                )) as por_tipo,
                JSON_AGG(DISTINCT jsonb_build_object(
                    'mes', mes,
                    'total', SUM(total),
                    'por_tipo', JSON_AGG(DISTINCT jsonb_build_object(
                        'tipo', tipo_atendimento,
                        'total', COUNT(*)
                    ))
                )) as atendimentos_por_mes
            FROM stats
            GROUP BY mes
            ORDER BY mes;
        `;

        try {
            const result = await query(sql);
            const data = result[0];

            return {
                total_atendimentos: parseInt(data.total_atendimentos) || 0,
                por_tipo: data.por_tipo?.reduce((acc: Record<TipoAtendimento, number>, curr: any) => {
                    acc[curr.tipo as TipoAtendimento] = curr.total;
                    return acc;
                }, {} as Record<TipoAtendimento, number>) || {},
                media_atendimentos_por_beneficiaria: 
                    data.total_atendimentos / (data.total_beneficiarias || 1),
                atendimentos_por_mes: data.atendimentos_por_mes?.map((mes: any) => ({
                    mes: mes.mes,
                    total: mes.total,
                    por_tipo: mes.por_tipo.reduce((acc: Record<TipoAtendimento, number>, curr: any) => {
                        acc[curr.tipo as TipoAtendimento] = curr.total;
                        return acc;
                    }, {} as Record<TipoAtendimento, number>)
                })) || []
            };
        } catch (error) {
            logger.error('Erro ao obter estatísticas dos atendimentos:', error);
            throw error;
        }
    }

    // Método para obter resumo de beneficiária com formulários e atendimentos
    async getResumoBeneficiaria(beneficiaria_id: number): Promise<BeneficiariaFormulariosAtendimentos> {
        try {
            const [beneficiaria, formularios, atendimentos] = await Promise.all([
                query(`
                    SELECT id, nome, cpf 
                    FROM beneficiarias 
                    WHERE id = $1 AND deleted_at IS NULL
                `, [beneficiaria_id]),
                this.findByBeneficiaria(beneficiaria_id),
                query(`
                    SELECT * FROM formularios 
                    WHERE beneficiaria_id = $1 AND deleted_at IS NULL 
                    ORDER BY data_preenchimento DESC
                `, [beneficiaria_id])
            ]);

            if (!beneficiaria[0]) {
                throw new Error('Beneficiária não encontrada');
            }

            // Calcula estatísticas
            const statusFormularios = formularios.reduce((acc: Record<StatusFormulario, number>, form) => {
                acc[form.status as StatusFormulario] = (acc[form.status as StatusFormulario] || 0) + 1;
                return acc;
            }, {} as Record<StatusFormulario, number>);

            const tiposAtendimento = atendimentos.reduce((acc: Record<TipoAtendimento, number>, atend) => {
                acc[atend.tipo_atendimento as TipoAtendimento] = (acc[atend.tipo_atendimento as TipoAtendimento] || 0) + 1;
                return acc;
            }, {} as Record<TipoAtendimento, number>);

            return {
                beneficiaria_id,
                nome: beneficiaria[0].nome,
                cpf: beneficiaria[0].cpf,
                formularios,
                atendimentos,
                estatisticas: {
                    total_formularios: formularios.length,
                    total_atendimentos: atendimentos.length,
                    ultimo_atendimento: atendimentos[0]?.data_atendimento,
                    status_formularios: statusFormularios,
                    tipos_atendimento: tiposAtendimento
                }
            };
        } catch (error) {
            logger.error('Erro ao obter resumo da beneficiária:', error);
            throw error;
        }
    }
}
