/**
 * ArchivingAutomationWithAlerts: Enhanced ArchivingAutomationService
 *
 * Integra:
 * - RetryManager: Retry automático com backoff exponencial
 * - SlackNotifier: Notificações em Slack
 * - HistoryService: Rastreamento de tentativas
 * - AlertingService: Orquestração de alertas em múltiplos canais
 */

import { ArchivingAutomationService, WebhookArchivingPayload, ArchivingTask } from './archiving-automation.js';
import { RetryManager, RetryConfig } from '../services/retry-manager.js';
import { SlackNotifier, ArchivingNotification } from '../services/slack-notifier.js';
import { HistoryService } from '../services/history-service.js';
import { AlertingService } from '../services/alerting-service.js';

/**
 * Configuração para automação com alertas
 */
export interface ArchivingWithAlertsConfig {
  enableRetry: boolean;
  retryConfig?: Partial<RetryConfig>;
  enableSlack: boolean;
  enableHistory: boolean;
  enableAlerting: boolean;
}

/**
 * ArchivingAutomationWithAlerts: Wrapper que adiciona retry, alertas e histórico
 */
export class ArchivingAutomationWithAlerts {
  private automationService: ArchivingAutomationService;
  private retryManager?: RetryManager;
  private slackNotifier?: SlackNotifier;
  private historyService?: HistoryService;
  private alertingService?: AlertingService;
  private config: ArchivingWithAlertsConfig;

  constructor(config: ArchivingWithAlertsConfig = {
    enableRetry: true,
    enableSlack: true,
    enableHistory: true,
    enableAlerting: true,
  }) {
    this.automationService = new ArchivingAutomationService();
    this.config = config;

    // Inicializa serviços baseado na configuração
    if (this.config.enableSlack) {
      this.slackNotifier = new SlackNotifier();
    }

    if (this.config.enableRetry) {
      this.retryManager = new RetryManager(
        this.config.retryConfig,
        this.slackNotifier
      );
    }

    if (this.config.enableHistory) {
      this.historyService = new HistoryService();
    }

    if (this.config.enableAlerting) {
      this.alertingService = new AlertingService({
        enableSlack: this.config.enableSlack,
        enableEmail: false,
        enableLogging: true,
        slackNotifier: this.slackNotifier,
        historyService: this.historyService,
      });
    }

    console.log('[Archiving Automation With Alerts] Initialized with config:', {
      retry: this.config.enableRetry,
      slack: this.config.enableSlack,
      history: this.config.enableHistory,
      alerting: this.config.enableAlerting,
    });
  }

