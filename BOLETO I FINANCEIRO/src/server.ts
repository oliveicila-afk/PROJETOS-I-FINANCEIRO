import { createServer } from 'node:http';
import { config } from './config.js';
import { AsaasClient } from './integrations/asaas.js';
import { sendBoletoTemplate, buildBoletoTemplateData } from './domain/boleto-service.js';
import { getFinancialSummary } from './domain/financial-service.js';
import { SellfluxClient } from './integrations/sellflux.js';
import { AsaasEventStore, parseAsaasPaymentEvent } from './webhooks/asaas-webhook.js';

const asaasEventStore = new AsaasEventStore();

function readBody(request: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) {
        reject(new Error('Payload excede o limite permitido.'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function sendJson(response: import('node:http').ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { status: 'ok', service: 'boleto-i-financeiro' });
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

  if (request.method === 'POST' && request.url === '/boletos/preview') {
    try {
      const payload = JSON.parse(await readBody(request)) as { cpfCnpj?: string; name?: string };
      const asaas = new AsaasClient(config.asaasApiToken, config.asaasApiUrl);
      const summary = await getFinancialSummary(asaas, { cpfCnpj: payload.cpfCnpj, name: payload.name });
      const templateData = summary.openPayments.length > 0
        ? buildBoletoTemplateData(summary.customer, summary.openPayments)
        : null;
      sendJson(response, 200, { customer: summary.customer, openPayments: summary.openPayments, overduePayments: summary.overduePayments, templateData });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível consultar o boleto.';
      sendJson(response, 400, { error: message });
    }
    return;
  }

  if (request.method === 'POST' && request.url === '/boletos/send') {
    try {
      const payload = JSON.parse(await readBody(request)) as {
        cpfCnpj?: string;
        name?: string;
        recipientPhone?: string;
        senderPhone?: string;
        confirm?: boolean;
      };
      if (payload.confirm !== true) {
        sendJson(response, 400, { error: 'Envio bloqueado. Informe confirm: true para autorizar o disparo.' });
        return;
      }
      if (!payload.recipientPhone || !payload.senderPhone) {
        sendJson(response, 400, { error: 'Informe recipientPhone e senderPhone.' });
        return;
      }

      const asaas = new AsaasClient(config.asaasApiToken, config.asaasApiUrl);
      const summary = await getFinancialSummary(asaas, { cpfCnpj: payload.cpfCnpj, name: payload.name });
      const sellflux = new SellfluxClient(config.sellfluxApiToken);
      const result = await sendBoletoTemplate(
        sellflux,
        payload.recipientPhone,
        payload.senderPhone,
        summary.customer,
        summary.openPayments
      );
      sendJson(response, 200, { sent: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível enviar o boleto.';
      sendJson(response, 400, { error: message });
    }
    return;
  }

  sendJson(response, 404, { error: 'Rota nao encontrada.' });
});

server.listen(config.port, () => {
  console.log(`Boleto I financeiro ouvindo na porta ${config.port}.`);
});
