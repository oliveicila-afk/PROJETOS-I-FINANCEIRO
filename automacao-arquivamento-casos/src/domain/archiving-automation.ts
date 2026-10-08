/**
 * Archiving Automation Service
 *
 * Main orchestration service that:
 * 1. Monitors CRM Financial board for cases ready for archiving
 * 2. Detects corresponding transfers in Asaas
 * 3. Validates all conditions are met
 * 4. Creates archiving task with protocol in Advbox
 */

import { AdvboxClient } from '../integrations/advbox-client.js';
import { CRMClient, CRMCase } from '../integrations/crm-client.js';
import { AsaasClient } from '../integrations/asaas-client.js';
import { config } from '../config.js';

export interface ArchivingValidation {
  isValid: boolean;
  checks: {
    crmStatusReady: boolean;
    transferConfirmed: boolean;
    caseDataComplete: boolean;
    noActiveTasksBlocking: boolean;
  };
  errors: string[];
  warnings: string[];
}

export interface ArchivingTask {
  caseId: string;
  processNumber: string;
  clientName: string;
  value: number;
  transferAmount: number;
  honorariesFees: number;
  repasse: number;
  protocol: string;
  readyForExecution: boolean;
}

export class ArchivingAutomationService {
  private advboxClient: AdvboxClient;
  private crmClient: CRMClient;
  private asaasClient: AsaasClient;

  constructor() {
    this.advboxClient = new AdvboxClient();
    this.crmClient = new CRMClient();
    this.asaasClient = new AsaasClient();
  }

  /**
   * Main automation loop:
   * 1. Get cases from "Para Arquivamento" or "Pagamento Realizado" in CRM
   * 2. For each case, verify transfer in Asaas
   * 3. Validate all conditions
   * 4. Create archiving task if ready
   */
  async processArchivingCandidates(): Promise<ArchivingTask[]> {
    console.log('[Archiving Automation] Starting archiving process...');

    try {
      // Step 1: Get candidates from CRM
      const crmCases = await this.crmClient.getCasesReadyForArchiving();
      console.log(`[Archiving Automation] Found ${crmCases.length} candidates in CRM`);

      const completedTasks: ArchivingTask[] = [];

      for (const crmCase of crmCases) {
        try {
          // Step 2: Get full case details from Advbox lawsuits API
          const caseDetails = await this.advboxClient.getLawsuit(crmCase.id);
          if (!caseDetails) {
            console.warn(`[Archiving Automation] Could not find lawsuit details for case ${crmCase.id}`);
            continue;
          }

          // Step 3: Extract process number and client info
          const processNumber = caseDetails.number || crmCase.process_number;
          const clientName = caseDetails.plaintiff_name || caseDetails.defendant_name || crmCase.client_name;

          if (!processNumber || !clientName) {
            console.warn(`[Archiving Automation] Missing process number or client name for case ${crmCase.id}`);
            continue;
          }

          // Step 4: Find corresponding transfer in Asaas using process number + client name
          const transfers = await this.asaasClient.searchTransfers({
            clientName,
            processNumber,
            status: 'COMPLETED',
          });

          if (transfers.length === 0) {
            console.log(`[Archiving Automation] No confirmed transfer found for case ${crmCase.id}`);
            continue;
          }

          // Use most recent transfer
          const transfer = transfers[0];

          // Step 5: Validate all conditions
          const validation = await this.validateArchivingConditions(
            crmCase,
            caseDetails,
            transfer
          );

          if (!validation.isValid) {
            console.warn(`[Archiving Automation] Validation failed for case ${crmCase.id}:`, validation.errors);
            continue;
          }

          // Step 6: Calculate fees and protocol
          const feesInfo = await this.calculateFeesAndProtocol(caseDetails, transfer);

          // Step 7: Create archiving task
          const taskCreated = await this.createArchivingTask(
            crmCase.id,
            processNumber,
            clientName,
            caseDetails,
            transfer,
            feesInfo
          );

          if (taskCreated) {
            completedTasks.push({
              caseId: crmCase.id,
              processNumber,
              clientName,
              value: transfer.value,
              transferAmount: transfer.value,
              honorariesFees: feesInfo.totalHonoraries,
              repasse: feesInfo.repasse,
              protocol: feesInfo.protocol,
              readyForExecution: true,
            });

            console.log(`[Archiving Automation] ✅ Successfully created archiving task for case ${crmCase.id}`);
          }
        } catch (error) {
          console.error(`[Archiving Automation] Error processing case ${crmCase.id}:`, error);
          continue;
        }
      }

      console.log(`[Archiving Automation] Completed ${completedTasks.length} archiving tasks`);
      return completedTasks;
    } catch (error) {
      console.error('[Archiving Automation] Fatal error in automation loop:', error);
      throw error;
    }
  }

