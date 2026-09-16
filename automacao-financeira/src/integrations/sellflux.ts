export type SellfluxCampaign = {
  id: number | string;
  name?: string;
  status?: number;
  domain_type?: string;
  [key: string]: unknown;
};

export type SellfluxCampaignFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: number;
  folderId?: number;
  domainType?: string;
  isSystem?: boolean;
};

export type SellfluxListResponse<T> = {
  data?: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
  [key: string]: unknown;
};

export type WhatsAppTemplateMessage = {
  phone: string;
  templateId: number;
  data?: Record<string, unknown>;
};

export class SellfluxApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'SellfluxApiError';
  }
}

export class SellfluxClient {
  private readonly baseUrl: string;
  private readonly whatsappUrl: string;

  constructor(
    private readonly token: string,
    baseUrl = 'https://apis.sellflux.app/api/v1/flux-v2',
    whatsappUrl = 'https://apis.sellflux.app/automation/v1/whatsapp/data'
  ) {
    if (!token) {
      throw new Error('SELLFLUX_API_TOKEN nao configurado.');
    }

    this.baseUrl = baseUrl.replace(/\/$/, '');
  this.whatsappUrl = whatsappUrl;
  }

  async listCampaigns(filters: SellfluxCampaignFilters = {}): Promise<SellfluxListResponse<SellfluxCampaign>> {
    return this.get('/campaigns', {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      status: filters.status,
      folder_id: filters.folderId,
      domain_type: filters.domainType,
      is_system: filters.isSystem
    });
  }

  async sendWhatsAppTemplate(message: WhatsAppTemplateMessage): Promise<unknown> {
    if (!/^\+\d{10,15}$/.test(message.phone)) {
      throw new Error('phone deve estar no formato internacional, por exemplo +5511999999999.');
    }

    if (!Number.isInteger(message.templateId) || message.templateId < 1) {
      throw new Error('templateId deve ser um inteiro positivo.');
    }

    return this.post(this.whatsappUrl, {
      phone: message.phone,
      template_id: message.templateId,
      data: message.data ?? {}
    });
  }

  private async get<T>(path: string, parameters: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(parameters)) {
      if (value !== undefined && value !== '') {
        query.set(key, String(value));
      }
    }

    const url = `${this.baseUrl}${path}${query.size > 0 ? `?${query}` : ''}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'User-Agent': 'automacao-financeira-calandrini/0.1.0',
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new SellfluxApiError(response.status, `SellFlux respondeu ${response.status}: ${body.slice(0, 500)}`);
    }

    return response.json() as Promise<T>;
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'User-Agent': 'automacao-financeira-calandrini/0.1.0',
        Accept: 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new SellfluxApiError(response.status, `SellFlux respondeu ${response.status}: ${responseBody.slice(0, 500)}`);
    }

    const responseText = await response.text();
    return responseText ? JSON.parse(responseText) as T : {} as T;
  }
}