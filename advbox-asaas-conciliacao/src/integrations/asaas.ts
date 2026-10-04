export type AsaasCustomer = { id: string; name: string; cpfCnpj?: string; externalReference?: string };
export type AsaasPayment = { id: string; customer: string; value: number; status: string; dueDate: string; paymentDate?: string; billingType?: string };
export type CustomerFilters = { name?: string; cpfCnpj?: string; externalReference?: string; offset?: number; limit?: number };
export type PaymentFilters = { customer?: string; billingType?: string; status?: string; offset?: number; limit?: number };

export class AsaasApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = 'AsaasApiError'; }
}

export class AsaasClient {
  private readonly baseUrl: string;

  constructor(private readonly accessToken: string, baseUrl = 'https://api.asaas.com/v3') {
    if (!accessToken) throw new Error('ASAAS_API_TOKEN nao configurado.');
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  listCustomers(filters: CustomerFilters = {}): Promise<{ data: AsaasCustomer[] }> { return this.get('/customers', filters); }
  listPayments(filters: PaymentFilters = {}): Promise<{ data: AsaasPayment[] }> { return this.get('/payments', filters); }

  private async get<T>(path: string, parameters: Record<string, string | number | undefined>): Promise<T> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(parameters)) if (value !== undefined && value !== '') query.set(key, String(value));
    const response = await fetch(`${this.baseUrl}${path}${query.size ? `?${query}` : ''}`, { headers: { access_token: this.accessToken, Accept: 'application/json' } });
    if (!response.ok) throw new AsaasApiError(response.status, `Asaas respondeu ${response.status}.`);
    return response.json() as Promise<T>;
  }
}