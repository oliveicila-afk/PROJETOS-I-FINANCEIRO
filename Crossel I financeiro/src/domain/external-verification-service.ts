import { GoogleDriveClient, type DriveFile } from '../integrations/google-drive-client.js';
import { SellFluxSACClient, type SACHistory, type SACCustomerSummary } from '../integrations/sellflux-sac-client.js';
import { AdvBoxLawsuitsService } from '../integrations/advbox-lawsuits.js';
import { AdvBoxPostsService } from '../integrations/advbox-posts.js';

export type VerificationResult = {
  customerName: string;
  processNumber: string;
  driveDocuments: DriveFile[];
  sacHistory: SACHistory[];
  sacSummary?: SACCustomerSummary;
  hasOpportunity: boolean;
  opportunityIndicators: string[];
  recommendedAssignee: 'Fabio' | 'Leticia';
  attachmentURLs: string[];
};

export class ExternalVerificationService {
  constructor(
    private driveClient: GoogleDriveClient,
    private sacClient: SellFluxSACClient,
    private lawsuitsService: AdvBoxLawsuitsService,
    private postsService: AdvBoxPostsService
  ) {}

  async verifyNoOpportunityCase(
    lawsuitId: string,
    customerName: string,
    processNumber: string,
    customerPhone?: string
  ): Promise<VerificationResult> {
    const [driveDocuments, sacAnalysis] = await Promise.all([
      this.driveClient.searchBankDocuments(customerName),
      customerPhone ? this.sacClient.getConversationWithAnalysis(customerPhone) : Promise.resolve(null)
    ]);

    const opportunityIndicators: string[] = [];

    if (driveDocuments.some((document) => /contracheque|holerite|extrato|banco|consign/i.test(document.name))) {
      opportunityIndicators.push(`Encontrados ${driveDocuments.length} documento(s) no Drive`);
    }

    if (sacAnalysis?.indicators && sacAnalysis.indicators.length > 0) {
      opportunityIndicators.push(...sacAnalysis.indicators);
    }

    const hasOpportunity = opportunityIndicators.length > 0;
    const attachmentURLs = driveDocuments.map((doc) => doc.webViewLink);

    return {
      customerName,
      processNumber,
      driveDocuments,
      sacHistory: sacAnalysis?.history || [],
      sacSummary: sacAnalysis?.summary,
      hasOpportunity,
      opportunityIndicators,
      recommendedAssignee: this.selectAssignee(),
      attachmentURLs
    };
  }

  async attachAndForwardToCommercial(
    lawsuitId: string,
    verificationResult: VerificationResult
  ): Promise<{
    success: boolean;
    assignee: 'Fabio' | 'Leticia';
    attachmentsCount: number;
    message: string;
  }> {
    if (!verificationResult.hasOpportunity) {
      return {
        success: false,
        assignee: verificationResult.recommendedAssignee,
        attachmentsCount: 0,
        message: 'Nenhuma oportunidade encontrada após verificação'
      };
    }

    const assignee = verificationResult.recommendedAssignee;

    try {
      await this.lawsuitsService.updateLawsuit(lawsuitId, {
        responsible: assignee
      });

      const attachmentNotes = verificationResult.opportunityIndicators.map((indicator) => `• ${indicator}`).join('\n');

      const note = `
Demanda encaminhada após revisão de Drive e SAC.

Oportunidades identificadas:
${attachmentNotes}

Documentos do Drive:
${verificationResult.driveDocuments.map((doc) => `- ${doc.name} (${new Date(doc.createdTime).toLocaleDateString('pt-BR')})`).join('\n')}

Links dos documentos:
${verificationResult.attachmentURLs.join('\n')}

Histórico SAC:
${verificationResult.sacSummary ? `Total de mensagens: ${verificationResult.sacSummary.total_messages}, Última: ${new Date(verificationResult.sacSummary.last_message_date).toLocaleDateString('pt-BR')}` : 'Não disponível'}
      `.trim();

      await this.postsService.createPost({
        lawsuit_id: lawsuitId,
        responsible: assignee,
        title: 'Demanda com Oportunidade Identificada',
        content: note,
        status: 'pending'
      });

      return {
        success: true,
        assignee,
        attachmentsCount: verificationResult.driveDocuments.length,
        message: `Demanda encaminhada para ${assignee} com ${verificationResult.driveDocuments.length} documento(s) anexado(s)`
      };
    } catch (error) {
      throw new Error(`Erro ao encaminhar demanda: ${error instanceof Error ? error.message : 'desconhecido'}`);
    }
  }

