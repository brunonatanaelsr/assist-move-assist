import { prisma } from '../database';
import { FilterParams } from '../types/report';
import { generatePDF } from '../utils/pdfGenerator';
import { generateExcel } from '../utils/excelGenerator';
import { generateCSV } from '../utils/csvGenerator';

export class ReportsService {
  async getDashboardMetrics(filters?: FilterParams) {
    const dateFilter = this.getDateFilter(filters?.date_range);

    const [
      beneficiariasCount,
      activeBeneficiariasCount,
      projectsCount,
      activeProjectsCount,
      activitiesCount,
      completedActivitiesCount,
      formsCount,
      responsesCount
    ] = await Promise.all([
      prisma.beneficiaria.count({ where: dateFilter }),
      prisma.beneficiaria.count({ where: { ...dateFilter, status: 'ATIVA' } }),
      prisma.projeto.count({ where: dateFilter }),
      prisma.projeto.count({ where: { ...dateFilter, status: 'ATIVO' } }),
      prisma.atividade.count({ where: dateFilter }),
      prisma.atividade.count({ where: { ...dateFilter, status: 'CONCLUIDA' } }),
      prisma.formulario.count({ where: dateFilter }),
      prisma.respostaFormulario.count({ where: dateFilter })
    ]);

    const engagementRate = activeBeneficiariasCount / beneficiariasCount || 0;
    
    const satisfactionResponses = await prisma.respostaFormulario.findMany({
      where: {
        ...dateFilter,
        tipo: 'SATISFACAO'
      },
      select: {
        nota: true
      }
    });

    const avgSatisfaction = satisfactionResponses.reduce((acc, curr) => acc + curr.nota, 0) / satisfactionResponses.length || 0;

    return {
      total_beneficiarias: beneficiariasCount,
      active_beneficiarias: activeBeneficiariasCount,
      total_projects: projectsCount,
      active_projects: activeProjectsCount,
      total_activities: activitiesCount,
      completed_activities: completedActivitiesCount,
      total_forms: formsCount,
      total_responses: responsesCount,
      engagement_rate: engagementRate,
      avg_satisfaction: avgSatisfaction
    };
  }

  async getProjectMetrics(projectId: number, filters?: FilterParams) {
    const dateFilter = this.getDateFilter(filters?.date_range);

    const project = await prisma.projeto.findUnique({
      where: { id: projectId },
      include: {
        participantes: true,
        atividades: true,
        avaliacoes: true
      }
    });

    if (!project) {
      throw new Error('Projeto não encontrado');
    }

    const totalParticipants = project.participantes.length;
    const activeParticipants = project.participantes.filter(p => p.status === 'ATIVA').length;
    const totalActivities = project.atividades.length;
    const completedActivities = project.atividades.filter(a => a.status === 'CONCLUIDA').length;
    
    const engagementRate = activeParticipants / totalParticipants || 0;
    const attendanceRate = completedActivities / totalActivities || 0;
    const satisfactionScore = project.avaliacoes.reduce((acc, curr) => acc + curr.nota, 0) / project.avaliacoes.length || 0;

    return {
      project_id: projectId,
      total_participants: totalParticipants,
      active_participants: activeParticipants,
      total_activities: totalActivities,
      completed_activities: completedActivities,
      engagement_rate: engagementRate,
      attendance_rate: attendanceRate,
      satisfaction_score: satisfactionScore
    };
  }

  async getFormMetrics(formId: number, filters?: FilterParams) {
    const dateFilter = this.getDateFilter(filters?.date_range);

    const form = await prisma.formulario.findUnique({
      where: { id: formId },
      include: {
        respostas: true,
        questoes: true
      }
    });

    if (!form) {
      throw new Error('Formulário não encontrado');
    }

    const totalResponses = form.respostas.length;
    const completedResponses = form.respostas.filter(r => r.status === 'CONCLUIDA').length;
    const completionRate = completedResponses / totalResponses || 0;

    const avgTimeToComplete = form.respostas.reduce((acc, curr) => {
      const time = curr.dataFinalizacao && curr.dataCriacao
        ? new Date(curr.dataFinalizacao).getTime() - new Date(curr.dataCriacao).getTime()
        : 0;
      return acc + time;
    }, 0) / completedResponses || 0;

    const responseRateByQuestion = form.questoes.reduce((acc, q) => {
      const responses = form.respostas.filter(r => r.respostas.some(rq => rq.questaoId === q.id));
      acc[q.id] = responses.length / totalResponses || 0;
      return acc;
    }, {} as Record<string, number>);

    const abandonmentRate = (totalResponses - completedResponses) / totalResponses || 0;

    return {
      form_id: formId,
      total_responses: totalResponses,
      completion_rate: completionRate,
      avg_time_to_complete: avgTimeToComplete,
      response_rate_by_question: responseRateByQuestion,
      abandonment_rate: abandonmentRate
    };
  }

  async getRegionalMetrics(filters?: FilterParams) {
    const dateFilter = this.getDateFilter(filters?.date_range);

    const regions = await prisma.regiao.findMany({
      include: {
        beneficiarias: true,
        projetos: true
      },
      where: dateFilter
    });

    return regions.map(region => {
      const totalBeneficiarias = region.beneficiarias.length;
      const activeBeneficiarias = region.beneficiarias.filter(b => b.status === 'ATIVA').length;
      const activeProjects = region.projetos.filter(p => p.status === 'ATIVO').length;
      const engagementRate = activeBeneficiarias / totalBeneficiarias || 0;
      
      // Cálculo do impacto baseado em múltiplos fatores
      const impactScore = (
        (engagementRate * 0.4) +
        (activeProjects / region.projetos.length * 0.3) +
        (activeBeneficiarias / totalBeneficiarias * 0.3)
      );

      return {
        region: region.nome,
        total_beneficiarias: totalBeneficiarias,
        active_projects: activeProjects,
        engagement_rate: engagementRate,
        impact_score: impactScore
      };
    });
  }

  async getTemplates() {
    return prisma.reportTemplate.findMany();
  }

  async createTemplate(template: any) {
    return prisma.reportTemplate.create({
      data: template
    });
  }

  async updateTemplate(id: number, template: any) {
    return prisma.reportTemplate.update({
      where: { id },
      data: template
    });
  }

  async deleteTemplate(id: number) {
    return prisma.reportTemplate.delete({
      where: { id }
    });
  }

  async exportReport(templateId: number, format: string, options?: any) {
    const template = await prisma.reportTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new Error('Template não encontrado');
    }

    const data = await this.getReportData(template);

    switch (format) {
      case 'pdf':
        return generatePDF(data, template, options);
      case 'xlsx':
        return generateExcel(data, template, options);
      case 'csv':
        return generateCSV(data, template, options);
      default:
        throw new Error('Formato de exportação inválido');
    }
  }

  private async getReportData(template: any) {
    // Implementar lógica para buscar dados específicos do template
    // baseado nas métricas e filtros definidos
    return {};
  }

  private getDateFilter(dateRange?: { start_date: string; end_date: string }) {
    if (!dateRange) return {};

    return {
      createdAt: {
        gte: new Date(dateRange.start_date),
        lte: new Date(dateRange.end_date)
      }
    };
  }
}