  /**
   * Validate that all conditions are met before creating archiving task
   */
  private async validateArchivingConditions(
    crmCase: CRMCase,
    caseDetails: any,
    transfer: any
  ): Promise<ArchivingValidation> {
    const checks = {
      crmStatusReady: false,
      transferConfirmed: false,
      caseDataComplete: false,
      noActiveTasksBlocking: false,
    };
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: CRM status is "Para Arquivamento" or "Pagamento Realizado"
    if (crmCase.current_column?.toLowerCase().includes('arquivamento') ||
        crmCase.current_column?.toLowerCase().includes('pagamento')) {
      checks.crmStatusReady = true;
    } else {
      errors.push(`CRM column is "${crmCase.current_column}", not in archiving status`);
    }

    // Check 2: Transfer is confirmed and completed
    if (transfer.status === 'COMPLETED' || transfer.status === 'CONFIRMED') {
      checks.transferConfirmed = true;
    } else {
      errors.push(`Transfer status is "${transfer.status}", not confirmed`);
    }

    // Check 3: Essential case data is present
    if (caseDetails.number && caseDetails.plaintiff_name) {
      checks.caseDataComplete = true;
    } else {
      errors.push('Missing essential case data (process number or client name)');
    }

    // Check 4: No blocking tasks (e.g., case is not marked as "under dispute")
    try {
      const activeTasks = await this.advboxClient.getCaseTasks(caseDetails.id);
      const blockingTasks = activeTasks.filter(t =>
        t.status === 'OPEN' &&
        (t.title.toLowerCase().includes('disputa') ||
         t.title.toLowerCase().includes('análise'))
      );

      if (blockingTasks.length === 0) {
        checks.noActiveTasksBlocking = true;
      } else {
        warnings.push(`Found ${blockingTasks.length} potentially blocking tasks`);
      }
    } catch (error) {
      warnings.push('Could not verify blocking tasks');
    }

    const isValid = Object.values(checks).every(c => c === true);

    return {
      isValid,
      checks,
      errors,
      warnings,
    };
  }

  /**
   * Calculate fees and generate archiving protocol
   */
  private async calculateFeesAndProtocol(caseDetails: any, transfer: any) {
    // Extract fee percentage from case metadata
    const feePercentage = this.extractFeePercentage(caseDetails);

    // Calculate fees
    const totalValue = transfer.value;
    const honorariesFees = totalValue * (feePercentage / 100);
    const repasse = totalValue - honorariesFees;

    // Build protocol
    const protocol = this.generateProtocol(caseDetails, totalValue, honorariesFees, repasse);

    return {
      feePercentage,
      totalValue,
      honorariesFees,
      repasse,
      protocol,
    };
  }

  /**
   * Extract fee percentage from case details
   * Looks for multiple field names (taxas, percentage, taxa_percentual, etc.)
   */
  private extractFeePercentage(caseDetails: any): number {
    const fieldNames = [
      'taxas',
      'percentage',
      'taxa_percentual',
      'percentual_honorarios',
      'honor_percent',
      'taxa',
      'percentual',
      'fees',
    ];

    for (const field of fieldNames) {
      if (caseDetails[field]) {
        const value = parseFloat(String(caseDetails[field]));
        if (!isNaN(value) && value > 0 && value <= 100) {
          return value;
        }
      }
    }

    // Default fallback
    console.warn('Could not extract fee percentage, using default 34.97%');
    return 34.97;
  }

  /**
   * Generate archiving protocol text
   * Protocol format (fixed structure as shown in video):
   * PROTOCOLO DE ARQUIVAMENTO - OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS
   * - Honorários contratuais iniciais: R$ X,XX
   * - Honorários sucumbenciais: R$ X,XX
   * - Honorários contratuais de Adm: R$ X,XX
   * - Valor total de honorários: R$ X,XX
   * - Nota fiscal emitida: () Sim () Não
   * - Observação: "Não restam obrigações..."
   */
  private generateProtocol(
    caseDetails: any,
    totalValue: number,
    honorariesFees: number,
    repasse: number
  ): string {
    const formatCurrency = (value: number) =>
      `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const protocol = `PROTOCOLO DE ARQUIVAMENTO - OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS

**Honorários contratuais iniciais:** ${formatCurrency(0)}
**Honorários sucumbenciais:** ${formatCurrency(0)}
**Honorários contratuais de Adm:** ${formatCurrency(honorariesFees)}
**Valor total de honorários:** ${formatCurrency(honorariesFees)}
**Nota fiscal emitida:** ( ) Sim ( ) Não
**Observação:** Não restam obrigações a serem cumpridas, estando todas integralmente satisfeitas. Realizada a baixa e o arquivamento no ADVBOX.`;

    return protocol;
  }

  /**
   * Create archiving task in Advbox
   */
  private async createArchivingTask(
    caseId: string,
    processNumber: string,
    clientName: string,
    caseDetails: any,
    transfer: any,
    feesInfo: any
  ): Promise<boolean> {
    try {
      const taskPayload = {
        lawsuit_id: caseDetails.id,
        title: 'ARQUIVAMENTO DEFINITIVO DE CLIENTE (1 pts)',
        description: `Caso arquivado automaticamente\nProcesso: ${processNumber}\nCliente: ${clientName}\nRepasse: ${transfer.value}`,
        status: 'OPEN',
        priority: 'HIGH',
        due_date: new Date().toISOString().split('T')[0],
        protocol_data: {
          title: 'PROTOCOLO DE ARQUIVAMENTO - OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS',
          honoraries_contractual_initial: 0,
          honoraries_succumb: 0,
          honoraries_admin: feesInfo.honorariesFees,
          honoraries_total: feesInfo.honorariesFees,
          invoice_issued: false,
          observation: feesInfo.protocol,
        },
        metadata: {
          automation_timestamp: new Date().toISOString(),
          asaas_transfer_id: transfer.id,
          crm_trigger: 'para_arquivamento',
        },
      };

      await this.advboxClient.createTask(caseDetails.id, taskPayload);
      return true;
    } catch (error) {
      console.error(`Error creating archiving task for case ${caseId}:`, error);
      throw error;
    }
  }
}

export default ArchivingAutomationService;
