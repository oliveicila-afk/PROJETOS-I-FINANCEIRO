/**
 * Archiving Automation Service - REFACTORED
 *
 * New flow (Asaas-driven):
 * 1. Monitor Asaas for incoming payments (entries) with process number
 * 2. For each entry:
 *    a. Get case details from Advbox using process number
 *    b. Determine if sucumbencial or contratual
 *    c. If sucumbencial: Archive immediately (with 4 validations)
 *    d. If contratual/other: Store info and wait for outgoing transfer (repasse) to client
 *       - When transfer found: Archive (with 4 validations)
 */

import { AdvBoxClient } from '../integrations/advbox-client.js';
import { AsaasClient, AsaasEntry, AsaasTransfer } from '../integrations/asaas-client.js';
import { config } from '../config.js';

export interface ArchivingValidation {
  isValid: boolean;
  checks: {
    entryConfirmed: boolean;        // Entry is confirmed in Asaas
    caseDataComplete: boolean;      // Case has process number, client name, and type
    noActiveTasksBlocking: boolean; // No blocking tasks in Advbox
    transferConfirmedIfNeeded: boolean; // If contratual, transfer must be confirmed
  };
  errors: string[];
  warnings: string[];
}

export interface ArchivingTask {
  entryId: string;
  processNumber: string;
  clientName: string;
  caseType: 'SUCUMBENCIAL' | 'CONTRATUAL' | 'OTHER';
  entryValue: number;
  transferValue?: number;
  honorariesFees: number;
  repasse?: number;
  protocol: string;
  readyForExecution: boolean;
  createdAt: string;
}

export interface PendingArchiving {
  entryId: string;
  processNumber: string;
  clientName: string;
  caseType: string;
  entryValue: number;
  createdAt: string;
  awaitingTransferUntil: string;
}

export class ArchivingAutomationService {
  private advboxClient: AdvboxClient;
  private asaasClient: AsaasClient;
  private pendingArchivings: Map<string, PendingArchiving> = new Map();

  constructor() {
    this.advboxClient = new AdvBoxClient();
    this.asaasClient = new AsaasClient();
  }

  /**
   * Main automation loop - REFACTORED
   * 1. Scan Asaas entries (incoming payments) from the last X hours/minutes
   * 2. For each entry with process number:
   *    - Get case details from Advbox
   *    - Determine case type (sucumbencial vs contratual)
   *    - If sucumbencial: Archive immediately
   *    - If contratual: Store and wait for transfer
   * 3. For pending contratual cases, check for matching transfers
   * 4. When transfer found: Archive the case
   */
  async processArchivingCandidates(): Promise<ArchivingTask[]> {
    console.log('[Archiving Automation] Starting refactored archiving process (Asaas-driven)...');

    try {
      const completedTasks: ArchivingTask[] = [];

      // Step 1: Scan recent entries from Asaas
      const entries = await this.asaasClient.searchEntries({
        status: 'CONFIRMED',
        limit: 50,
      });

      console.log(`[Archiving Automation] Found ${entries.length} confirmed entries in Asaas`);

      // Step 2: Process each entry
      for (const entry of entries) {
        try {
          // Extract process number from description
          const processNumber = this.extractProcessNumber(entry.description);

          if (!processNumber) {
            console.log(`[Archiving Automation] Entry ${entry.id} has no process number, skipping`);
            continue;
          }

          console.log(`[Archiving Automation] Processing entry ${entry.id} with process ${processNumber}`);

          // Get case details from Advbox
          const caseDetails = await this.advboxClient.getLawsuitByNumber(processNumber);
          if (!caseDetails) {
            console.warn(
              `[Archiving Automation] Could not find case details for process ${processNumber}`
            );
            continue;
          }

          // Extract case info
          const clientName = caseDetails.plaintiff_name || caseDetails.defendant_name || 'Unknown';
          const caseType = this.determineCaseType(caseDetails);

          console.log(
            `[Archiving Automation] Case ${processNumber} is type: ${caseType}, client: ${clientName}`
          );

          // Step 3: Route based on case type
          if (caseType === 'SUCUMBENCIAL') {
            // SUCUMBENCIAL: Archive immediately
            console.log(`[Archiving Automation] Case ${processNumber} is sucumbencial, archiving immediately`);

            const task = await this.archiveCase(
              entry.id,
              processNumber,
              clientName,
              caseDetails,
              entry,
              null, // No transfer for sucumbencial
              caseType
            );

            if (task) {
              completedTasks.push(task);
            }
          } else {
            // CONTRATUAL or OTHER: Store and wait for transfer to client
            console.log(
              `[Archiving Automation] Case ${processNumber} is ${caseType}, waiting for transfer to client`
            );

            this.storePendingArchiving(entry, processNumber, clientName, caseType);
          }
        } catch (error) {
          console.error(`[Archiving Automation] Error processing entry ${entry.id}:`, error);
          continue;
        }
      }

      // Step 4: Check pending cases for matching transfers
      const archiveFromPending = await this.processePendingArchivings();
      completedTasks.push(...archiveFromPending);

      console.log(`[Archiving Automation] Completed ${completedTasks.length} archiving tasks`);
      return completedTasks;
    } catch (error) {
      console.error('[Archiving Automation] Fatal error in automation loop:', error);
      throw error;
    }
  }