  /**
   * Processa archiving case com retry automático e notificações
   */
  async processArchivingCaseWithRetry(
    payload: WebhookArchivingPayload
  ): Promise<ArchivingTask | null> {
    const startTime = Date.now();
    const notification: ArchivingNotification = {
      type: 'warning',
      lawsuitId: payload.lawsuitId,
      processNumber: payload.processNumber,
      clientName: payload.clientName,
      message: `Iniciando arquivamento: ${payload.clientName}`,
      timestamp: new Date().toISOString(),
    };

    try {
      // Executa com retry se configurado
      if (this.retryManager && this.config.enableRetry) {
        console.log('[Archiving With Alerts] Executing with automatic retry...');

        const result = (await this.retryManager.executeWithRetry<ArchivingTask | null>(async () => {
          return this.automationService.processArchivingCase(payload);
        }, notification)) as ArchivingTask | null;

        const durationMs = Date.now() - startTime;

        // Notifica sucesso
        if (result && this.alertingService) {
          const successNotification: ArchivingNotification = {
            type: 'success',
            lawsuitId: payload.lawsuitId,
            processNumber: payload.processNumber,
            clientName: payload.clientName,
            message: `✅ Arquivamento concluído com sucesso`,
            timestamp: new Date().toISOString(),
            taskId: result.entryId,
          };

          await this.alertingService.notifySuccess(successNotification);
        }

        // Registra no histórico
        if (this.historyService && result) {
          this.historyService.addEntry({
            timestamp: new Date().toISOString(),
            processNumber: payload.processNumber,
            clientName: payload.clientName,
            lawsuitId: payload.lawsuitId,
            status: 'success',
            attempt: 1,
            maxAttempts: this.config.retryConfig?.maxRetries ?? 3,
            result: {
              taskId: result.entryId,
              protocol: result.protocol,
              honoraries: `R$ ${result.honorariesFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              caseType: result.caseType,
            },
            durationMs,
          });
        }

        return result;
      } else {
        // Executa sem retry
        console.log('[Archiving With Alerts] Executing without automatic retry');
        const result = await this.automationService.processArchivingCase(payload);

        if (result && this.alertingService) {
          const successNotification: ArchivingNotification = {
            type: 'success',
            lawsuitId: payload.lawsuitId,
            processNumber: payload.processNumber,
            clientName: payload.clientName,
            message: `✅ Arquivamento concluído com sucesso`,
            timestamp: new Date().toISOString(),
            taskId: result.entryId,
          };

          await this.alertingService.notifySuccess(successNotification);
        }

        return result;
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Notifica erro
      if (this.alertingService) {
        const errorNotification: ArchivingNotification = {
          type: 'error',
          lawsuitId: payload.lawsuitId,
          processNumber: payload.processNumber,
          clientName: payload.clientName,
          message: `❌ Falha ao arquivar caso`,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        };

        await this.alertingService.notifyError(errorNotification);
      }

      // Registra no histórico
      if (this.historyService) {
        this.historyService.addEntry({
          timestamp: new Date().toISOString(),
          processNumber: payload.processNumber,
          clientName: payload.clientName,
          lawsuitId: payload.lawsuitId,
          status: 'error',
          attempt: 1,
          maxAttempts: this.config.retryConfig?.maxRetries ?? 3,
          errorMessage,
          durationMs,
        });
      }

      throw error;
    }
  }

  /**
   * Processa candidatos para arquivamento com retry e alertas
   */
  async processArchivingCandidatesWithAlerts(): Promise<ArchivingTask[]> {
    console.log('[Archiving With Alerts] Starting archiving process with alerts...');

    try {
      const tasks = await this.automationService.processArchivingCandidates();

      if (tasks.length > 0 && this.alertingService) {
        console.log(`[Archiving With Alerts] ${tasks.length} tasks completed, notifying...`);

        // Notifica cada task completada
        for (const task of tasks) {
          const notification: ArchivingNotification = {
            type: 'success',
            lawsuitId: task.entryId,
            processNumber: task.processNumber,
            clientName: task.clientName,
            message: `✅ Tarefa de arquivamento criada: ${task.protocol}`,
            timestamp: task.createdAt,
            taskId: task.entryId,
          };

          await this.alertingService.notifySuccess(notification);
        }
      }

      return tasks;
    } catch (error) {
      console.error('[Archiving With Alerts] Error in archiving process:', error);

      if (this.alertingService) {
        const errorNotification: ArchivingNotification = {
          type: 'error',
          lawsuitId: 'UNKNOWN',
          processNumber: 'UNKNOWN',
          clientName: 'UNKNOWN',
          message: `❌ Erro crítico no processo de arquivamento`,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        };

        await this.alertingService.notifyCritical(errorNotification);
      }

      throw error;
    }
  }

  /**
   * Retorna histórico de arquivamentos
   */
  getHistory() {
    return this.historyService?.getState() ?? null;
  }

  /**
   * Retorna estatísticas
   */
  getStatistics() {
    return this.historyService?.getStatistics() ?? null;
  }

  /**
   * Retorna contadores de alertas críticos
   */
  getCriticalAlertCount(): number {
    return this.alertingService?.getCriticalCount() ?? 0;
  }

  /**
   * Atualiza configuração de retry
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    if (this.retryManager) {
      this.retryManager.updateConfig(config);
    }
  }

  /**
   * Obtém serviço de automação subjacente
   */
  getAutomationService(): ArchivingAutomationService {
    return this.automationService;
  }

  /**
   * Obtém serviço de retry
   */
  getRetryManager(): RetryManager | undefined {
    return this.retryManager;
  }

  /**
   * Obtém serviço de histórico
   */
  getHistoryService(): HistoryService | undefined {
    return this.historyService;
  }

  /**
   * Obtém serviço de alertas
   */
  getAlertingService(): AlertingService | undefined {
    return this.alertingService;
  }
}

/**
 * Singleton instance
 */
let globalArchivingWithAlerts: ArchivingAutomationWithAlerts | null = null;

/**
 * Retorna ou cria instância global
 */
export function getGlobalArchivingWithAlerts(
  config?: ArchivingWithAlertsConfig
): ArchivingAutomationWithAlerts {
  if (!globalArchivingWithAlerts) {
    globalArchivingWithAlerts = new ArchivingAutomationWithAlerts(config);
    console.log('[Archiving With Alerts] Global instance created');
  }
  return globalArchivingWithAlerts;
}

/**
 * Reseta instância global (útil para testes)
 */
export function resetGlobalArchivingWithAlerts(): void {
  globalArchivingWithAlerts = null;
  console.log('[Archiving With Alerts] Global instance reset');
}

export default ArchivingAutomationWithAlerts;
