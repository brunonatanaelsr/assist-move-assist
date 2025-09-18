import { db } from '../database';
import { redis } from '../lib/redis';
import { logger } from '../services/logger';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import { renderTemplate } from '../templates/reports/render';
import type { QueueService } from './QueueService';
import { compress, CompressibleFile } from '../utils/compression';

export interface GeneratedReport extends CompressibleFile {
  compressed?: boolean;
}

interface ReportOptions {
  template: string;
  filters?: Record<string, any>;
  format?: 'pdf' | 'excel';
  cacheTime?: number;
  compress?: boolean;
}

export class RelatorioService {
  constructor(private queueService?: QueueService) {}

  private async getCacheKey(template: string, filters: Record<string, any> = {}) {
    const filterHash = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    
    return `report:${template}:${filterHash}`;
  }

  async generateReport(options: ReportOptions): Promise<GeneratedReport> {
    const {
      template,
      filters = {},
      format = 'pdf',
      cacheTime = 3600, // 1 hora
      compress: shouldCompress = false
    } = options;

    try {
      // Verificar cache
      const cacheKey = await this.getCacheKey(template, filters);
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        logger.info('Relatório encontrado no cache', { template, filters });
        const parsed = JSON.parse(cached) as GeneratedReport & { data: string };
        return {
          ...parsed,
          data: Buffer.from(parsed.data, 'base64')
        };
      }

      // Buscar dados conforme template
      const data = await this.getReportData(template, filters);

      // Renderizar HTML
      const html = await renderTemplate(template, { data, filters });

      // Gerar arquivo no formato solicitado
      let result: GeneratedReport;
      if (format === 'pdf') {
        result = await this.generatePDF(html, template);
      } else {
        result = await this.generateExcel(data, template);
      }

      // Comprimir se necessário
      if (shouldCompress && result.size > 1024 * 1024) { // > 1MB
        result = await compress(result);
      }

      // Salvar no cache
      await redis.setex(
        cacheKey,
        cacheTime,
        JSON.stringify({
          ...result,
          data: result.data.toString('base64')
        })
      );

      return result;

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      logger.error('Erro ao gerar relatório', {
        template,
        filters,
        error: message
      });
      throw error instanceof Error ? error : new Error(message);
    }
  }

  private async getReportData(template: string, filters: Record<string, any>): Promise<any[]> {
    switch (template) {
      case 'beneficiarias_completo':
        return db.manyOrNone(`
          SELECT * FROM view_beneficiarias_completo
          WHERE ($1::uuid IS NULL OR id = $1)
          AND ($2::date IS NULL OR data_cadastro >= $2)
          AND ($3::date IS NULL OR data_cadastro <= $3)
        `, [filters.id, filters.data_inicio, filters.data_fim]);

      case 'participacao_oficinas':
        return db.manyOrNone(`
          SELECT * FROM view_participacao_oficinas
          WHERE ($1::date IS NULL OR mes >= $1)
          AND ($2::date IS NULL OR mes <= $2)
          AND ($3::uuid IS NULL OR beneficiaria_id = $3)
        `, [filters.data_inicio, filters.data_fim, filters.beneficiaria_id]);

      case 'produtividade_equipe':
        return db.manyOrNone(`
          SELECT * FROM view_produtividade_equipe
          WHERE ($1::date IS NULL OR mes >= $1)
          AND ($2::date IS NULL OR mes <= $2)
          AND ($3::uuid IS NULL OR user_id = $3)
          ORDER BY pontuacao_produtividade DESC
        `, [filters.data_inicio, filters.data_fim, filters.user_id]);

      case 'timeline_atividades':
        return db.manyOrNone(`
          SELECT * FROM view_timeline_atividades
          WHERE ($1::uuid IS NULL OR beneficiaria_id = $1)
          AND ($2::date IS NULL OR data_atividade >= $2)
          AND ($3::date IS NULL OR data_atividade <= $3)
          ORDER BY data_atividade DESC
        `, [filters.beneficiaria_id, filters.data_inicio, filters.data_fim]);

      default:
        throw new Error(`Template de relatório não encontrado: ${template}`);
    }
  }

  private async generatePDF(html: string, template: string): Promise<GeneratedReport> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfData = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });

      const buffer = Buffer.isBuffer(pdfData) ? pdfData : Buffer.from(pdfData);

      return {
        data: buffer,
        size: buffer.byteLength,
        mimeType: 'application/pdf',
        fileName: `${template}.pdf`
      };

    } finally {
      await browser.close();
    }
  }

  private async generateExcel(data: any[], template: string): Promise<GeneratedReport> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório');

    // Adicionar cabeçalhos
    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map(key => ({
        header: key,
        key,
        width: 20
      }));
    }

    // Adicionar dados
    worksheet.addRows(data);

    // Estilizar cabeçalhos
    worksheet.getRow(1).font = {
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(arrayBuffer) ? arrayBuffer : Buffer.from(arrayBuffer);

    return {
      data: buffer,
      size: buffer.byteLength,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: `${template}.xlsx`
    };
  }

  async scheduleReport(schedule: string, options: ReportOptions): Promise<any> {
    if (!this.queueService) {
      throw new Error('Serviço de fila não configurado para agendamento de relatórios');
    }

    return this.queueService.enqueue('generate_report', {
      schedule,
      options
    });
  }

  async getScheduledReports(): Promise<any[]> {
    return db.manyOrNone(`
      SELECT * FROM job_queue
      WHERE job_type = 'generate_report'
      AND status = 'pending'
      ORDER BY scheduled_at
    `);
  }
}
