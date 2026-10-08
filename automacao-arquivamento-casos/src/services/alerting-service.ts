import { SlackNotifier, ArchivingNotification } from './slack-notifier';
import { HistoryService } from './history-service';

/**
 * Tipos de alerta
 */
export type AlertType = 'success' | 'error' | 'warning' | 'retry' | 'critical';

/**
 * Configuração de alertas
 */
export interface AlertingConfig {
  enableSlack: boolean;
  enableEmail: boolean;
  enableLogging: boolean;
  slackNotifier?: SlackNotifier;
  historyService?: HistoryService;
}

/**
 * Resultado de envio de alerta
 */
export interface AlertResult {
  type: AlertType;
  notification: ArchivingNotification;
  channels: {
    slack?: { success: boolean; error?: string };
    email?: { success: boolean; error?: string };
    logging?: { success: boolean; error?: string };
  };
  timestamp: string;
}

/**
 * AlertingService: Orquestra notificações em múltiplos canais
 *
 * Responsabilidades:
 * - Enviar notificações para Slack quando configurado
 * - Registrar em histórico para auditoria
 * - Registrar em logs estruturados
 * - Alertas críticos podem dispararEmail futuro
 */
export class AlertingService {
  private config: AlertingConfig;
  private criticalAlertCount: number = 0;

  constructor(config: AlertingConfig) {
    this.config = {
      enableSlack: config.enableSlack ?? true,
      enableEmail: config.enableEmail ?? false,
      enableLogging: config.enableLogging ?? true,
      slackNotifier: config.slackNotifier,
      historyService: config.historyService,
    };

    console.log('[Alerting Service] Initialized with config:', {
      slack: this.config.enableSlack,
      email: this.config.enableEmail,
      logging: this.config.enableLogging,
    });
  }

  /**
   * Envia alerta de sucesso
   */
  async notifySuccess(notification: ArchivingNotification): Promise<AlertResult> {
    console.log(
      `[Alerting Service] 📢 SUCCESS: ${notification.clientName} | ${notification.processNumber}`
    );

    const result: AlertResult = {
      type: 'success',
      notification,
      channels: {},
      timestamp: new Date().toISOString(),
    };

    // Slack
    if (this.config.enableSlack && this.config.slackNotifier?.isConfigured()) {
      result.channels.slack = await this.sendToSlack(notification, 'success');
    }

    // Histórico
    if (this.config.historyService) {
      this.addToHistory(notification, 'success');
    }

    // Logging
    if (this.config.enableLogging) {
      this.logAlert(result);
    }

    return result;
  }

  /**
   * Envia alerta de erro
   */
  async notifyError(notification: ArchivingNotification): Promise<AlertResult> {
    console.error(
      `[Alerting Service] 🚨 ERROR: ${notification.clientName} | ${notification.error}`
    );

    const result: AlertResult = {
      type: 'error',
      notification,
      channels: {},
      timestamp: new Date().toISOString(),
    };

    // Slack
    if (this.config.enableSlack && this.config.slackNotifier?.isConfigured()) {
      result.channels.slack = await this.sendToSlack(notification, 'error');
    }

    // Histórico
    if (this.config.historyService) {
      this.addToHistory(notification, 'error');
    }

    // Logging
    if (this.config.enableLogging) {
      this.logAlert(result);
    }

    return result;
  }

  /**
   * Envia alerta de warning
   */
  async notifyWarning(notification: ArchivingNotification): Promise<AlertResult> {
    console.warn(
      `[Alerting Service] ⚠️  WARNING: ${notification.clientName} | ${notification.message}`
    );

    const result: AlertResult = {
      type: 'warning',
      notification,
      channels: {},
      timestamp: new Date().toISOString(),
    };

    // Slack
    if (this.config.enableSlack && this.config.slackNotifier?.isConfigured()) {
      result.channels.slack = await this.sendToSlack(notification, 'warning');
    }

    // Histórico
    if (this.config.historyService) {
      this.addToHistory(notification, 'error'); // Registra como erro
    }

    // Logging
    if (this.config.enableLogging) {
      this.logAlert(result);
    }

    return result;
  }

