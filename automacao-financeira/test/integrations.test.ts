import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { AsaasClient, AsaasApiError } from '../src/integrations/asaas.js';
import { SellfluxClient } from '../src/integrations/sellflux.js';
import { CustomerNotFoundError, MultipleCustomersFoundError, getFinancialSummary } from '../src/domain/financial-service.js';
import { buildAutomatedResponse } from '../src/domain/message-service.js';
import { AsaasEventStore, parseAsaasPaymentEvent } from '../src/webhooks/asaas-webhook.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('AsaasClient', () => {
  it('envia access_token e filtros de cliente', async () => {
    let request: Request | undefined;
    globalThis.fetch = async (input, init) => {
      request = new Request(input, init);
      return new Response(JSON.stringify({ data: [], hasMore: false }), { status: 200 });
    };

    await new AsaasClient('asaas-test-token', 'https://sandbox.example/v3').listCustomers({
      cpfCnpj: '12345678900',
      limit: 10
    });

    assert.equal(request?.url, 'https://sandbox.example/v3/customers?cpfCnpj=12345678900&limit=10');
    assert.equal(request?.headers.get('access_token'), 'asaas-test-token');
  });

  it('converte respostas de erro em AsaasApiError', async () => {
    globalThis.fetch = async () => new Response('token invalido', { status: 401 });

    await assert.rejects(
      () => new AsaasClient('asaas-test-token').listPayments(),
      (error: unknown) => error instanceof AsaasApiError && error.status === 401
    );
  });
});

describe('SellfluxClient', () => {
  it('usa Bearer token e filtros de campanhas', async () => {
    let request: Request | undefined;
    globalThis.fetch = async (input, init) => {
      request = new Request(input, init);
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    };

    await new SellfluxClient('sellflux-test-token', 'https://sellflux.example/api').listCampaigns({
      page: 2,
      limit: 30,
      status: 1
    });

    assert.equal(request?.url, 'https://sellflux.example/api/campaigns?page=2&limit=30&status=1');
    assert.equal(request?.headers.get('authorization'), 'Bearer sellflux-test-token');
  });

  it('envia template WhatsApp para um número', async () => {
    let request: Request | undefined;
    globalThis.fetch = async (input, init) => {
      request = new Request(input, init);
      return new Response('', { status: 200 });
    };

    await new SellfluxClient('sellflux-test-token').sendWhatsAppTemplate({
      phone: '+5511999999999',
      templateId: 1,
      data: { boleto_link: 'https://example.test/boleto' }
    });

    assert.equal(request?.method, 'POST');
    assert.equal(request?.url, 'https://apis.sellflux.app/automation/v1/whatsapp/phone');
    assert.equal(request?.headers.get('authorization'), 'Bearer sellflux-test-token');
    assert.deepEqual(await request?.json(), {
      phone: '+5511999999999',
      template_id: 1,
      data: { boleto_link: 'https://example.test/boleto' }
    });
  });
});

describe('getFinancialSummary', () => {
  it('separa cobranças abertas e vencidas', async () => {
    const summary = await getFinancialSummary({
      listCustomers: async () => ({ data: [{ id: 'cus_1', name: 'Cliente Teste' }], hasMore: false, totalCount: 1, limit: 10, offset: 0 }),
      listPayments: async () => ({
        data: [
          { id: 'pay_1', customer: 'cus_1', value: 100, status: 'PENDING', dueDate: '2099-01-01' },
          { id: 'pay_2', customer: 'cus_1', value: 200, status: 'OVERDUE', dueDate: '2025-01-01' },
          { id: 'pay_3', customer: 'cus_1', value: 300, status: 'RECEIVED', dueDate: '2025-01-01' }
        ],
        hasMore: false,
        totalCount: 3,
        limit: 100,
        offset: 0
      })
    }, { cpfCnpj: '12345678900' }, new Date('2026-09-15T12:00:00Z'));

    assert.equal(summary.openPayments.length, 2);
    assert.equal(summary.overduePayments.length, 1);
    assert.equal(summary.overduePayments[0].id, 'pay_2');
  });

  it('rejeita cliente não encontrado ou ambíguo', async () => {
    const noCustomer = { listCustomers: async () => ({ data: [], hasMore: false, totalCount: 0, limit: 10, offset: 0 }), listPayments: async () => { throw new Error('nao deveria chamar'); } };
    const manyCustomers = { listCustomers: async () => ({ data: [{ id: '1', name: 'A' }, { id: '2', name: 'B' }], hasMore: false, totalCount: 2, limit: 10, offset: 0 }), listPayments: async () => { throw new Error('nao deveria chamar'); } };

    await assert.rejects(() => getFinancialSummary(noCustomer, { name: 'Inexistente' }), CustomerNotFoundError);
    await assert.rejects(() => getFinancialSummary(manyCustomers, { name: 'Duplicado' }), MultipleCustomersFoundError);
  });
});

describe('buildAutomatedResponse', () => {
  const summary = {
    customer: { id: 'cus_1', name: 'Cliente Teste' },
    openPayments: [{ id: 'pay_1', customer: 'cus_1', value: 125.5, status: 'PENDING', dueDate: '2099-01-01', bankSlipUrl: 'https://example.test/boleto' }],
    overduePayments: []
  };

  it('responde com boleto quando existe cobrança aberta', () => {
    const response = buildAutomatedResponse('payment', summary);

    assert.match(response.message, /R\$\s?125,50/);
    assert.match(response.message, /https:\/\/example\.test\/boleto/);
    assert.equal(response.transferToHuman, false);
  });

  it('transfere renegociação para atendimento humano', () => {
    const response = buildAutomatedResponse('renegotiation', summary);

    assert.equal(response.transferToHuman, true);
    assert.equal(response.keepOpen, true);
  });

  it('entrega a mensagem do boleto a um remetente simulado', async () => {
    const response = buildAutomatedResponse('payment', summary);
    let deliveredTo = '';
    let deliveredMessage = '';
    const sender = async (phone: string, message: string) => {
      deliveredTo = phone;
      deliveredMessage = message;
    };

    await sender('5511999999999', response.message);

    assert.equal(deliveredTo, '5511999999999');
    assert.match(deliveredMessage, /https:\/\/example\.test\/boleto/);
  });
});

describe('Asaas webhook', () => {
  it('valida eventos e impede duplicidade pelo id', () => {
    const store = new AsaasEventStore();
    const event = parseAsaasPaymentEvent({ id: 'evt_1', event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1' } });

    assert.equal(store.reserve(event.id), true);
    assert.equal(store.reserve(event.id), false);
  });

  it('rejeita payload sem identificador ou evento', () => {
    assert.throws(() => parseAsaasPaymentEvent({ id: 'evt_1' }), /exige id e event/);
  });
});