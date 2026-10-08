import axios, { AxiosInstance } from 'axios';

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
  thread_ts?: string;
}

export interface ArchivingNotification {
  type: 'success' | 'error' | 'warning';
  lawsuitId: string;
  processNumber: string;
  clientName: string;
  message: string;
  error?: string;
  timestamp: string;
  taskId?: string;
}

export class SlackNotifier {
  private client!: AxiosInstance;
  private webhookUrl: string;
  private isEnabled: boolean;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    this.isEnabled = !!this.webhookUrl;

    if (this.isEnabled) {
      this.client = axios.create({
        timeout: 5000,
      });
    }
  }

  /**
   * Notifica sucesso de arquivamento
   */
  async notifySuccess(notification: ArchivingNotification): Promise<void> {
    if (!this.isEnabled) {
      console.log('[Slack] Webhook não configurado, notificação não enviada');
      return;
    }

    const message = this.buildSuccessMessage(notification);
    await this.send(message);
  }

  /**
   * Notifica erro de arquivamento
   */
  async notifyError(notification: ArchivingNotification): Promise<void> {
    if (!this.isEnabled) {
      console.log('[Slack] Webhook não configurado, notificação não enviada');
      return;
    }

    const message = this.buildErrorMessage(notification);
    await this.send(message);
  }

  /**
   * Notifica retry automático
   */
  async notifyRetry(
    notification: ArchivingNotification,
    attempt: number,
    maxAttempts: number
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    const message = this.buildRetryMessage(
      notification,
      attempt,
      maxAttempts
    );
    await this.send(message);
  }

  /**
   * Constrói mensagem de sucesso
   */
  private buildSuccessMessage(notification: ArchivingNotification): SlackMessage {
    return {
      channel: process.env.SLACK_CHANNEL || '#automacao',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✅ Arquivamento Completado',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Caso:*\n${notification.clientName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Processo:*\n${notification.processNumber}`,
            },
            {
              type: 'mrkdwn',
              text: `*ID da Tarefa:*\n${notification.taskId || 'N/A'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Timestamp:*\n${notification.timestamp}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📋 ${notification.message}`,
          },
        },
        {
          type: 'divider',
        },
      ],
      text: `Arquivamento completado: ${notification.clientName}`,
    };
  }

  /**
   * Constrói mensagem de erro
   */
  private buildErrorMessage(notification: ArchivingNotification): SlackMessage {
    return {
      channel: process.env.SLACK_CHANNEL_ALERTS || '#alertas',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Erro no Arquivamento',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Caso:*\n${notification.clientName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Processo:*\n${notification.processNumber}`,
            },
            {
              type: 'mrkdwn',
              text: `*Lawsuit ID:*\n${notification.lawsuitId}`,
            },
            {
              type: 'mrkdwn',
              text: `*Timestamp:*\n${notification.timestamp}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Erro:*\n\`\`\`${notification.error || 'Desconhecido'}\`\`\``,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⚠️ ${notification.message}`,
          },
        },
        {
          type: 'divider',
        },
      ],
      text: `Erro no arquivamento: ${notification.clientName}`,
    };
  }

  /**
   * Constrói mensagem de retry
   */
  private buildRetryMessage(
    notification: ArchivingNotification,
    attempt: number,
    maxAttempts: number
  ): SlackMessage {
    return {
      channel: process.env.SLACK_CHANNEL_ALERTS || '#alertas',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔄 Retry em Progresso',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Caso:*\n${notification.clientName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Tentativa:*\n${attempt}/${maxAttempts}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Tentando novamente em breve...\nErro anterior: \`${notification.error}\``,
          },
        },
      ],
      text: `Retry ${attempt}/${maxAttempts}: ${notification.clientName}`,
    };
  }

  /**
   * Envia mensagem para Slack
   */
  private async send(message: SlackMessage): Promise<void> {
    try {
      await this.client.post(this.webhookUrl, message);
      console.log('[Slack] Mensagem enviada com sucesso');
    } catch (error) {
      console.error(
        '[Slack] Erro ao enviar mensagem:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Verifica se Slack está configurado
   */
  isConfigured(): boolean {
    return this.isEnabled;
  }
}

export default SlackNotifier;