  /**
   * Envia alerta crítico
   */
  async notifyCritical(notification: ArchivingNotification): Promise<AlertResult> {
    console.error(
      `[Alerting Service] 🔴 CRITICAL: ${notification.clientName} | ${notification.error}`
    );

    this.criticalAlertCount++;

    const result: AlertResult = {
      type: 'critical',
      notification,
      channels: {},
      timestamp: new Date().toISOString(),
    };

    // Slack (sempre)
    if (this.config.slackNotifier?.isConfigured()) {
      result.channels.slack = await this.sendToSlack(notification, 'critical');
    }

    // Email (futuro)
    if (this.config.enableEmail) {
      result.channels.email = {
        success: false,
        error: 'Email notifications not yet implemented',
      };
    }

    // Histórico
    if (this.config.historyService) {
      this.addToHistory(notification, 'error');
    }

    // Logging
    if (this.config.enableLogging) {
      this.logAlert(result);
    }

    // Se 3+ alertas críticos em sequência, pode indicar falha sistêmica
    if (this.criticalAlertCount >= 3) {
      console.error('[Alerting Service] ⚠️  Multiple critical alerts detected - system may be unstable');
    }

    return result;
  }

  /**
   * Envia para Slack
   */
  private async sendToSlack(
    notification: ArchivingNotification,
    alertType: AlertType
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config.slackNotifier) {
        return { success: false, error: 'Slack notifier not configured' };
      }

      if (alertType === 'success') {
        await this.config.slackNotifier.notifySuccess(notification);
      } else if (alertType === 'error' || alertType === 'critical') {
        await this.config.slackNotifier.notifyError(notification);
      } else if (alertType === 'warning') {
        await this.config.slackNotifier.notifyError(notification);
      }

      console.log('[Alerting Service] ✅ Slack notification sent');
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Alerting Service] ❌ Slack notification failed:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Adiciona ao histórico
   */
  private addToHistory(
    notification: ArchivingNotification,
    status: 'success' | 'error'
  ): void {
    try {
      if (!this.config.historyService) return;

      this.config.historyService.addEntry({
        timestamp: notification.timestamp,
        processNumber: notification.processNumber,
        clientName: notification.clientName,
        lawsuitId: notification.lawsuitId,
        status,
        attempt: 1,
        maxAttempts: 1,
        errorMessage: notification.error,
        durationMs: 0,
      });
    } catch (error) {
      console.error('[Alerting Service] Failed to add to history:', error);
    }
  }

  /**
   * Registra alerta em logs
   */
  private logAlert(result: AlertResult): void {
    const logEntry = {
      type: result.type,
      timestamp: result.timestamp,
      processNumber: result.notification.processNumber,
      clientName: result.notification.clientName,
      channels: Object.keys(result.channels).filter(
        (ch) => result.channels[ch as keyof typeof result.channels]?.success
      ),
    };

    console.log('[Alerting Service] 📝 Alert logged:', JSON.stringify(logEntry));
  }

  /**
   * Reseta contador de alertas críticos
   */
  resetCriticalCount(): void {
    this.criticalAlertCount = 0;
    console.log('[Alerting Service] Critical alert count reset');
  }

  /**
   * Retorna contagem de alertas críticos
   */
  getCriticalCount(): number {
    return this.criticalAlertCount;
  }
}

/**
 * Singleton instance
 */
let globalAlertingService: AlertingService | null = null;

/**
 * Retorna ou cria instância global
 */
export function getGlobalAlertingService(config?: AlertingConfig): AlertingService {
  if (!globalAlertingService) {
    globalAlertingService = new AlertingService(config || {
      enableSlack: true,
      enableEmail: false,
      enableLogging: true,
    });
    console.log('[Alerting Service] Global instance created');
  }
  return globalAlertingService;
}

/**
 * Reseta instância global (útil para testes)
 */
export function resetGlobalAlertingService(): void {
  globalAlertingService = null;
  console.log('[Alerting Service] Global instance reset');
}

export default AlertingService;
