import { SlackNotifier, ArchivingNotification } from './slack-notifier';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;          // Default: 3
  initialDelayMs: number;      // Default: 1000 (1 second)
  maxDelayMs: number;          // Default: 30000 (30 seconds)
  backoffMultiplier: number;   // Default: 2 (exponential)
}

/**
 * Retry attempt result
 */
export interface RetryAttemptResult {
  attempt: number;
  maxAttempts: number;
  success: boolean;
  error?: string;
  delayBeforeRetryMs?: number;
  willRetry: boolean;
}

/**
 * Function signature for retryable operations
 */
export type RetryableOperation = () => Promise<any>;

/**
 * RetryManager: Handles automatic retries with exponential backoff
 *
 * Usage:
 * ```typescript
 * const retryManager = new RetryManager(config, slackNotifier);
 * const result = await retryManager.executeWithRetry(async () => {
 *   // operation that may fail
 * }, notification);
 * ```
 */
export class RetryManager {
  private config: RetryConfig;
  private slackNotifier?: SlackNotifier;

  constructor(config?: Partial<RetryConfig>, slackNotifier?: SlackNotifier) {
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      initialDelayMs: config?.initialDelayMs ?? 1000,
      maxDelayMs: config?.maxDelayMs ?? 30000,
      backoffMultiplier: config?.backoffMultiplier ?? 2,
    };
    this.slackNotifier = slackNotifier;
  }

  /**
   * Executa uma operação com retry automático
   * @param operation Função async que será executada
   * @param notification Notificação para enviar alertas (opcional)
   * @returns Resultado da operação
   */
  async executeWithRetry<T>(
    operation: RetryableOperation,
    notification?: ArchivingNotification
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        console.log(`[Retry Manager] Attempt ${attempt}/${this.config.maxRetries}`);
        const result = await operation();

        if (attempt > 1) {
          console.log(`[Retry Manager] ✅ Success after ${attempt} attempts`);
        }

        return result as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const willRetry = attempt < this.config.maxRetries;

        console.error(
          `[Retry Manager] ❌ Attempt ${attempt} failed:`,
          lastError.message
        );

        if (willRetry) {
          const delayMs = this.calculateDelay(attempt);
          console.log(
            `[Retry Manager] Waiting ${delayMs}ms before retry ${attempt + 1}...`
          );

          // Notify about retry if Slack is configured
          if (notification && this.slackNotifier?.isConfigured()) {
            await this.notifyRetry(notification, attempt, this.config.maxRetries);
          }

          // Wait before retrying
          await this.sleep(delayMs);
        } else {
          console.error(
            `[Retry Manager] ❌ All ${this.config.maxRetries} attempts failed`
          );
        }
      }
    }

    // All retries exhausted
    throw lastError ?? new Error('Operation failed after all retry attempts');
  }

  /**
   * Calcula o delay para a próxima tentativa usando backoff exponencial
   * @param attemptNumber Número da tentativa atual (1-based)
   * @returns Delay em ms
   */
  private calculateDelay(attemptNumber: number): number {
    // Fórmula: initialDelay * (multiplier ^ (attempt - 1))
    const exponentialDelay =
      this.config.initialDelayMs *
      Math.pow(this.config.backoffMultiplier, attemptNumber - 1);

    // Cap at maxDelay
    return Math.min(exponentialDelay, this.config.maxDelayMs);
  }

  /**
   * Espera por um tempo específico
   * @param ms Milissegundos a aguardar
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Notifica sobre retry via Slack
   */
  private async notifyRetry(
    notification: ArchivingNotification,
    attempt: number,
    maxAttempts: number
  ): Promise<void> {
    if (!this.slackNotifier) return;

    try {
      await this.slackNotifier.notifyRetry(notification, attempt, maxAttempts);
    } catch (error) {
      console.error('[Retry Manager] Failed to send Slack retry notification:', error);
    }
  }

  /**
   * Retorna a configuração atual
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Atualiza a configuração
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    console.log('[Retry Manager] Configuration updated:', this.config);
  }
}

/**
 * Singleton instance
 */
let globalRetryManager: RetryManager | null = null;

/**
 * Retorna ou cria a instância global de RetryManager
 */
export function getGlobalRetryManager(
  config?: Partial<RetryConfig>,
  slackNotifier?: SlackNotifier
): RetryManager {
  if (!globalRetryManager) {
    globalRetryManager = new RetryManager(config, slackNotifier);
    console.log('[Retry Manager] Global instance created');
  }
  return globalRetryManager;
}

/**
 * Reseta a instância global (útil para testes)
 */
export function resetGlobalRetryManager(): void {
  globalRetryManager = null;
  console.log('[Retry Manager] Global instance reset');
}

export default RetryManager;
