import { Job } from '../types/Job';
import { logger } from '../services/logger';
import { redis } from '../lib/redis';
import { RelatorioService } from '../services/RelatorioService';

interface ReportJobPayload {
  schedule?: string;
  options: {
    template: string;
    filters?: Record<string, unknown>;
    format?: 'pdf' | 'excel';
    cacheTime?: number;
    compress?: boolean;
  };
  persistResult?: boolean;
}

export class ReportJob implements Job<ReportJobPayload> {
  private relatorioService: RelatorioService;

  constructor(relatorioService?: RelatorioService) {
    this.relatorioService = relatorioService ?? new RelatorioService();
  }

  async execute(payload: ReportJobPayload): Promise<void> {
    if (!payload?.options?.template) {
      logger.warn('Job de relatório recebido sem template', { payload });
      return;
    }

    try {
      const result = await this.relatorioService.generateReport(payload.options);

      if (payload.persistResult) {
        const cacheKey = `report_result:${payload.options.template}:${payload.schedule ?? 'latest'}`;
        await redis.setex(
          cacheKey,
          6 * 60 * 60,
          JSON.stringify({
            generatedAt: new Date().toISOString(),
            format: payload.options.format ?? 'pdf',
            size: result.size,
            mimeType: result.mimeType,
            fileName: result.fileName,
            compressed: result.compressed ?? false,
            data: result.data.toString('base64')
          })
        );
      }

      logger.info('Relatório gerado com sucesso através do job', {
        template: payload.options.template,
        schedule: payload.schedule,
        persistido: payload.persistResult ?? false
      });
    } catch (error: any) {
      logger.error('Erro ao processar job de relatório', {
        template: payload.options.template,
        schedule: payload.schedule,
        error: error?.message || error
      });
      throw error;
    }
  }
}
