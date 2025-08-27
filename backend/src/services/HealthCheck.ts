import { Pool } from 'pg';
import { Router } from 'express';
import { logger } from '../config/logger';

export class HealthCheck {
  private pool: Pool;
  private router: Router;
  private checks: Map<string, () => Promise<boolean>>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.router = Router();
    this.checks = new Map();

    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Rota principal de health check
    this.router.get('/health', async (req, res) => {
      const health = await this.checkHealth();
      
      res.status(health.status === 'healthy' ? 200 : 503)
         .json(health);
    });

    // Dashboard de status
    this.router.get('/health/dashboard', async (req, res) => {
      try {
        const [status, metrics] = await Promise.all([
          this.getIntegrationStatus(),
          this.getApiMetrics()
        ]);

        res.json({
          status,
          metrics,
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Erro ao gerar dashboard:', { error });
        res.status(500).json({ error: 'Erro interno' });
      }
    });
  }

  // Registra um novo serviço para monitoramento
  registerCheck(
    service: string, 
    checkFn: () => Promise<boolean>
  ): void {
    this.checks.set(service, checkFn);
  }

  // Verifica saúde de todos os serviços
  private async checkHealth(): Promise<any> {
    const checks = Array.from(this.checks.entries());
    const results = await Promise.all(
      checks.map(async ([service, checkFn]) => {
        try {
          const isHealthy = await checkFn();
          return {
            service,
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            service,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date()
          };
        }
      })
    );

    const hasUnhealthy = results.some(r => r.status === 'unhealthy');

    return {
      status: hasUnhealthy ? 'degraded' : 'healthy',
      timestamp: new Date(),
      checks: results
    };
  }

  // Busca status das integrações
  private async getIntegrationStatus(): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM current_integration_status'
    );
    return result.rows;
  }

  // Busca métricas de API
  private async getApiMetrics(): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM api_metrics'
    );
    return result.rows;
  }

  // Atualiza status de uma integração
  async updateStatus(
    service: string,
    status: string,
    error?: string
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO integration_status (
          service,
          status,
          error_message,
          last_check
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (service) 
        DO UPDATE SET
          status = $2,
          error_message = $3,
          last_check = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP`,
        [service, status, error]
      );
    } catch (updateError) {
      logger.error('Erro ao atualizar status:', { updateError });
    }
  }

  getRouter(): Router {
    return this.router;
  }
}