  /**
   * Extract process number from Asaas entry description
   * Format: "PROCESSO 0052754-30.2026.8.04.1000" or similar
   */
  private extractProcessNumber(description: string): string | null {
    if (!description) return null;

    // Match patterns: "PROCESSO NNNNNNNN-NN.NNNN.N.NN.NNNN" or numbers with dashes
    const match = description.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
    return match?.[1] || null;
  }

  /**
   * Determine case type from Advbox case details
   * Sucumbencial: only office fees (no client repayment)
   * Contratual: office takes percentage, rest goes to client
   * Other: default
   */
  private determineCaseType(caseDetails: any): 'SUCUMBENCIAL' | 'CONTRATUAL' | 'OTHER' {
    // Check for case type field in Advbox
    if (caseDetails.case_type) {
      const type = String(caseDetails.case_type).toLowerCase();
      if (type.includes('sucumbencial') || type.includes('sentença')) {
        return 'SUCUMBENCIAL';
      }
      if (type.includes('contrato') || type.includes('contractual')) {
        return 'CONTRATUAL';
      }
    }

    // Check for fee percentage (contratual cases have percentage)
    const hasPercentage = this.extractFeePercentage(caseDetails) > 0;
    if (hasPercentage) {
      return 'CONTRATUAL';
    }

    // Default
    return 'OTHER';
  }

