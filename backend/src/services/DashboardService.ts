import { DashboardRepository } from '../repositories/DashboardRepository';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

export class DashboardService {
  constructor(
    private repository: DashboardRepository,
    private redis: Redis
  ) {}

  async getDashboard(filters?: {
    periodo?: {
      inicio: Date;
      fim: Date;
    };
  }) {
    try {
      // Buscar dados do dashboard
      const dashboard = await this.repository.getDashboardCompleto(filters?.periodo);

      // Processar dados para frontend
      return {
        resumo: {
          beneficiarias: {
            total: dashboard.beneficiarias[0]?.total_beneficiarias || 0,
            ativas: dashboard.beneficiarias[0]?.beneficiarias_ativas || 0,
            inativas: dashboard.beneficiarias[0]?.beneficiarias_inativas || 0,
            crescimento: dashboard.metricas?.crescimento_beneficiarias || 0
          },
          oficinas: {
            total: dashboard.oficinas[0]?.total_oficinas || 0,
            taxa_ocupacao: dashboard.oficinas[0]?.taxa_ocupacao || 0,
            participantes: dashboard.oficinas[0]?.total_participantes || 0,
            crescimento: dashboard.metricas?.crescimento_oficinas || 0
          },
          tarefas: {
            total: dashboard.tarefas.reduce((acc, t) => acc + t.total_tarefas, 0),
            pendentes: dashboard.tarefas.reduce((acc, t) => acc + t.pendentes, 0),
            concluidas: dashboard.tarefas.reduce((acc, t) => acc + t.concluidas, 0),
            taxa_conclusao: dashboard.metricas?.taxa_conclusao_tarefas || 0
          },
          engajamento: {
            posts: dashboard.feed[0]?.total_posts || 0,
            comentarios: dashboard.feed[0]?.total_comentarios || 0,
            reacoes: dashboard.feed[0]?.total_reacoes || 0,
            taxa: dashboard.feed[0]?.taxa_engajamento || 0
          }
        },
        graficos: {
          beneficiarias: dashboard.beneficiarias.map(b => ({
            mes: new Date(b.mes_referencia).toISOString(),
            total: b.total_beneficiarias,
            ativas: b.beneficiarias_ativas,
            programa: b.programa_servico,
            total_programa: b.total_por_programa
          })),
          oficinas: dashboard.oficinas.map(o => ({
            mes: new Date(o.mes).toISOString(),
            total: o.total_oficinas,
            taxa_ocupacao: o.taxa_ocupacao,
            participantes: o.total_participantes,
            media_participantes: o.media_participantes_oficina
          })),
          tarefas: dashboard.tarefas.map(t => ({
            responsavel: t.responsavel_nome,
            total: t.total_tarefas,
            pendentes: t.pendentes,
            concluidas: t.concluidas,
            taxa_conclusao: t.taxa_conclusao,
            media_dias: t.media_dias_conclusao
          })),
          engajamento: dashboard.feed.map(f => ({
            mes: new Date(f.mes).toISOString(),
            posts: f.total_posts,
            comentarios: f.total_comentarios,
            reacoes: f.total_reacoes,
            taxa: f.taxa_engajamento
          }))
        },
        metricas_complexas: dashboard.metricas,
        timestamp: dashboard.timestamp
      };
    } catch (error) {
      logger.error('Erro ao gerar dashboard:', error);
      throw error;
    }
  }

  async refreshCache() {
    try {
      // Força refresh das views materializadas
      await this.repository.pool.query('SELECT refresh_dashboard_views()');
      
      // Limpa todo cache relacionado ao dashboard
      const keys = await this.redis.keys('dashboard:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      logger.info('Cache do dashboard atualizado com sucesso');
    } catch (error) {
      logger.error('Erro ao atualizar cache do dashboard:', error);
      throw error;
    }
  }
}
