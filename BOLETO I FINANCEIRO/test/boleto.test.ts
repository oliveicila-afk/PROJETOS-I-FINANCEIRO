import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildBoletoTemplateData, sendBoletoTemplate } from '../src/domain/boleto-service.js';
import { getFinancialSummary } from '../src/domain/financial-service.js';
import { identifyCustomerFromConversations } from '../src/domain/customer-identification.js';

const customer = { id: 'cus_1', name: 'Priscila' };

it('monta dados do template com link do boleto', () => {
  assert.deepEqual(buildBoletoTemplateData(customer, [{
    id: 'pay_1', customer: 'cus_1', value: 100, status: 'PENDING', dueDate: '2099-01-01',
    bankSlipUrl: 'https://example.test/boleto'
  }]), {
    nome: 'Priscila', vencimento: '2099-01-01', link_boleto: 'https://example.test/boleto'
  });
});

it('seleciona o template pelo número remetente', async () => {
  let sentTemplateId = 0;
  await sendBoletoTemplate({
    sendWhatsAppTemplate: async (message) => {
      sentTemplateId = message.templateId;
      return {};
    }
  }, '+5591985317845', '+5592982904431', customer, [{
    id: 'pay_1', customer: 'cus_1', value: 100, status: 'PENDING', dueDate: '2099-01-01',
    bankSlipUrl: 'https://example.test/boleto'
  }]);
  assert.equal(sentTemplateId, 2247586429353924);
});

describe('consulta financeira', () => {
  it('consulta somente boletos e separa vencidos', async () => {
    const summary = await getFinancialSummary({
      listCustomers: async () => ({ data: [customer], hasMore: false, totalCount: 1, limit: 10, offset: 0 }),
      listPayments: async (filters) => {
        assert.equal(filters.billingType, 'BOLETO');
        return { data: [{ id: 'pay_1', customer: 'cus_1', value: 100, status: 'PENDING', dueDate: '2099-01-01' }], hasMore: false, totalCount: 1, limit: 100, offset: 0 };
      }
    }, { name: 'Priscila' });
    assert.equal(summary.openPayments.length, 1);
    assert.equal(summary.overduePayments.length, 0);
  });
});

describe('identificação pelas conversas', () => {
  it('busca nos dois números e lê CPF enviado em imagem', async () => {
    const channels: string[] = [];
    const result = await identifyCustomerFromConversations(
      { listCustomers: async (filters) => {
        assert.equal(filters.cpfCnpj, '92572952220');
        return { data: [{ id: 'cus_1', name: 'Priscila Andrade Conceição' }], hasMore: false, totalCount: 1, limit: 10, offset: 0 };
      } },
      { listMessages: async (channel) => { channels.push(channel); return [{ imageUrl: 'rg.jpg' }]; } },
      { read: async () => 'CPF: 925.729.522-20' },
      ['+5592982904431', '+5592981799325'],
      '+5591985317845'
    );
    assert.equal(result.status, 'identified');
    assert.deepEqual(channels, ['+5592982904431', '+5592981799325']);
  });

  it('solicita nome completo ou CPF quando não encontra identificador', async () => {
    const result = await identifyCustomerFromConversations(
      { listCustomers: async () => ({ data: [], hasMore: false, totalCount: 0, limit: 10, offset: 0 }) },
      { listMessages: async () => [{ text: 'oi, preciso do meu boleto' }] },
      { read: async () => '' },
      ['+5592982904431', '+5592981799325'],
      '+5591985317845'
    );
    assert.equal(result.status, 'request_identifier');
    assert.match(result.message, /nome completo ou CPF/);
  });

  it('solicita nome completo ou CPF quando há mais de um cliente possível', async () => {
    const result = await identifyCustomerFromConversations(
      { listCustomers: async () => ({
        data: [
          { id: 'cus_1', name: 'Priscila' },
          { id: 'cus_2', name: 'Priscila' }
        ],
        hasMore: false,
        totalCount: 2,
        limit: 10,
        offset: 0
      }) },
      { listMessages: async () => [{ text: 'meu nome é Priscila' }] },
      { read: async () => '' },
      ['+5592982904431', '+5592981799325'],
      '+5591985317845'
    );
    assert.equal(result.status, 'request_identifier');
    assert.match(result.message, /nome completo ou CPF/);
  });
});
