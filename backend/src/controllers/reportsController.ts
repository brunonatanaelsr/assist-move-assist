import { Request, Response } from 'express';
import { ReportsService } from '../services/reportsService';

export class ReportsController {
  private reportsService: ReportsService;

  constructor() {
    this.reportsService = new ReportsService();
  }

  getDashboardMetrics = async (req: Request, res: Response) => {
    try {
      const filters = req.query;
      const metrics = await this.reportsService.getDashboardMetrics(filters);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getProjectMetrics = async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const filters = req.query;
      const metrics = await this.reportsService.getProjectMetrics(projectId, filters);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getFormMetrics = async (req: Request, res: Response) => {
    try {
      const formId = parseInt(req.params.id);
      const filters = req.query;
      const metrics = await this.reportsService.getFormMetrics(formId, filters);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getRegionalMetrics = async (req: Request, res: Response) => {
    try {
      const filters = req.query;
      const metrics = await this.reportsService.getRegionalMetrics(filters);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getTemplates = async (req: Request, res: Response) => {
    try {
      const templates = await this.reportsService.getTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  createTemplate = async (req: Request, res: Response) => {
    try {
      const template = req.body;
      const newTemplate = await this.reportsService.createTemplate(template);
      res.status(201).json(newTemplate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updateTemplate = async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = req.body;
      const updatedTemplate = await this.reportsService.updateTemplate(templateId, template);
      res.json(updatedTemplate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  deleteTemplate = async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      await this.reportsService.deleteTemplate(templateId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  exportReport = async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const { format, options } = req.body;
      const report = await this.reportsService.exportReport(templateId, format, options);
      
      res.setHeader('Content-Type', this.getContentType(format));
      res.setHeader('Content-Disposition', `attachment; filename=report-${templateId}.${format}`);
      res.send(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  private getContentType(format: string): string {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }
}
