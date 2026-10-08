/**
 * Webhook Handler - CRM Financial
 *
 * Recebe webhooks do CRM Financial quando casos mudam de coluna
 * Dispara automação de arquivamento em tempo real
 *
 * Autenticação: Bearer token no header Authorization
 * Payload esperado: { lawsuit_id, process_number, client_name, case_type }
 */

import { ArchivingAutomationService } from '../domain/archiving-automation.js';
import { CaseType } from '../utils/case-type-detector.js';

export interface WebhookPayload {
  lawsuit_id: string;
  process_number: string;
  client_name: string;
  case_type?: 'SUCUMBENCIAL' | 'CONTRATUAL' | 'OTHER' | CaseType;
  timestamp?: string;
  source?: string; // 'CRM_FINANCIAL' ou 'WEBHOOK'
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  case_id?: string;
  timestamp: string;
  error?: string;
}

export class WebhookHandler {
  private automationService: ArchivingAutomationService;
  private logger: any;
  private webhookSecret: string;

  constructor() {
    this.automationService = new ArchivingAutomationService();
    this.webhookSecret = process.env.WEBHOOK_SECRET || 'CHANGE_ME_IN_ENV';
    this.logger = {
      log: (msg: string) => console.log(`[WEBHOOK] ${msg}`),
      error: (msg: string, err?: any) => console.error(`[WEBHOOK] ERROR: ${msg}`, err),
      warn: (msg: string) => console.warn(`[WEBHOOK] WARN: ${msg}`),
    };
  }

  /**
   * Valida o header Authorization
   * Espera: Authorization: Bearer <token>
   */
  validateAuthorization(authHeader: string | undefined): boolean {
    if (!authHeader) {
      this.logger.error('Authorization header missing');
      return false;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer') {
      this.logger.error('Invalid authorization scheme. Expected Bearer');
      return false;
    }

    if (token !== this.webhookSecret) {
      this.logger.error('Invalid or expired token');
      return false;
    }

    return true;
  }

  /**
   * Valida o payload do webhook
   */
  validatePayload(payload: any): payload is WebhookPayload {
    if (!payload || typeof payload !== 'object') {
      this.logger.error('Payload is not an object');
      return false;
    }

    const required = ['lawsuit_id', 'process_number', 'client_name'];
    for (const field of required) {
      if (!payload[field]) {
        this.logger.error(`Missing required field: ${field}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Processa webhook do CRM Financial
   *
   * POST /webhook
   * Header: Authorization: Bearer <token>
   * Body: { lawsuit_id, process_number, client_name, case_type? }
   */
  async handleWebhook(
    authHeader: string | undefined,
    payload: any
  ): Promise<WebhookResponse> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // 1. Validar autenticação
      if (!this.validateAuthorization(authHeader)) {
        return {
          success: false,
          message: 'Unauthorized',
          timestamp,
          error: 'Invalid or missing authorization header',
        };
      }

      this.logger.log(`Webhook received at ${timestamp}`);

      // 2. Validar payload
      if (!this.validatePayload(payload)) {
        return {
          success: false,
          message: 'Invalid payload',
          timestamp,
          error: 'Payload missing required fields: lawsuit_id, process_number, client_name',
        };
      }

      const { lawsuit_id, process_number, client_name, case_type } = payload;

      this.logger.log(
        `Processing: ${client_name} | Process: ${process_number} | Type: ${case_type || 'AUTO'}`
      );

      // 3. Normalizar case_type (converter enum para string literal se necessário)
      let normalizedCaseType: 'SUCUMBENCIAL' | 'CONTRATUAL' | 'OTHER' | undefined;
      if (case_type) {
        const caseTypeStr = String(case_type).toUpperCase();
        if (caseTypeStr === 'SUCUMBENCIAL') {
          normalizedCaseType = 'SUCUMBENCIAL';
        } else if (caseTypeStr === 'CONTRATUAL') {
          normalizedCaseType = 'CONTRATUAL';
        } else {
          normalizedCaseType = 'OTHER';
        }
      }

      // 4. Disparar automação
      await this.automationService.processArchivingCase({
        lawsuitId: lawsuit_id,
        processNumber: process_number,
        clientName: client_name,
        caseType: normalizedCaseType,
      });

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Case processed successfully in ${duration}ms`);

      return {
        success: true,
        message: 'Case processed successfully',
        case_id: lawsuit_id,
        timestamp,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed after ${duration}ms`, error);

      return {
        success: false,
        message: 'Internal server error',
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Testa conexão do webhook (GET /webhook/health)
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Factory function para Express/fastify middleware
 *
 * Uso em Express:
 * app.post('/webhook', webhookMiddleware);
 *
 * Uso em Fastify:
 * app.post('/webhook', async (req, reply) => {
 *   const response = await webhookMiddleware(req, reply);
 *   return response;
 * });
 */
export async function webhookMiddleware(req: any, res: any): Promise<void> {
  const handler = new WebhookHandler();
  const authHeader = req.headers.authorization;
  const payload = req.body;

  const response = await handler.handleWebhook(authHeader, payload);

  const statusCode = response.success ? 200 : response.error?.includes('Unauthorized') ? 401 : 400;
  res.status(statusCode).json(response);
}

export default WebhookHandler;