  async reviewAndForwardMultipleCases(
    lawsuits: Array<{ id: string; customerName: string; processNumber: string; phone?: string }>
  ): Promise<
    Array<{
      lawsuitId: string;
      result: VerificationResult;
      forwarded: boolean;
    }>
  > {
    const results = [];

    for (const lawsuit of lawsuits) {
      try {
        const verification = await this.verifyNoOpportunityCase(
          lawsuit.id,
          lawsuit.customerName,
          lawsuit.processNumber,
          lawsuit.phone
        );

        const forwarded = verification.hasOpportunity
          ? (
              await this.attachAndForwardToCommercial(lawsuit.id, verification)
            ).success
          : false;

        results.push({
          lawsuitId: lawsuit.id,
          result: verification,
          forwarded
        });
      } catch (error) {
        console.error(`Erro ao revisar ${lawsuit.customerName}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'desconhecido';
        const errorResult: VerificationResult = {
          customerName: lawsuit.customerName,
          processNumber: lawsuit.processNumber,
          driveDocuments: [],
          sacHistory: [],
          hasOpportunity: false,
          opportunityIndicators: [`Erro durante verificação: ${errorMessage}`],
          recommendedAssignee: 'Fabio',
          attachmentURLs: []
        };
        results.push({
          lawsuitId: lawsuit.id,
          result: errorResult,
          forwarded: false
        });
      }
    }

    return results;
  }

  private selectAssignee(): 'Fabio' | 'Leticia' {
    return Math.random() > 0.5 ? 'Fabio' : 'Leticia';
  }

  generateVerificationReport(
    results: Array<{
      lawsuitId: string;
      result: VerificationResult;
      forwarded: boolean;
    }>
  ): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('RELATÓRIO DE VERIFICAÇÃO - DRIVE E SAC');
    lines.push('='.repeat(80));
    lines.push('');

    const forwarded = results.filter((r) => r.forwarded).length;
    const withOpportunity = results.filter((r) => r.result.hasOpportunity).length;
    const withoutOpportunity = results.filter((r) => !r.result.hasOpportunity).length;

    lines.push('📊 RESUMO');
    lines.push(`Total revisado: ${results.length}`);
    lines.push(`Com oportunidade: ${withOpportunity}`);
    lines.push(`Sem oportunidade: ${withoutOpportunity}`);
    lines.push(`Encaminhados: ${forwarded}`);
    lines.push('');

    const forwarded_results = results.filter((r) => r.forwarded);
    if (forwarded_results.length > 0) {
      lines.push('✅ ENCAMINHADOS PARA COMERCIAL');
      forwarded_results.forEach((r) => {
        lines.push(`\n  📁 ${r.result.customerName} (${r.result.processNumber})`);
        lines.push(`     Responsável: ${r.result.recommendedAssignee}`);
        lines.push(`     Documentos Drive: ${r.result.driveDocuments.length}`);
        if (r.result.opportunityIndicators.length > 0) {
          lines.push(`     Indicadores:`);
          r.result.opportunityIndicators.forEach((indicator) => {
            lines.push(`       • ${indicator}`);
          });
        }
      });
    }

    const not_forwarded = results.filter((r) => !r.forwarded && !r.result.hasOpportunity);
    if (not_forwarded.length > 0) {
      lines.push('\n❌ SEM OPORTUNIDADE CONFIRMADA');
      not_forwarded.forEach((r) => {
        lines.push(`\n  📁 ${r.result.customerName} (${r.result.processNumber})`);
        lines.push(`     Razão: Nenhuma evidência de oportunidade`);
      });
    }

    lines.push('');
    lines.push('='.repeat(80));

    return lines.join('\n');
  }
}
