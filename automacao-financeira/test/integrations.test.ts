import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { AsaasClient, AsaasApiError } from '../src/integrations/asaas.js';
import { SellfluxClient } from '../src/integrations/sellflux.js';

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
});