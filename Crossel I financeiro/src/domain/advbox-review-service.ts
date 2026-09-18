import { AdvBoxClient } from '../integrations/advbox-client.js';
import { AdvBoxLawsuitsService, type AdvBoxLawsuit } from '../integrations/advbox-lawsuits.js';
import { AdvBoxPostsService, type AdvBoxPost } from '../integrations/advbox-posts.js';
import { AdvBoxCustomersService } from '../integrations/advbox-customers.js';
import { classifyTriageCase, type TriageResult } from './triage-service.js';

export type DemandReview = {
  period: {
    startDate: string;
    endDate: string;
  };
  totalDemands: number;
  demands: AdvBoxLawsuit[];
  fabioSchedule: AdvBoxPost[];
  leticiaSchedule: AdvBoxPost[];
  demandsNotAssigned: AdvBoxLawsuit[];
  assignmentResults: TriageResult[];
  timestamp: Date;
};

export class AdvBoxReviewService {
  private lawsuitsService: AdvBoxLawsuitsService;
  private postsService: AdvBoxPostsService;
  private customersService: AdvBoxCustomersService;

  constructor(private client: AdvBoxClient) {
    this.lawsuitsService = new AdvBoxLawsuitsService(client);
    this.postsService = new AdvBoxPostsService(client);
    this.customersService = new AdvBoxCustomersService(client);
  }

  async reviewDemandsByPeriod(startDate: string, endDate: string): Promise<DemandReview> {
    const demands = await this.lawsuitsService.getDemandsByPeriod(startDate, endDate);
    const fabioSchedule = await this.postsService.getScheduleForResponsible('Fabio');
    const leticiaSchedule = await this.postsService.getScheduleForResponsible('Leticia');

    const assignedDemands = demands.filter((d) => d.responsible === 'Fabio' || d.responsible === 'Leticia');
    const demandsNotAssigned = demands.filter((d) => d.responsible !== 'Fabio' && d.responsible !== 'Leticia');

    const assignmentResults = demandsNotAssigned.map((demand) => {
      const assignee = this.selectBestAssignee(fabioSchedule, leticiaSchedule);
      return classifyTriageCase(
        {
          id: demand.id,
          customerName: demand.customer_name,
          processNumber: demand.process_number,
          comment: demand.notes
        },
        assignee
      );
    });

    return {
      period: { startDate, endDate },
      totalDemands: demands.length,
      demands,
      fabioSchedule,
      leticiaSchedule,
      demandsNotAssigned,
      assignmentResults,
      timestamp: new Date()
    };
  }

  private selectBestAssignee(fabioSchedule: AdvBoxPost[], leticiaSchedule: AdvBoxPost[]): 'Fabio' | 'Leticia' {
    const fabioLoad = fabioSchedule.length;
    const leticiaLoad = leticiaSchedule.length;
    return fabioLoad <= leticiaLoad ? 'Fabio' : 'Leticia';
  }

  async getFabioSchedule(): Promise<AdvBoxPost[]> {
    return this.postsService.getScheduleForResponsible('Fabio');
  }

  async getLeticiaSchedule(): Promise<AdvBoxPost[]> {
    return this.postsService.getScheduleForResponsible('Leticia');
  }

  async getFabioActiveDemands(): Promise<AdvBoxLawsuit[]> {
    return this.lawsuitsService.getDemandsByResponsible('Fabio');
  }

  async getLeticiaActiveDemands(): Promise<AdvBoxLawsuit[]> {
    return this.lawsuitsService.getDemandsByResponsible('Leticia');
  }

  async assignDemandToFabio(demandId: string, lawsuitId: string): Promise<TriageResult> {
    const lawsuit = await this.lawsuitsService.getLawsuitById(lawsuitId);
    await this.lawsuitsService.updateLawsuit(lawsuitId, {
      responsible: 'Fabio'
    });

    const result = classifyTriageCase(
      {
        id: lawsuit.id,
        customerName: lawsuit.customer_name,
        processNumber: lawsuit.process_number,
        comment: lawsuit.notes
      },
      'Fabio'
    );

    if (result.standardTaskNote) {
      await this.postsService.createPost({
        lawsuit_id: lawsuitId,
        responsible: 'Fabio',
        title: 'Demanda Encaminhada',
        content: result.standardTaskNote,
        status: 'pending'
      });
    }

    return result;
  }

  async assignDemandToLeticia(demandId: string, lawsuitId: string): Promise<TriageResult> {
    const lawsuit = await this.lawsuitsService.getLawsuitById(lawsuitId);
    await this.lawsuitsService.updateLawsuit(lawsuitId, {
      responsible: 'Leticia'
    });

    const result = classifyTriageCase(
      {
        id: lawsuit.id,
        customerName: lawsuit.customer_name,
        processNumber: lawsuit.process_number,
        comment: lawsuit.notes
      },
      'Leticia'
    );

    if (result.standardTaskNote) {
      await this.postsService.createPost({
        lawsuit_id: lawsuitId,
        responsible: 'Leticia',
        title: 'Demanda Encaminhada',
        content: result.standardTaskNote,
        status: 'pending'
      });
    }

    return result;
  }

  async generateReviewReport(review: DemandReview): Promise<string> {
    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push(`REVISÃO DE DEMANDAS - ${review.period.startDate} a ${review.period.endDate}`);
    lines.push('='.repeat(80));
    lines.push('');

    lines.push(`📊 RESUMO GERAL`);
    lines.push(`Total de demandas: ${review.totalDemands}`);
    lines.push(`Demandas já atribuídas: ${review.demands.length - review.demandsNotAssigned.length}`);
    lines.push(`Demandas sem atribuição: ${review.demandsNotAssigned.length}`);
    lines.push('');

    lines.push(`👤 AGENDA DO FÁBIO`);
    lines.push(`Tarefas pendentes: ${review.fabioSchedule.length}`);
    if (review.fabioSchedule.length > 0) {
      review.fabioSchedule.forEach((task) => {
        lines.push(`  - ${task.title} (${task.status})`);
      });
    }
    lines.push('');

    lines.push(`👤 AGENDA DA LETICIA`);
    lines.push(`Tarefas pendentes: ${review.leticiaSchedule.length}`);
    if (review.leticiaSchedule.length > 0) {
      review.leticiaSchedule.forEach((task) => {
        lines.push(`  - ${task.title} (${task.status})`);
      });
    }
    lines.push('');

    if (review.demandsNotAssigned.length > 0) {
      lines.push(`📋 DEMANDAS PARA ATRIBUIÇÃO`);
      review.demandsNotAssigned.forEach((demand) => {
        lines.push(`  - ${demand.customer_name} | Processo: ${demand.process_number}`);
        lines.push(`    Notas: ${demand.notes}`);
      });
      lines.push('');

      lines.push(`✅ RECOMENDAÇÕES DE ATRIBUIÇÃO`);
      review.assignmentResults.forEach((result) => {
        lines.push(`  - ${result.customerName}: ${result.assignee || 'SEM ATRIBUIÇÃO'}`);
        if (result.standardTaskNote) {
          lines.push(`    Nota: ${result.standardTaskNote}`);
        }
      });
    }

    lines.push('');
    lines.push('='.repeat(80));
    lines.push(`Gerado em: ${review.timestamp.toLocaleString('pt-BR')}`);
    lines.push('='.repeat(80));

    return lines.join('\n');
  }
}
