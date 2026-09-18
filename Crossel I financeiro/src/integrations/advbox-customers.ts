import { AdvBoxClient } from './advbox-client.js';

export type AdvBoxCustomer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  cnpj?: string;
  birthdate?: string;
  created_at: string;
  updated_at: string;
};

export type CustomerFilter = {
  name?: string;
  email?: string;
  cpf?: string;
  cnpj?: string;
  limit?: number;
  offset?: number;
};

export class AdvBoxCustomersService {
  constructor(private client: AdvBoxClient) {}

  async getCustomers(filter: CustomerFilter): Promise<AdvBoxCustomer[]> {
    return this.client.get<AdvBoxCustomer[]>('/customers', {
      ...filter,
      limit: filter.limit || 100
    });
  }

  async getCustomerById(id: string): Promise<AdvBoxCustomer> {
    return this.client.get<AdvBoxCustomer>(`/customers/${id}`);
  }

  async searchByName(name: string): Promise<AdvBoxCustomer[]> {
    return this.getCustomers({
      name,
      limit: 100
    });
  }

  async searchByEmail(email: string): Promise<AdvBoxCustomer[]> {
    return this.getCustomers({
      email,
      limit: 100
    });
  }

  async searchByCPF(cpf: string): Promise<AdvBoxCustomer[]> {
    return this.getCustomers({
      cpf,
      limit: 100
    });
  }

  async searchByCNPJ(cnpj: string): Promise<AdvBoxCustomer[]> {
    return this.getCustomers({
      cnpj,
      limit: 100
    });
  }

  async getBirthdays(month?: number): Promise<AdvBoxCustomer[]> {
    const params: Record<string, string | number | boolean> = { limit: 100 };
    if (month) {
      params.month = month;
    }
    return this.client.get<AdvBoxCustomer[]>('/customers/birthdays', params);
  }

  async createCustomer(data: Record<string, unknown>): Promise<AdvBoxCustomer> {
    return this.client.post<AdvBoxCustomer>('/customers', data);
  }
}
