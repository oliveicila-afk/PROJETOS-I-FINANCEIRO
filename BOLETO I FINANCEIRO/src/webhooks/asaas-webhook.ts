export type AsaasPaymentEvent = {
  id: string;
  event: string;
  dateCreated?: string;
  payment?: { id?: string; customer?: string; status?: string; [key: string]: unknown };
};

export class AsaasEventStore {
  private readonly eventIds = new Set<string>();
  reserve(eventId: string): boolean {
    if (this.eventIds.has(eventId)) return false;
    this.eventIds.add(eventId);
    return true;
  }
}

export function parseAsaasPaymentEvent(value: unknown): AsaasPaymentEvent {
  if (!value || typeof value !== 'object') throw new Error('Payload do webhook deve ser um objeto JSON.');
  const payload = value as Partial<AsaasPaymentEvent>;
  if (typeof payload.id !== 'string' || !payload.id || typeof payload.event !== 'string' || !payload.event) {
    throw new Error('Webhook Asaas exige id e event.');
  }
  return payload as AsaasPaymentEvent;
}
