/**
 * CRM Polling - Fallback quando webhook falha
 *
 * Monitora CRM Financial a cada 15 minutos
 * Detecta casos que mudaram para coluna de arquivamento
 * Dispara automação se webhook não foi executado
 *
 * Armazena lastProcessedTimestamp para evitar duplicatas
 */

import { CRMClient } from './crm-client.js';
import { ArchivingAutomationService } from '../domain/archiving-automation.js';
import { config } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

export interface PollingState {
  lastProcessedTimestamp: string;
  lastProcessedCases: Set<string>;
  isRunning: boolean;
  lastError?: string;
  errorCount: number;
}

export class CrmPolling {
  private crmClient: CRMClient;
  private automationService: ArchivingAutomationService;
  private pollingIntervalMs: number = 15 * 60 * 1000; // 15 minutes
  private pollingTimer?: NodeJS.Timeout;
  private stateFile: string;
  private state: PollingState;
  private logger: any;

  constructor() {
    this.crmClient = new CRMClient();
    this.automationService = new ArchivingAutomationService();
    this.stateFile = path.join(process.cwd(), '.polling-state.json');
    this.state = this.loadState();
    this.logger = {
      log: (msg: string) => console.log(`[CRM_POLLING] ${msg}`),
      error: (msg: string, err?: any) => console.error(`[CRM_POLLING] ERROR: ${msg}`, err),
      warn: (msg: string) => console.warn(`[CRM_POLLING] WARN: ${msg}`),
    };
  }

  /**
   * Carrega estado anterior para evitar reprocessamento
   */
  private loadState(): PollingState {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
        return {
          ...data,
          lastProcessedCases: new Set(data.lastProcessedCases || []),
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to load polling state: ${error}`);
    }

    return {
      lastProcessedTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
      lastProcessedCases: new Set(),
      isRunning: false,
      errorCount: 0,
    };
  }

  /**
   * Salva estado para próxima execução
   */
  private saveState(): void {
    try {
      const state = {
        ...this.state,
        lastProcessedCases: Array.from(this.state.lastProcessedCases),
      };
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save polling state: ${error}`);
    }
  }

  /**
   * Inicia o polling automático a cada 15 minutos
   */
  public startPolling(): void {
    if (this.state.isRunning) {
      this.logger.warn('Polling already running');
      return;
    }

    this.state.isRunning = true;
    this.logger.log(`Starting polling every ${this.pollingIntervalMs / 1000 / 60} minutes`);

    // Primeira execução imediata
    this.pollOnce();

    // Próximas execuções a cada 15 minutos
    this.pollingTimer = setInterval(() => {
      this.pollOnce();
    }, this.pollingIntervalMs);
  }

  /**
   * Para o polling automático
   */
  public stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
    this.state.isRunning = false;
    this.logger.log('Polling stopped');
  }

  /**
   * Executa uma rodada de polling
   */
  public async pollOnce(): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log('Polling cycle started...');

      // 1. Buscar casos em coluna de arquivamento
      const casesInArchivingColumn = await this.crmClient.getCasesReadyForArchiving();

      this.logger.log(`Found ${casesInArchivingColumn.length} cases in archiving column`);

      // 2. Filtrar casos novos (não processados antes)
      const newCases = casesInArchivingColumn.filter((case_: any) => {
        const caseId = case_.id;
        const isNew = !this.state.lastProcessedCases.has(caseId);
        const isRecent = new Date(case_.created_at || case_.updated_at).getTime() >
          new Date(this.state.lastProcessedTimestamp).getTime();

        return isNew || isRecent;
      });

      this.logger.log(`Found ${newCases.length} new cases to process`);

      // 3. Processar cada caso novo
      for (const case_ of newCases) {
        try {
          this.logger.log(`Processing: ${case_.client_name} | Process: ${case_.process_number}`);

          await this.automationService.processArchivingCase({
            lawsuitId: case_.id,
            processNumber: case_.process_number || '',
            clientName: case_.client_name || '',
          });

          // Marcar como processado
          this.state.lastProcessedCases.add(case_.id);
        } catch (error) {
          this.logger.error(`Failed to process case ${case_.id}:`, error);
          // Continuar com próximo caso, não parar polling
        }
      }

      // 4. Atualizar estado
      this.state.lastProcessedTimestamp = new Date().toISOString();
      this.state.errorCount = 0;
      this.saveState();

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Polling cycle completed in ${duration}ms. Processed ${newCases.length} cases`);
    } catch (error) {
      this.state.errorCount++;
      this.state.lastError = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Polling cycle failed (attempt ${this.state.errorCount}):`, error);

      // Se erros consecutivos > 3, notificar administrador
      if (this.state.errorCount >= 3) {
        await this.notifyAdministrator({
          type: 'polling_failure',
          message: `CRM Polling failed ${this.state.errorCount} times`,
          error: this.state.lastError,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Notifica administrador de falhas críticas
   */
  private async notifyAdministrator(alert: any): Promise<void> {
    // TODO: Implementar notificação por email/Slack
    this.logger.warn(`ALERT: ${JSON.stringify(alert)}`);
  }

  /**
   * Retorna status do polling
   */
  public getStatus(): PollingState {
    return {
      ...this.state,
      lastProcessedCases: this.state.lastProcessedCases, // Set é serializado como Array no JSON
    };
  }
}

/**
 * Singleton global para gerenciar polling
 */
let pollingInstance: CrmPolling | null = null;

export function getPollingInstance(): CrmPolling {
  if (!pollingInstance) {
    pollingInstance = new CrmPolling();
  }
  return pollingInstance;
}

export function startGlobalPolling(): void {
  const polling = getPollingInstance();
  polling.startPolling();
}

export function stopGlobalPolling(): void {
  const polling = getPollingInstance();
  polling.stopPolling();
}

export default CrmPolling;
