import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildBemolPaymentAttribution, BEMOL_PJ_CNPJ } from '../src/domain/bemol-service.js';
import { validateBankTransaction } from '../src/domain/bank-transaction.js';
import { AsaasEventStore } from '../src/webhooks/asaas-webhook.js';

describe('AdvBox Asaas conciliacao', () => {
  it('atribui Bemol ao contratante e nao cria cobranca', () => {
    const result = buildBemolPaymentAttribution(BEMOL_PJ_CNPJ, {
      payerName: 'Pagador', contractorName: 'Contratante', closingDate: '2026-09-18', totalAmount: 1000, bemolAmount: 500
    });
    assert.equal(result.financialLaunch.customerName, 'Contratante');
    assert.equal(result.financialLaunch.generateCharge, false);
    assert.equal(result.payer.name, 'Pagador');
  });

  it('rejeita transacao sem valor valido', () => {
    assert.throws(() => validateBankTransaction({ provider: 'csv', providerTransactionId: '1', bankAccountId: 'conta', occurredAt: '2026-09-18', amountInCents: 0, direction: 'CREDIT' }));
  });

  it('mantem idempotencia de webhook durante a execucao', () => {
    const store = new AsaasEventStore();
    assert.equal(store.reserve('evt_1'), true);
    assert.equal(store.reserve('evt_1'), false);
  });
});