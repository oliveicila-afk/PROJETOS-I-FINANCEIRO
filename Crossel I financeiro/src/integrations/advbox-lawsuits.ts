import { AdvBoxClient } from './advbox-client.js';

export type AdvBoxLawsuit = {
  id: string;
  process_number: string;
  customer_id: string;
  customer_name: string;
  responsible: string;
  stage: string;
  type: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type LawsuitFilter = {
  responsible?: string;
  customer_id?: string;
  process_number?: string;
  created_start?: string;
  created_end?: string;
  stage?: string;
  type?: string;
  limit?: number;
  offset?: number;
};

export class AdvBoxLawsuitsService {
  constructor(private client: AdvBoxClient) {}

  async getLawsuits(filter: LawsuitFilter): Promise<AdvBoxLawsuit[]> {
    return this.client.get<AdvBoxLawsuit[]>('/lawsuits', {
      ...filter,
      limit: filter.limit || 100
    });
  }

  async getLawsuitById(id: string): Promise<AdvBoxLawsuit> {
    return this.client.get<AdvBoxLawsuit>(`/lawsuits/${id}`);
  }

  async getDemandsByPeriod(startDate: string, endDate: string): Promise<AdvBoxLawsuit[]> {
    return this.getLawsuits({
      created_start: startDate,
      created_end: endDate,
      limit: 100
    });
  }

  async getDemandsByResponsible(responsible: string, startDate?: string, endDate?: string): Promise<AdvBoxLawsuit[]> {
    return this.getLawsuits({
      responsible,
      created_start: startDate,
      created_end: endDate,
      limit: 100
    });
  }

  async getLawsuitHistory(lawsuitId: string) {
    return this.client.get(`/history/${lawsuitId}`);
  }

  async getLawsuitMovements(lawsuitId: string) {
    return this.client.get(`/movements/${lawsuitId}`);
  }

  async addMovement(lawsuitId: string, movement: Record<string, unknown>) {
    return this.client.post(`/movements`, {
      lawsuit_id: lawsuitId,
      ...movement
    });
  }

  async getLastMovements() {
    return this.client.get('/last_movements');
  }

  async createLawsuit(data: Record<string, unknown>): Promise<AdvBoxLawsuit> {
    return this.client.post<AdvBoxLawsuit>('/lawsuits', data);
  }

  async updateLawsuit(id: string, data: Record<string, unknown>): Promise<AdvBoxLawsuit> {
    return this.client.put<AdvBoxLawsuit>(`/lawsuits/${id}`, data);
  }
}
