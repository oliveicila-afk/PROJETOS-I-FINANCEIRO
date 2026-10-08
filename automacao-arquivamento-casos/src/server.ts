/**
 * Webhook Server - Phase 4 Implementation
 *
 * REST API server that:
 * 1. Accepts webhook POST from CRM Financial when cases move to archiving column
 * 2. Validates Bearer token authorization
 * 3. Dispatches to ArchivingAutomationService for processing
 * 4. Runs CRM polling fallback in background (checks every 15 minutes)
 * 5. Provides health check endpoint
 */

import express, { Express, Request, Response } from 'express';
import { WebhookHandler } from './integrations/webhook-handler.js';
import { getPollingInstance, startGlobalPolling, stopGlobalPolling } from './integrations/crm-polling.js';

export class WebhookServer {
  private app: Express;
  private port: number;
  private webhookHandler: WebhookHandler;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.webhookHandler = new WebhookHandler();

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Parse JSON bodies
    this.app.use(express.json());

    // Request logging middleware
    this.app.use((req: Request, res: Response, next) => {
      const startTime = Date.now();

      // Override res.json to log responses
      const originalJson = res.json.bind(res);
      res.json = function (data) {
        const duration = Date.now() - startTime;
        console.log(
          `[HTTP] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
        );
        return originalJson(data);
      };

      next();
    });
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      const polling = getPollingInstance();
      const status = polling.getStatus();

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        polling: {
          isRunning: status.isRunning,
          lastProcessedTimestamp: status.lastProcessedTimestamp,
          errorCount: status.errorCount,
        },
      });
    });

    // Webhook endpoint for CRM Financial
    this.app.post('/webhook', async (req: Request, res: Response) => {
      const authHeader = req.headers.authorization;
      const payload = req.body;

      try {
        const response = await this.webhookHandler.handleWebhook(authHeader, payload);
        const statusCode = response.success
          ? 200
          : response.error?.includes('Unauthorized')
            ? 401
            : 400;

        res.status(statusCode).json(response);
      } catch (error) {
        console.error('[HTTP] Error handling webhook:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Webhook health check endpoint
    this.app.get('/webhook/health', async (req: Request, res: Response) => {
      const healthCheck = await this.webhookHandler.healthCheck();
      res.json(healthCheck);
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not found',
        path: req.path,
        method: req.method,
      });
    });
  }

  /**
   * Start the server and CRM polling
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Start CRM polling fallback
      console.log('[Server] Starting CRM polling fallback...');
      startGlobalPolling();

      // Start Express server
      const server = this.app.listen(this.port, () => {
        console.log(`\n🚀 Webhook Server is running on port ${this.port}`);
        console.log(`📍 POST  http://localhost:${this.port}/webhook`);
        console.log(`❤️  GET   http://localhost:${this.port}/health`);
        console.log(`📡 GET   http://localhost:${this.port}/webhook/health\n`);

        resolve();
      });

      // Handle server errors
      server.on('error', (error) => {
        console.error('[Server] Fatal error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the server and CRM polling
   */
  public stop(): void {
    console.log('[Server] Stopping CRM polling...');
    stopGlobalPolling();

    console.log('[Server] Server stopped');
  }
}

/**
 * Main entry point for server
 */
async function main() {
  const port = parseInt(process.env.WEBHOOK_PORT || '3000', 10);

  const server = new WebhookServer(port);

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n[Server] Shutting down gracefully...');
    server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await server.start();
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default WebhookServer;
