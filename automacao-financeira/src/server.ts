import { createServer } from 'node:http';
import { config } from './config.js';
import { AsaasEventStore, parseAsaasPaymentEvent } from './webhooks/asaas-webhook.js';

const asaasEventStore = new AsaasEventStore();

function sendJson(response: import('node:http').ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function readBody(request: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Payload excede o limite permitido.'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { status: 'ok', service: 'automacao-financeira' });
    return;
  }

  if (request.method === 'POST' && request.url === '/webhooks/asaas/payments') {
    if (!config.asaasWebhookToken || request.headers['asaas-access-token'] !== config.asaasWebhookToken) {
      sendJson(response, 401, { error: 'Webhook nao autorizado.' });
      return;
    }

    try {
      const payload = parseAsaasPaymentEvent(JSON.parse(await readBody(request)));
      const firstDelivery = asaasEventStore.reserve(payload.id);
      sendJson(response, 200, { received: true, duplicate: !firstDelivery });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payload invalido.';
      sendJson(response, 400, { error: message });
    }
    return;
  }

  sendJson(response, 404, { error: 'Rota nao encontrada.' });
});

server.listen(config.port, () => {
  console.log(`Automacao financeira ouvindo na porta ${config.port}.`);
});