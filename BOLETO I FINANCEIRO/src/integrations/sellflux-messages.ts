export type SellfluxInboundMessage = {
  messageId: string;
  recipientPhone: string;
  channelPhone: string;
  text?: string;
  imageUrl?: string;
};

export type SellfluxMessageResponse = {
  phone: string;
  text: string;
};

export function parseSellfluxInboundMessage(value: unknown): SellfluxInboundMessage {
  if (!value || typeof value !== 'object') {
    throw new Error('Mensagem SellFlux deve ser um objeto JSON.');
  }

  const payload = value as Partial<SellfluxInboundMessage>;
  if (typeof payload.messageId !== 'string' || !payload.messageId.trim()) {
    throw new Error('Mensagem SellFlux exige messageId.');
  }
  if (!isInternationalPhone(payload.recipientPhone)) {
    throw new Error('Mensagem SellFlux exige recipientPhone em formato internacional.');
  }
  if (!isInternationalPhone(payload.channelPhone)) {
    throw new Error('Mensagem SellFlux exige channelPhone em formato internacional.');
  }
  if (payload.text !== undefined && typeof payload.text !== 'string') {
    throw new Error('text deve ser uma string.');
  }
  if (payload.imageUrl !== undefined && typeof payload.imageUrl !== 'string') {
    throw new Error('imageUrl deve ser uma string.');
  }
  if (!payload.text?.trim() && !payload.imageUrl?.trim()) {
    throw new Error('Mensagem SellFlux exige text ou imageUrl.');
  }

  return {
    messageId: payload.messageId.trim(),
    recipientPhone: payload.recipientPhone,
    channelPhone: payload.channelPhone,
    text: payload.text?.trim() || undefined,
    imageUrl: payload.imageUrl?.trim() || undefined
  };
}

export function buildSellfluxMessageResponse(phone: string, text: string): SellfluxMessageResponse {
  if (!isInternationalPhone(phone)) {
    throw new Error('phone deve estar em formato internacional.');
  }
  if (!text.trim()) {
    throw new Error('Resposta SellFlux não pode ser vazia.');
  }
  return { phone, text: text.trim() };
}

function isInternationalPhone(value: unknown): value is string {
  return typeof value === 'string' && /^\+\d{10,15}$/.test(value);
}