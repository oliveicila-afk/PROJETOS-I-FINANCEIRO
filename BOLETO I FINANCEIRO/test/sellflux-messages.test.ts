import assert from 'node:assert/strict';
import { it } from 'node:test';
import { buildSellfluxMessageResponse, parseSellfluxInboundMessage } from '../src/integrations/sellflux-messages.js';

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