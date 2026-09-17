export type SellfluxWebhookLead = {
  id: number;
  name: string;
  email?: string;
  phone: string;
  tags?: string[];
};

export type SellfluxWebhookMessage = {
  id: string;
  type: 'chat' | 'image' | 'audio' | 'video' | 'document';
  body?: string;
  from_me: boolean;
  is_group: boolean;
  media_url?: string | null;
  media_mime_type?: string | null;
};

export type SellfluxWebhookPayload = {
  event: string;
  timestamp: string;
  project_id: number;
  device_id: number;
  device_name: string;
  chat_id: string;
  lead: SellfluxWebhookLead;
  message: SellfluxWebhookMessage;
};

export function parseSellfluxWebhook(data: unknown): SellfluxWebhookPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Payload inválido.');
  }

  const payload = data as Record<string, unknown>;

  if (payload.event !== 'message_received') {
    throw new Error('Evento não suportado.');
  }

  if (!payload.lead || typeof payload.lead !== 'object') {
    throw new Error('Lead não encontrado no webhook.');
  }

  const lead = payload.lead as Record<string, unknown>;
  if (!lead.phone || typeof lead.phone !== 'string') {
    throw new Error('Telefone do cliente não encontrado.');
  }

  if (!payload.message || typeof payload.message !== 'object') {
    throw new Error('Mensagem não encontrada no webhook.');
  }

  const message = payload.message as Record<string, unknown>;
  if (message.from_me === true) {
    throw new Error('Mensagem enviada pelo sistema, ignorando.');
  }

  return payload as SellfluxWebhookPayload;
}

export function extractPhoneFromWebhook(payload: SellfluxWebhookPayload): string {
  const phone = payload.lead.phone.replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(phone)) {
    throw new Error('Telefone inválido.');
  }
  return `+${phone}`;
}

export function extractIdentifierFromMessage(
  payload: SellfluxWebhookPayload
): { name?: string; cpfCnpj?: string } {
  const message = payload.message.body || '';
  const name = payload.lead.name;

  const cpfCnpjMatch = message.match(/\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{11}|\d{14}/);
  const cpfCnpj = cpfCnpjMatch ? cpfCnpjMatch[0].replace(/\D/g, '') : undefined;

  return {
    name: name || undefined,
    cpfCnpj: cpfCnpj || undefined
  };
}
