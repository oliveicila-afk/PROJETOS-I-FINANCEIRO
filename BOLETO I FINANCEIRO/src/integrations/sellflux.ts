export type WhatsAppTemplateMessage = {
  phone: string;
  templateId: number;
  data?: Record<string, unknown>;
};

export type WhatsAppTextMessage = {
  phone: string;
  message: string;
};

export class SellfluxApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'SellfluxApiError';
  }
}

export class SellfluxClient {
  private readonly whatsappUrl: string;
  private readonly sendTextUrl: string;

  constructor(
    private readonly token: string,
    whatsappUrl = 'https://apis.sellflux.app/automation/v1/whatsapp/phone',
    sendTextUrl = 'https://api.sellflux.com/api/v1/message/send-text'
  ) {
    if (!token) throw new Error('SELLFLUX_API_TOKEN nao configurado.');
    this.whatsappUrl = whatsappUrl;
    this.sendTextUrl = sendTextUrl;
  }

  async sendWhatsAppTemplate(message: WhatsAppTemplateMessage): Promise<unknown> {
    if (!/^\+\d{10,15}$/.test(message.phone)) {
      throw new Error('phone deve estar no formato internacional, por exemplo +5511999999999.');
    }
    if (!Number.isInteger(message.templateId) || message.templateId < 1) {
      throw new Error('templateId deve ser um inteiro positivo.');
    }

    const response = await fetch(this.whatsappUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ phone: message.phone, template_id: message.templateId, data: message.data ?? {} })
    });
    if (!response.ok) {
      const body = await response.text();
      throw new SellfluxApiError(response.status, `SellFlux respondeu ${response.status}: ${body.slice(0, 500)}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  async sendWhatsAppText(message: WhatsAppTextMessage): Promise<unknown> {
    if (!/^\+\d{10,15}$/.test(message.phone)) {
      throw new Error('phone deve estar no formato internacional, por exemplo +5511999999999.');
    }
    if (!message.message || message.message.trim().length === 0) {
      throw new Error('Mensagem não pode estar vazia.');
    }

    const response = await fetch(this.sendTextUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ phone: message.phone, message: message.message })
    });
    if (!response.ok) {
      const body = await response.text();
      throw new SellfluxApiError(response.status, `SellFlux respondeu ${response.status}: ${body.slice(0, 500)}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }
}
