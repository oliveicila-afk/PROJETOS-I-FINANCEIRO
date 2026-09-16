export type AsaasCustomer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  externalReference?: string;
};

export type AsaasPayment = {
  id: string;
  customer: string;
  value: number;
  netValue?: number;
  status: string;
  dueDate: string;
  paymentDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  billingType?: string;
  description?: string;
};

type AsaasListResponse<T> = {
  data: T[];
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
};

export type CustomerFilters = {
  name?: string;
  email?: string;
  cpfCnpj?: string;
  externalReference?: string;
  offset?: number;
  limit?: number;
};

export type PaymentFilters = {
  customer?: string;
  billingType?: string;
  status?: string;
  dueDateGe?: string;
  dueDateLe?: string;
  offset?: number;
  limit?: number;
};

export class AsaasApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'AsaasApiError';
  }
}

export class AsaasClient {
  private readonly baseUrl: string;

  constructor(private readonly accessToken: string, baseUrl = 'https://api.asaas.com/v3') {
    if (!accessToken) throw new Error('ASAAS_API_TOKEN nao configurado.');
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async listCustomers(filters: CustomerFilters = {}): Promise<AsaasListResponse<AsaasCustomer>> {
    return this.get('/customers', {
      name: filters.name,
      email: filters.email,
      cpfCnpj: filters.cpfCnpj,
      externalReference: filters.externalReference,
      offset: filters.offset,
      limit: filters.limit
    });
  }

  async listPayments(filters: PaymentFilters = {}): Promise<AsaasListResponse<AsaasPayment>> {
    return this.get('/payments', {
      customer: filters.customer,
      billingType: filters.billingType,
      status: filters.status,
      'dueDate[ge]': filters.dueDateGe,
      'dueDate[le]': filters.dueDateLe,
      offset: filters.offset,
      limit: filters.limit
    });
  }

  async getPayment(paymentId: string): Promise<AsaasPayment> {
    return this.get(`/payments/${encodeURIComponent(paymentId)}`);
  }

  private async get<T>(path: string, parameters: Record<string, string | number | undefined> = {}): Promise<T> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(parameters)) {
      if (value !== undefined && value !== '') query.set(key, String(value));
    }

    const url = `${this.baseUrl}${path}${query.size > 0 ? `?${query}` : ''}`;
    const response = await fetch(url, {
      headers: {
        access_token: this.accessToken,
        'User-Agent': 'boleto-i-financeiro/0.1.0',
        Accept: 'application/json'
      }
    });
    if (!response.ok) {
      const body = await response.text();
      throw new AsaasApiError(response.status, `Asaas respondeu ${response.status}: ${body.slice(0, 500)}`);
    }
    return response.json() as Promise<T>;
  }
}
