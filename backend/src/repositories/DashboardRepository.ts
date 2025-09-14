import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { logger } from '../services/logger';

interface DashboardPeriodo {
  inicio: Date;
  fim: Date;
}

export class DashboardRepository {
  constructor(
    private pool: Pool,
    private redis: Redis
  ) {}

  private async getCachedOrExecute<T>(
    key: string,
    ttlSeconds: number,
    execute: () => Promise<T>
  ): Promise<T> {
    try {
      // Tentar obter do cache
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      // Executar query e cachear resultado
      const result = await execute();
      await this.redis.setex(key, ttlSeconds, JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error(`Erro ao executar query com cache (${key}):`, error);
      throw error;
    }
  }

  async getBeneficiariasStats(periodo?: DashboardPeriodo) {
    const cacheKey = `dashboard:beneficiarias:${periodo?.inicio || 'all'}:${periodo?.fim || 'all'}`;
    
    return this.getCachedOrExecute(cacheKey, 300, async () => {
      const query = `
        SELECT 
          mes_referencia,
          total_beneficiarias,
          beneficiarias_ativas,
          beneficiarias_inativas,
          programa_servico,
          total_por_programa
        FROM view_beneficiarias_stats
        WHERE ($1::date IS NULL OR mes_referencia BETWEEN $1 AND $2)
        ORDER BY mes_referencia DESC, programa_servico
      `;

      const result = await this.pool.query(query, [
        periodo?.inicio || null,
        periodo?.fim || null
      ]);

      return result.rows;
    });
  }

  async getOficinasStats(periodo?: DashboardPeriodo) {
    const cacheKey = `dashboard:oficinas:${periodo?.inicio || 'all'}:${periodo?.fim || 'all'}`;
    
    return this.getCachedOrExecute(cacheKey, 300, async () => {
      const query = `
        SELECT 
          mes,
          total_oficinas,
          taxa_ocupacao,
          total_participantes,
          ROUND(total_participantes::numeric / NULLIF(total_oficinas, 0), 2) as media_participantes_oficina
        FROM view_oficinas_stats
        WHERE ($1::date IS NULL OR mes BETWEEN $1 AND $2)
        ORDER BY mes DESC
      `;

      const result = await this.pool.query(query, [
        periodo?.inicio || null,
        periodo?.fim || null
      ]);

      return result.rows;
    });
  }

  async getTarefasStats() {
    return this.getCachedOrExecute('dashboard:tarefas', 300, async () => {
      const query = `
        SELECT 
          responsavel_id,
          responsavel_nome,
          total_tarefas,
          pendentes,
          concluidas,
          media_dias_conclusao,
          ROUND((concluidas::numeric / NULLIF(total_tarefas, 0) * 100), 2) as taxa_conclusao
        FROM view_tarefas_stats
        ORDER BY total_tarefas DESC
      `;

      const result = await this.pool.query(query);
      return result.rows;
    });
  }

  async getFeedEngagement(periodo?: DashboardPeriodo) {
    const cacheKey = `dashboard:feed:${periodo?.inicio || 'all'}:${periodo?.fim || 'all'}`;
    
    return this.getCachedOrExecute(cacheKey, 300, async () => {
      const query = `
        SELECT 
          mes,
          total_posts,
          autores_unicos,
          total_comentarios,
          total_reacoes,
          taxa_engajamento
        FROM view_feed_engagement
        WHERE ($1::date IS NULL OR mes BETWEEN $1 AND $2)
        ORDER BY mes DESC
      `;

      const result = await this.pool.query(query, [
        periodo?.inicio || null,
        periodo?.fim || null
      ]);

      return result.rows;
    });
  }

  async getMetricasComplexas(periodo: DashboardPeriodo) {
    const cacheKey = `dashboard:metricas:${periodo.inicio}:${periodo.fim}`;
    
    return this.getCachedOrExecute(cacheKey, 300, async () => {
      const query = `
        DO $$
        DECLARE
            v_crescimento_beneficiarias NUMERIC;
            v_crescimento_oficinas NUMERIC;
            v_taxa_retencao NUMERIC;
            v_media_participacao NUMERIC;
            v_eficiencia_oficinas NUMERIC;
            v_taxa_conclusao_tarefas NUMERIC;
        BEGIN
            CALL calcular_metricas_crescimento($1, $2, 
                v_crescimento_beneficiarias, 
                v_crescimento_oficinas, 
                v_taxa_retencao
            );
            
            CALL calcular_metricas_performance($1, $2,
                v_media_participacao,
                v_eficiencia_oficinas,
                v_taxa_conclusao_tarefas
            );
            
            RETURN QUERY SELECT 
                v_crescimento_beneficiarias as crescimento_beneficiarias,
                v_crescimento_oficinas as crescimento_oficinas,
                v_taxa_retencao as taxa_retencao,
                v_media_participacao as media_participacao,
                v_eficiencia_oficinas as eficiencia_oficinas,
                v_taxa_conclusao_tarefas as taxa_conclusao_tarefas;
        END $$;
      `;

      const result = await this.pool.query(query, [periodo.inicio, periodo.fim]);
      return result.rows[0];
    });
  }

  async getDashboardCompleto(periodo?: DashboardPeriodo) {
    const [
      beneficiarias,
      oficinas,
      tarefas,
      feed,
      metricas
    ] = await Promise.all([
      this.getBeneficiariasStats(periodo),
      this.getOficinasStats(periodo),
      this.getTarefasStats(),
      this.getFeedEngagement(periodo),
      periodo ? this.getMetricasComplexas(periodo) : Promise.resolve(null)
    ]);

    return {
      beneficiarias,
      oficinas,
      tarefas,
      feed,
      metricas,
      timestamp: new Date()
    };
  }
}
