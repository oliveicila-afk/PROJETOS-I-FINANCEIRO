import assert from 'node:assert/strict';
import { it } from 'node:test';
import { buildSellfluxMessageResponse, parseSellfluxInboundMessage } from '../src/integrations/sellflux-messages.js';
import { extractIdentifierFromMessage, parseSellfluxWebhook } from '../src/webhooks/sellflux-webhook.js';

it('valida e normaliza uma mensagem recebida do SellFlux', () => {
  assert.deepEqual(parseSellfluxInboundMessage({
    messageId: ' msg_1 ',
    recipientPhone: '+5591985317845',
    channelPhone: '+5592982904431',
    text: '  preciso do meu boleto  '
  }), {
    messageId: 'msg_1',
    recipientPhone: '+5591985317845',
    channelPhone: '+5592982904431',
    text: 'preciso do meu boleto',
    imageUrl: undefined
  });
});

it('rejeita mensagem sem conteúdo', () => {
  assert.throws(() => parseSellfluxInboundMessage({
    messageId: 'msg_1',
    recipientPhone: '+5591985317845',
    channelPhone: '+5592982904431'
  }), /text ou imageUrl/);
});

it('monta resposta de texto para o canal', () => {
  assert.deepEqual(buildSellfluxMessageResponse('+5591985317845', ' Informe seu CPF. '), {
    phone: '+5591985317845',
    text: 'Informe seu CPF.'
  });
});

it('extrai CPF da mensagem recebida do webhook', () => {
  const payload = parseSellfluxWebhook({
    event: 'message_received',
    timestamp: '2026-09-17T12:00:00Z',
    project_id: 1,
    device_id: 2,
    device_name: 'Boleto',
    chat_id: 'chat_1',
    lead: { id: 1, name: '', phone: '+5591985317845' },
    message: { id: 'msg_1', type: 'chat', body: 'Meu CPF é 925.729.522-20', from_me: false, is_group: false }
  });
  assert.deepEqual(extractIdentifierFromMessage(payload), { cpfCnpj: '92572952220', name: undefined });
});