  /**
   * Store pending archiving case (waiting for transfer)
   */
  private storePendingArchiving(
    entry: AsaasEntry,
    processNumber: string,
    clientName: string,
    caseType: string
  ): void {
    const key = `${processNumber}:${entry.id}`;

    // Calculate expiration (wait up to 7 days for transfer)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    this.pendingArchivings.set(key, {
      entryId: entry.id,
      processNumber,
      clientName,
      caseType,
      entryValue: entry.value,
      createdAt: entry.createdAt,
      awaitingTransferUntil: expiresAt.toISOString(),
    });

    console.log(
      `[Archiving Automation] Stored pending archiving for ${processNumber}, waiting until ${expiresAt.toISOString()}`
    );
  }

  /**
   * Process pending archivings - check for matching transfers
   */
  private async processePendingArchivings(): Promise<ArchivingTask[]> {
    const completedTasks: ArchivingTask[] = [];

    for (const [key, pending] of this.pendingArchivings.entries()) {
      try {
        // Check if transfer has been made to this client
        const transfers = await this.asaasClient.searchTransfers({
          clientName: pending.clientName,
          processNumber: pending.processNumber,
          status: 'COMPLETED',
        });

        if (transfers.length > 0) {
          const transfer = transfers[0]; // Use most recent
          console.log(
            `[Archiving Automation] Found matching transfer for ${pending.processNumber}, archiving now`
          );

          // Get case details again for archiving
          const caseDetails = await this.advboxClient.getLawsuitByNumber(pending.processNumber);
          if (caseDetails) {
            // Create Asaas entry object for compatibility
            const entry: AsaasEntry = {
              id: pending.entryId,
              value: pending.entryValue,
              description: `PROCESSO ${pending.processNumber}`,
              status: 'CONFIRMED',
              createdAt: pending.createdAt,
              customerName: pending.clientName,
            };

            const task = await this.archiveCase(
              pending.entryId,
              pending.processNumber,
              pending.clientName,
              caseDetails,
              entry,
              transfer,
              pending.caseType
            );

            if (task) {
              completedTasks.push(task);
              this.pendingArchivings.delete(key); // Remove from pending
            }
          }
        } else {
          // Check if waiting period has expired
          if (new Date() > new Date(pending.awaitingTransferUntil)) {
            console.warn(
              `[Archiving Automation] Gave up waiting for transfer for ${pending.processNumber} (7 days passed)`
            );
            this.pendingArchivings.delete(key);
          }
        }
      } catch (error) {
        console.error(
          `[Archiving Automation] Error processing pending archiving for ${pending.processNumber}:`,
          error
        );
      }
    }

    return completedTasks;
  }

  /**
   * Archive a case (both sucumbencial and contratual)
   */
  private async archiveCase(
    entryId: string,
    processNumber: string,
    clientName: string,
    caseDetails: any,
    entry: AsaasEntry,
    transfer: AsaasTransfer | null,
    caseType: string
  ): Promise<ArchivingTask | null> {
    try {
      // Step 1: Validate all conditions
      const validation = await this.validateArchivingConditions(
        entry,
        caseDetails,
        transfer,
        caseType
      );

      if (!validation.isValid) {
        console.warn(
          `[Archiving Automation] Validation failed for ${processNumber}:`,
          validation.errors
        );
        return null;
      }

      // Step 2: Calculate fees and protocol
      const feesInfo = this.calculateFeesAndProtocol(caseDetails, entry, transfer, caseType);

      // Step 3: Create archiving task
      const taskCreated = await this.createArchivingTask(
        caseDetails.id,
        processNumber,
        clientName,
        caseDetails,
        entry,
        transfer,
        feesInfo
      );

      if (taskCreated) {
        return {
          entryId,
          processNumber,
          clientName,
          caseType: (caseType as 'SUCUMBENCIAL' | 'CONTRATUAL' | 'OTHER'),
          entryValue: entry.value,
          transferValue: transfer?.value,
          honorariesFees: feesInfo.honorariesFees,
          repasse: feesInfo.repasse,
          protocol: feesInfo.protocol,
          readyForExecution: true,
          createdAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error(`Error archiving case ${processNumber}:`, error);
    }

    return null;
  }

  /**
   * Validate all 4 conditions before archiving
   */
  private async validateArchivingConditions(
    entry: AsaasEntry,
    caseDetails: any,
    transfer: AsaasTransfer | null,
    caseType: string
  ): Promise<ArchivingValidation> {
    const checks = {
      entryConfirmed: false,
      caseDataComplete: false,
      noActiveTasksBlocking: false,
      transferConfirmedIfNeeded: false,
    };
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Entry is confirmed
    if (entry.status === 'CONFIRMED') {
      checks.entryConfirmed = true;
    } else {
      errors.push(`Entry status is "${entry.status}", not confirmed`);
    }

    // Check 2: Case data is complete
    if (caseDetails.number && caseDetails.plaintiff_name) {
      checks.caseDataComplete = true;
    } else {
      errors.push('Missing essential case data (process number or client name)');
    }

    // Check 3: No blocking tasks
    try {
      const activeTasks = await this.advboxClient.getCaseTasks(caseDetails.id);
      const blockingTasks = activeTasks.filter(
        (t) =>
          t.status === 'OPEN' &&
          (t.title.toLowerCase().includes('disputa') || t.title.toLowerCase().includes('análise'))
      );

      if (blockingTasks.length === 0) {
        checks.noActiveTasksBlocking = true;
      } else {
        warnings.push(`Found ${blockingTasks.length} potentially blocking tasks`);
      }
    } catch (error) {
      warnings.push('Could not verify blocking tasks');
    }

    // Check 4: Transfer confirmed if not sucumbencial
    if (caseType === 'SUCUMBENCIAL') {
      // No transfer needed
      checks.transferConfirmedIfNeeded = true;
    } else {
      // For contratual, transfer must be confirmed
      if (transfer && (transfer.status === 'COMPLETED' || transfer.status === 'CONFIRMED')) {
        checks.transferConfirmedIfNeeded = true;
      } else {
        errors.push(`Transfer status is not confirmed (got: ${transfer?.status || 'null'})`);
      }
    }

    const isValid = Object.values(checks).every((c) => c === true);

    return {
      isValid,
      checks,
      errors,
      warnings,
    };
  }

  /**
   * Calculate fees based on case type
   */
  private calculateFeesAndProtocol(
    caseDetails: any,
    entry: AsaasEntry,
    transfer: AsaasTransfer | null,
    caseType: string
  ) {
    if (caseType === 'SUCUMBENCIAL') {
      // Sucumbencial: entire entry is office fees (no repasse)
      const honorariesFees = entry.value;
      const repasse = 0;
      const protocol = this.generateProtocol(caseDetails, entry.value, honorariesFees, repasse);

      return {
        feePercentage: 100,
        entryValue: entry.value,
        transferValue: undefined,
        honorariesFees,
        repasse,
        protocol,
      };
    } else {
      // Contratual: calculate percentage from entry
      const feePercentage = this.extractFeePercentage(caseDetails);
      const totalValue = entry.value;
      const honorariesFees = totalValue * (feePercentage / 100);
      const repasse = totalValue - honorariesFees;

      const protocol = this.generateProtocol(caseDetails, totalValue, honorariesFees, repasse);

      return {
        feePercentage,
        entryValue: entry.value,
        transferValue: transfer?.value,
        honorariesFees,
        repasse,
        protocol,
      };
    }
  }

  /**
   * Extract fee percentage from case details
   */
  private extractFeePercentage(caseDetails: any): number {
    const fieldNames = [
      'fee_percentage',
      'honorarios_percentual',
      'percentual_honorarios',
      'percentual',
      'percentage',
      'taxas',
      'taxa_percentual',
      'honor_percent',
      'taxa',
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
   * Generate archiving protocol
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
    entry: AsaasEntry,
    transfer: AsaasTransfer | null,
    feesInfo: any
  ): Promise<boolean> {
    try {
      const taskPayload = {
        lawsuit_id: caseDetails.id,
        title: 'ARQUIVAMENTO DEFINITIVO DE CLIENTE (1 pts)',
        description: `Caso arquivado automaticamente\nProcesso: ${processNumber}\nCliente: ${clientName}\nValor entrada: ${entry.value}${transfer ? `\nValor repasse: ${transfer.value}` : ''}`,
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
          asaas_entry_id: entry.id,
          asaas_transfer_id: transfer?.id || null,
          trigger: 'asaas_driven',
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
