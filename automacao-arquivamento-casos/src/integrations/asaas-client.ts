import axios, { AxiosInstance } from 'axios';
import { config } from '../config.js';

export interface AsaasPayment {
  id: string;
  value: number;
  description: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

export interface AsaasTransfer {
  id: string;
  value: number;
  recipient: string;
  recipientCpf?: string;
  description?: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  type: 'PIX' | 'TED' | 'DOC' | 'TRANSFER';
}

export interface TransferSearchFilters {
  clientName?: string;
  processNumber?: string;
  cpf?: string;
  status?: string;
  minValue?: number;
  maxValue?: number;
  limit?: number;
  offset?: number;
}

export interface EntrySearchFilters {
  processNumber?: string;
  status?: string;
  minValue?: number;
  maxValue?: number;
  minDate?: string;
  maxDate?: string;
  limit?: number;
  offset?: number;
}

export interface AsaasEntry {
  id: string;
  value: number;
  description: string;
  status: string;
  createdAt: string;
  dueDate?: string;
  customerId?: string;
  customerName?: string;
}

export class AsaasClient {
  private client: AxiosInstance;
  private apiUrl: string;

  constructor() {
    this.apiUrl = config.asaas.apiUrl;
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'access_token': config.asaas.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Search for payments (incoming invoices/receivables)
   */
  async searchPayments(filters: {
    customerId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<AsaasPayment[]> {
    try {
      const response = await this.client.get('/payments', {
        params: {
          customer: filters.customerId,
          status: filters.status,
          limit: filters.limit || 100,
          offset: filters.offset || 0,
        },
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error searching payments in Asaas:', error);
      throw error;
    }
  }

  /**
   * Search for entries (incoming payments/receivables)
   * These are payments received in the office account
   *
   * Trigger point: detect when an entry with a process number is received
   * Used to initiate the archiving workflow
   */
  async searchEntries(filters: EntrySearchFilters): Promise<AsaasEntry[]> {
    try {
      const response = await this.client.get('/payments', {
        params: {
          status: filters.status || 'CONFIRMED',
          limit: filters.limit || 100,
          offset: filters.offset || 0,
        },
      });

      let entries = response.data.data || [];

      // Client-side filtering for fields not available in API filters
      if (filters.processNumber) {
        entries = entries.filter((e: AsaasEntry) =>
          e.description?.includes(filters.processNumber!)
        );
      }

      if (filters.minValue) {
        entries = entries.filter((e: AsaasEntry) => e.value >= filters.minValue!);
      }

      if (filters.maxValue) {
        entries = entries.filter((e: AsaasEntry) => e.value <= filters.maxValue!);
      }

      if (filters.minDate) {
        entries = entries.filter((e: AsaasEntry) =>
          new Date(e.createdAt).getTime() >= new Date(filters.minDate!).getTime()
        );
      }

      if (filters.maxDate) {
        entries = entries.filter((e: AsaasEntry) =>
          new Date(e.createdAt).getTime() <= new Date(filters.maxDate!).getTime()
        );
      }

      // Sort by most recent first
      entries.sort((a: AsaasEntry, b: AsaasEntry) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return entries;
    } catch (error) {
      console.error('Error searching entries in Asaas:', error);
      throw error;
    }
  }

  /**
   * Search for transfers (outgoing - the "repasse" to clients)
   * These are PIX/TED transfers sent to client accounts
   *
   * Used to detect when a transfer has been completed to confirm archiving can proceed
   */
  async searchTransfers(filters: TransferSearchFilters): Promise<AsaasTransfer[]> {
    try {
      // Build search query combining multiple filters
      const response = await this.client.get('/transfers', {
        params: {
          status: filters.status || 'COMPLETED',
          limit: filters.limit || 100,
          offset: filters.offset || 0,
        },
      });

      let transfers = response.data.data || [];

      // Client-side filtering for fields not available in API filters
      if (filters.clientName) {
        transfers = transfers.filter((t: AsaasTransfer) =>
          t.recipient.toLowerCase().includes(filters.clientName!.toLowerCase())
        );
      }

      if (filters.processNumber) {
        transfers = transfers.filter((t: AsaasTransfer) =>
          t.description?.includes(filters.processNumber!)
        );
      }

      if (filters.cpf) {
        const cpfToFind = filters.cpf;
        transfers = transfers.filter((t: AsaasTransfer) =>
          t.recipientCpf === cpfToFind ||
          (t.description?.includes(cpfToFind) ?? false)
        );
      }

      if (filters.minValue) {
        transfers = transfers.filter((t: AsaasTransfer) => t.value >= filters.minValue!);
      }

      if (filters.maxValue) {
        transfers = transfers.filter((t: AsaasTransfer) => t.value <= filters.maxValue!);
      }

      // Sort by most recent first
      transfers.sort((a: AsaasTransfer, b: AsaasTransfer) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return transfers;
    } catch (error) {
      console.error('Error searching transfers in Asaas:', error);
      throw error;
    }
  }

  async searchPaymentsByDescription(description: string): Promise<AsaasPayment[]> {
    try {
      const response = await this.client.get('/payments', {
        params: {
          description,
          limit: 100,
        },
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error searching payments by description:', error);
      throw error;
    }
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
    try {
      const response = await this.client.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching payment details for ${paymentId}:`, error);
      throw error;
    }
  }

  async getTransferDetails(transferId: string): Promise<AsaasTransfer> {
    try {
      const response = await this.client.get(`/transfers/${transferId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching transfer details for ${transferId}:`, error);
      throw error;
    }
  }
}

export default AsaasClient;
