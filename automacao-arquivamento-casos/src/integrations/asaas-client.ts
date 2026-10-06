import { AsaasConfig } from '../config.js';

export interface AsaasPayment {
  id: string;
  value: number;
  description: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

export class AsaasClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(config: AsaasConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      'access_token': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  async searchPayments(filters: {
    customerId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<AsaasPayment[]> {
    const params = new URLSearchParams();
    if (filters.customerId) params.append('customer', filters.customerId);
    if (filters.status) params.append('status', filters.status);
    params.append('limit', String(filters.limit || 100));
    params.append('offset', String(filters.offset || 0));

    const response = await fetch(
      `${this.apiUrl}/payments?${params.toString()}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Erro ao buscar pagamentos Asaas: ${response.statusText}`);
    }

    const data = await response.json() as { data: AsaasPayment[] };
    return data.data;
  }

  async searchPaymentsByDescription(description: string): Promise<AsaasPayment[]> {
    const params = new URLSearchParams();
    params.append('description', description);
    params.append('limit', '100');

    const response = await fetch(
      `${this.apiUrl}/payments?${params.toString()}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Erro ao buscar pagamentos por descrição: ${response.statusText}`);
    }

    const data = await response.json() as { data: AsaasPayment[] };
    return data.data;
  }

  /**
   * Extrai número do processo da descrição do pagamento
   * A descrição geralmente vem como: "PROCESSO #123456789"
   */
  extractProcessNumber(description: string): string | null {
    // Tenta encontrar padrão: #NNNNNNNNNN ou PROCESSO NNNNNNNNNN
    const match = description.match(/#?(\d{10,20})/);
    return match?.[1] || null;
  }

  async getPaymentDetails(paymentId: string): Promise<AsaasPayment> {
    const response = await fetch(
      `${this.apiUrl}/payments/${paymentId}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Erro ao buscar pagamento: ${response.statusText}`);
    }

    return response.json() as Promise<AsaasPayment>;
  }
}
